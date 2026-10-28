// Contrato com a API REST do Gemini (generateContent), com fetch simulado.
// Os formatos de requisição seguem a documentação oficial; o teste com credencial real fica em tests/integration.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { generateText, redact, GeminiError, GEMINI_BASE } = createRequire(import.meta.url)('../../.test-build/lib/gemini.js')

const KEY = 'AQ.Ab8RN6K' + 'S3cr3t'.repeat(8)
const IMG = { data: 'QUJD', mime: 'image/png' }

const ok = text => ({ ok: true, status: 200, text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }) })
const err = (status, body = {}) => ({ ok: false, status, text: async () => JSON.stringify(body) })

function recorder(responses) {
  const calls = []
  let i = 0
  const impl = async (url, init) => {
    calls.push({ url: String(url), init })
    const r = responses[Math.min(i++, responses.length - 1)]
    if (r instanceof Error) throw r
    return r
  }
  return { calls, impl }
}

const run = (responses, extra = {}) => {
  const rec = recorder(responses)
  return { rec, promise: generateText({ apiKey: KEY, prompt: 'analise', image: IMG, fetchImpl: rec.impl, ...extra }) }
}

test('envia a chave só no cabeçalho x-goog-api-key, exatamente como recebida', async () => {
  const { rec, promise } = run([ok('{"a":1}')])
  const out = await promise
  assert.equal(out.text, '{"a":1}')
  const { url, init } = rec.calls[0]
  assert.equal(init.headers['x-goog-api-key'], KEY)
  assert.ok(!url.includes(KEY) && !url.includes('key='), 'a chave não pode ir na URL')
  assert.ok(!init.body.includes(KEY), 'a chave não pode ir no corpo')
  assert.ok(!('Authorization' in init.headers), 'sem Authorization/Bearer: não se converte a chave em token')
})

test('usa o endpoint generateContent documentado e envia a imagem real antes do texto', async () => {
  const { rec, promise } = run([ok('x')])
  await promise
  const { url, init } = rec.calls[0]
  assert.match(url, new RegExp('^' + GEMINI_BASE.replace(/[.]/g, '\\.') + '/models/gemini-3\\.8-flash:generateContent$'))
  assert.equal(init.method, 'POST')
  const body = JSON.parse(init.body)
  assert.deepEqual(body.contents[0].parts[0], { inline_data: { mime_type: 'image/png', data: 'QUJD' } })
  assert.deepEqual(body.contents[0].parts[1], { text: 'analise' })
})

test('ignora partes de raciocínio (thought) e junta o texto final', async () => {
  const body = { candidates: [{ content: { parts: [{ text: 'pensando', thought: true }, { text: 'A' }, { text: 'B' }] } }] }
  const { promise } = run([{ ok: true, status: 200, text: async () => JSON.stringify(body) }])
  assert.equal((await promise).text, 'AB')
})

test('modelo indisponível (404): tenta o próximo modelo e só então responde', async () => {
  const { rec, promise } = run([err(404, { error: { message: 'not found' } }), err(404), ok('{"ok":true}')])
  const out = await promise
  assert.equal(out.text, '{"ok":true}')
  assert.deepEqual(rec.calls.map(c => c.url.match(/models\/([^:]+):/)[1]), ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'])
})

test('todos os modelos indisponíveis: erro claro, sem análise inventada', async () => {
  const { promise } = run([err(404)])
  await assert.rejects(promise, e => e instanceof GeminiError && e.status === 503 && /Nenhum modelo/.test(e.message))
})

test('chave inválida (400 API_KEY_INVALID): 401 imediato, sem tentar outros modelos', async () => {
  const { rec, promise } = run([err(400, { error: { code: 400, message: 'API key not valid.', status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] } })])
  await assert.rejects(promise, e => e.status === 401 && /não reconheceu esta chave/.test(e.message))
  assert.equal(rec.calls.length, 1)
})

test('chave padrão sem restrição: mensagem orienta o que fazer', async () => {
  const { promise } = run([err(403, { error: { message: 'Requests from unrestricted API keys are rejected.', status: 'PERMISSION_DENIED' } })])
  await assert.rejects(promise, e => e.status === 401 && /sem restrição/.test(e.message))
})

