// Rota /api/analyze de ponta a ponta com o Google simulado.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const handler = createRequire(import.meta.url)('../../.test-build/pages/api/analyze.js').default

const KEY = 'AQ.Ab8RN6K' + 'S3cr3t'.repeat(8)
const PNG = fs.readFileSync(new URL('../fixtures/grafico-teste.png', import.meta.url)).toString('base64')
const GOOD = {
  tendencia: 'Alta', legibilidade: 'boa', suporte: '1.0850', resistencia: '1.1000', padrao: 'Canal de alta',
  entrada: '1.0900', stop: '1.0850', take_profit: '1.1000', confianca: 120, decisao: 'ENTRAR',
  explicacao: 'ok', riscos: 'rompimento do suporte', ativo: 'EURUSD', timeframe: '1H',
  niveis_y: { entrada: 0.4, stop: 0.6, take_profit: 0.2, suporte: 9 },
}
const gOk = obj => ({ ok: true, status: 200, text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] } }] }) })
const gErr = (status, body = {}) => ({ ok: false, status, text: async () => JSON.stringify(body) })

let n = 0
async function call({ responses, key = KEY, image = PNG, mime = 'image/png', headers = {} }) {
  const seen = []
  let i = 0
  global.fetch = async (url, init) => { seen.push({ url: String(url), init }); return responses[Math.min(i++, responses.length - 1)] }
  const logs = []
  const origErr = console.error
  console.error = (...a) => logs.push(a.join(' '))
  const out = {}
  const res = { status(c) { out.code = c; return this }, json(b) { out.body = b; return this } }
  const req = {
    method: 'POST', socket: {},
    headers: { 'x-provider': 'gemini', ...(key ? { 'x-user-api-key': key } : {}), 'x-forwarded-for': `t${n++}`, ...headers },
    body: { imageData: image, mimeType: mime, contexto: { ativo: 'EURUSD', timeframe: '1h', perfil: 'moderado' } },
  }
  try { await handler(req, res) } finally { console.error = origErr }
  return { ...out, seen, logs }
}

test('chave AQ. + imagem real: analisa e devolve resultado normalizado', async () => {
  const r = await call({ responses: [gOk(GOOD)] })
  assert.equal(r.code, 200)
  assert.equal(r.body.result.decisao, 'ENTRAR')
  assert.equal(r.body.result.confianca, 95)           // limitado a 95
  assert.deepEqual(r.body.result.niveis_y, { entrada: 0.4, stop: 0.6, take_profit: 0.2 }) // y inválido descartado
  const sent = JSON.parse(r.seen[0].init.body)
  assert.equal(sent.contents[0].parts[0].inline_data.data, PNG, 'a imagem real é enviada ao modelo')
  assert.equal(r.seen[0].init.headers['x-goog-api-key'], KEY)
})

test('chave com espaços nas pontas é aceita e enviada sem os espaços', async () => {
  const r = await call({ responses: [gOk(GOOD)], key: `  ${KEY}\n` })
  assert.equal(r.code, 200)
  assert.equal(r.seen[0].init.headers['x-goog-api-key'], KEY)
})

test('chave antiga (AIza) continua sendo enviada sem alteração', async () => {
  const old = 'AIza' + 'Sy' + 'x'.repeat(33)
  const r = await call({ responses: [gOk(GOOD)], key: old })
  assert.equal(r.code, 200)
  assert.equal(r.seen[0].init.headers['x-goog-api-key'], old)
})

test('credencial recusada pelo Google: erro claro, nenhuma análise, chave fora do log', async () => {
  const r = await call({ responses: [gErr(400, { error: { message: `API key not valid ${KEY}`, details: [{ reason: 'API_KEY_INVALID' }] } })] })
  assert.equal(r.code, 401)
  assert.equal(r.body.result, undefined, 'nunca devolve análise quando a API falha')
  assert.ok(!JSON.stringify(r.body).includes(KEY))
  assert.ok(!r.logs.join(' ').includes(KEY))
})

test('cota esgotada: 429 e sem análise', async () => {
  const r = await call({ responses: [gErr(429, { error: { status: 'RESOURCE_EXHAUSTED' } })] })
  assert.equal(r.code, 429)
  assert.equal(r.body.result, undefined)
})

test('modelos indisponíveis: 503 e sem análise', async () => {
  const r = await call({ responses: [gErr(404)] })
  assert.equal(r.code, 503)
  assert.equal(r.body.result, undefined)
})

test('modelo devolve prosa em vez de JSON duas vezes: erro, não análise inventada', async () => {
  const r = await call({ responses: [gOk('Não consigo analisar.'), gOk('Desculpe.')] })
  assert.equal(r.code, 502)
  assert.equal(r.body.result, undefined)
})

test('modelo erra o formato uma vez e acerta na segunda tentativa', async () => {
  const r = await call({ responses: [gOk('texto solto'), gOk('```json\n' + JSON.stringify(GOOD) + '\n```')] })
  assert.equal(r.code, 200)
})

test('arquivo que não é imagem é barrado antes de chamar o Google', async () => {
  const fake = Buffer.from('isto nao e uma imagem de verdade, so texto').toString('base64')
  const r = await call({ responses: [gOk(GOOD)], image: fake, mime: 'image/png' })
  assert.equal(r.code, 400)
  assert.equal(r.seen.length, 0)
})

test('chave mal formatada é barrada sem chamar a API', async () => {
  const r = await call({ responses: [gOk(GOOD)], key: 'AQ.com espaco no meio' + 'x'.repeat(20) })
  assert.equal(r.code, 401)
  assert.equal(r.seen.length, 0)
})