test('403 genérico: tenta os outros modelos antes de culpar a chave', async () => {
  const { rec, promise } = run([err(403, { error: { message: 'denied', status: 'PERMISSION_DENIED' } })])
  await assert.rejects(promise, e => e.status === 401)
  assert.equal(rec.calls.length, 3)
})

test('limite de uso (429) vira mensagem de cota', async () => {
  const { promise } = run([err(429, { error: { message: 'quota', status: 'RESOURCE_EXHAUSTED' } })])
  await assert.rejects(promise, e => e.status === 429 && /Limite de uso/.test(e.message))
})

test('imagem recusada (400): repassa o motivo sem expor a chave', async () => {
  const { promise } = run([err(400, { error: { message: `Unable to process input image. key=${KEY}`, status: 'INVALID_ARGUMENT' } })])
  await assert.rejects(promise, e => {
    assert.equal(e.status, 400)
    assert.ok(!e.message.includes(KEY), 'a chave não pode aparecer na mensagem de erro')
    return /Unable to process/.test(e.message)
  })
})

test('bloqueio de segurança: informa o motivo e não devolve análise', async () => {
  const body = { promptFeedback: { blockReason: 'SAFETY' } }
  const { promise } = run([{ ok: true, status: 200, text: async () => JSON.stringify(body) }])
  await assert.rejects(promise, e => e.status === 422 && /SAFETY/.test(e.message))
})

test('resposta sem texto não vira análise fictícia', async () => {
  const body = { candidates: [{ content: { parts: [] }, finishReason: 'MAX_TOKENS' }] }
  const { promise } = run([{ ok: true, status: 200, text: async () => JSON.stringify(body) }])
  await assert.rejects(promise, e => e instanceof GeminiError && /não devolveu texto/.test(e.message))
})

test('falha de rede vira erro claro, com o código técnico e sem a chave', async () => {
  const boom = Object.assign(new TypeError(`fetch failed ${KEY}`), { cause: { code: 'ENOTFOUND' } })
  const { promise } = run([boom])
  await assert.rejects(promise, e => e.status === 504 && /Falha de conexão/.test(e.message) && /ENOTFOUND/.test(e.message) && !e.message.includes(KEY))
})

test('tempo esgotado é dito como tempo esgotado, não como "rede"', async () => {
  const t = Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' })
  const { promise } = run([t])
  await assert.rejects(promise, e => e.status === 504 && /demorou mais de \d+ s/.test(e.message))
})

test('tempo esgotado no primeiro modelo: tenta o próximo, mais leve', async () => {
  const t = Object.assign(new Error('timeout'), { name: 'TimeoutError' })
  const { rec, promise } = run([t, ok('{"ok":1}')])
  assert.equal((await promise).text, '{"ok":1}')
  assert.equal(rec.calls.length, 2)
  assert.match(rec.calls[1].url, /gemini-3\.5-flash-lite/)
})

test('sem orçamento de tempo, não inicia outra tentativa', async () => {
  const t = Object.assign(new Error('timeout'), { name: 'TimeoutError' })
  const { rec, promise } = run([t], { deadline: Date.now() + 2_000 })
  await assert.rejects(promise, e => e.status === 504)
  assert.equal(rec.calls.length, 1)
})

test('modelos Gemini 3: raciocínio em nível baixo (thinkingLevel documentado)', async () => {
  const { rec, promise } = run([ok('x')])
  await promise
  const body = JSON.parse(rec.calls[0].init.body)
  assert.deepEqual(body.generationConfig, { thinkingConfig: { thinkingLevel: 'low' } })
})

test('modelo 2.5 não recebe thinkingLevel (parâmetro é só do Gemini 3)', async () => {
  const { rec, promise } = run([err(404), err(404), ok('x')])
  await promise
  const bodies = rec.calls.map(c => JSON.parse(c.init.body))
  assert.ok(bodies[0].generationConfig && bodies[1].generationConfig)
  assert.equal(bodies[2].generationConfig, undefined)
  assert.match(rec.calls[2].url, /gemini-2\.5-flash/)
})

test('redact remove a chave e qualquer coisa parecida com chave', () => {
  const txt = `falhou com ${KEY}; outra AIza${'z'.repeat(30)} e Bearer abc.def`
  const out = redact(txt, KEY)
  assert.ok(!out.includes(KEY) && !out.includes('AIzazzz') && !out.includes('abc.def'))
})