test('sem chave: pede a chave e não chama a API', async () => {
  const saved = process.env.GOOGLE_GEMINI_API_KEY
  delete process.env.GOOGLE_GEMINI_API_KEY
  const r = await call({ responses: [gOk(GOOD)], key: '' })
  if (saved) process.env.GOOGLE_GEMINI_API_KEY = saved
  assert.equal(r.code, 401)
  assert.equal(r.seen.length, 0)
})

// ---------- Z.ai (GLM-5.3-Flash) ----------
const ZKEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4.AbCdEfGh12345678'
const zOk = obj => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { role: 'assistant', content: typeof obj === 'string' ? obj : JSON.stringify(obj), reasoning_content: 'pensando...' } }] }) })
const zErr = (status, body = {}) => ({ ok: false, status, text: async () => JSON.stringify(body) })
const zai = (opts = {}) => call({ ...opts, key: opts.key === undefined ? ZKEY : opts.key, headers: { 'x-provider': 'zai', ...(opts.headers || {}) } })

test('Z.ai: endpoint, Bearer, modelo glm-5.3-flash e imagem real em image_url', async () => {
  const r = await zai({ responses: [zOk(GOOD)] })
  assert.equal(r.code, 200)
  assert.equal(r.body.result.decisao, 'ENTRAR')
  const { url, init } = r.seen[0]
  assert.equal(url, 'https://api.z.ai/api/paas/v4/chat/completions')
  assert.equal(init.headers.Authorization, `Bearer ${ZKEY}`)
  const body = JSON.parse(init.body)
  assert.equal(body.model, 'glm-5.3-flash')
  assert.equal(body.reasoning_effort, 'low')
  assert.equal(body.response_format, undefined, 'json_object é só de modelos de texto na Z.ai')
  const img = body.messages[0].content.find(p => p.type === 'image_url')
  assert.equal(img.image_url.url, `data:image/png;base64,${PNG}`)
  assert.ok(!url.includes(ZKEY) && !init.body.includes(ZKEY))
})

test('Z.ai: usa ZAI_API_KEY do servidor quando o usuário não colou chave', async () => {
  process.env.ZAI_API_KEY = ZKEY
  try {
    const r = await zai({ responses: [zOk(GOOD)], key: '' })
    assert.equal(r.code, 200)
    assert.equal(r.seen[0].init.headers.Authorization, `Bearer ${ZKEY}`)
    assert.ok(!JSON.stringify(r.body).includes(ZKEY), 'a chave do servidor nunca volta ao navegador')
  } finally { delete process.env.ZAI_API_KEY }
})

test('Z.ai: a chave do usuário tem prioridade sobre a do servidor', async () => {
  process.env.ZAI_API_KEY = 'chave-do-servidor-1234567890'
  try {
    const r = await zai({ responses: [zOk(GOOD)] })
    assert.equal(r.seen[0].init.headers.Authorization, `Bearer ${ZKEY}`)
  } finally { delete process.env.ZAI_API_KEY }
})

test('Z.ai: sem chave nenhuma, pede a chave e não chama a API', async () => {
  delete process.env.ZAI_API_KEY
  const r = await zai({ responses: [zOk(GOOD)], key: '' })
  assert.equal(r.code, 401)
  assert.equal(r.seen.length, 0)
})

test('Z.ai: chave recusada (401), sem saldo e limite viram mensagens próprias, sem análise', async () => {
  let r = await zai({ responses: [zErr(401, { error: { code: '1000', message: 'Authentication failed' } })] })
  assert.equal(r.code, 401); assert.equal(r.body.result, undefined)
  r = await zai({ responses: [zErr(429, { error: { code: '1113', message: 'Insufficient balance or no resource package' } })] })
  assert.equal(r.code, 402); assert.match(r.body.error, /Sem saldo/)
  r = await zai({ responses: [zErr(429, { error: { code: '1305', message: 'rate limit' } })] })
  assert.equal(r.code, 429); assert.equal(r.body.result, undefined)
})

test('Z.ai: lê o JSON ignorando o raciocínio e repete se a resposta vier fora do formato', async () => {
  const r = await zai({ responses: [zOk('Vou pensar...'), zOk('<think>hm {x}</think>' + JSON.stringify(GOOD))] })
  assert.equal(r.code, 200)
  assert.equal(r.seen.length, 2)
})

test('Z.ai: rejeita WEBP (a Z.ai documenta só JPG/PNG) sem chamar a API', async () => {
  const r = await zai({ responses: [zOk(GOOD)], mime: 'image/webp' })
  assert.equal(r.code, 400)
  assert.equal(r.seen.length, 0)
})

test('Z.ai: tempo esgotado é informado como tal e nunca vira análise', async () => {
  const t = Object.assign(new Error('timeout'), { name: 'TimeoutError' })
  const seen = []
  global.fetch = async () => { seen.push(1); throw t }
  const out = {}
  const res = { status(c) { out.code = c; return this }, json(b) { out.body = b; return this } }
  await handler({ method: 'POST', socket: {}, headers: { 'x-provider': 'zai', 'x-user-api-key': ZKEY, 'x-forwarded-for': `z${n++}` }, body: { imageData: PNG, mimeType: 'image/png', contexto: {} } }, res)
  assert.equal(out.code, 504)
  assert.match(out.body.error, /demorou mais de \d+ s/)
  assert.equal(out.body.result, undefined)
})
