// Teste ponta a ponta com credencial REAL do Google. Rode com:  GEMINI_API_KEY=... npm run test:e2e
// Opcional: TEST_CHART_IMAGE=/caminho/para/print-real.png para usar um screenshot seu em vez do gráfico de teste.
// Falha de propósito se a chave não existir: um teste ignorado não prova nada.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const handler = createRequire(import.meta.url)('../../.test-build/pages/api/analyze.js').default

const KEY = (process.env.GEMINI_API_KEY || '').trim()
const chartPath = process.env.TEST_CHART_IMAGE || new URL('../fixtures/grafico-teste.png', import.meta.url)
const toB64 = p => fs.readFileSync(p).toString('base64')
const mimeOf = p => (String(p).toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg')

let n = 0
async function analyze({ key, image, mime }) {
  const out = {}
  const res = { status(c) { out.code = c; return this }, json(b) { out.body = b; return this } }
  await handler({
    method: 'POST', socket: {},
    headers: { 'x-provider': 'gemini', 'x-user-api-key': key, 'x-forwarded-for': `e2e-${Date.now()}-${n++}` },
    body: { imageData: image, mimeType: mime, contexto: { ativo: '', timeframe: '1h', perfil: 'moderado' } },
  }, res)
  return out
}

test('a credencial foi fornecida', () => {
  assert.ok(KEY, 'GEMINI_API_KEY ausente: defina a variável (ou o secret GEMINI_API_KEY no GitHub) para rodar este teste.')
  console.log(`# formato da chave: ${KEY.startsWith('AQ.') ? 'AQ. (auth key)' : KEY.startsWith('AIza') ? 'AIza (padrão)' : 'outro'}, ${KEY.length} caracteres`)
})

test('autenticação real + imagem real: o Google responde e a análise é válida', { timeout: 150_000 }, async () => {
  const r = await analyze({ key: KEY, image: toB64(chartPath), mime: mimeOf(chartPath) })
  assert.equal(r.code, 200, `esperava 200, veio ${r.code}: ${JSON.stringify(r.body)}`)
  const a = r.body.result
  assert.ok(['Alta', 'Baixa', 'Lateral'].includes(a.tendencia), `tendência inválida: ${a.tendencia}`)
  assert.ok(['ENTRAR', 'ESPERAR', 'EVITAR'].includes(a.decisao), `decisão inválida: ${a.decisao}`)
  assert.ok(Number.isInteger(a.confianca) && a.confianca >= 0 && a.confianca <= 95)
  for (const f of ['suporte', 'resistencia', 'padrao', 'entrada', 'stop', 'take_profit', 'explicacao', 'riscos', 'ativo', 'timeframe']) {
    assert.equal(typeof a[f], 'string', `campo ${f} ausente`)
    assert.ok(a[f].length > 0, `campo ${f} vazio`)
  }
  assert.ok(a.explicacao.length > 20 && a.explicacao !== '—', 'a justificativa deve ter conteúdo')
  for (const v of Object.values(a.niveis_y)) assert.ok(v >= 0 && v <= 1)
  console.log(`# resposta: ${a.decisao} · ${a.tendencia} · ${a.confianca}% · ativo=${a.ativo} · tf=${a.timeframe}`)
  console.log(`# suporte=${a.suporte} resistência=${a.resistencia} entrada=${a.entrada} stop=${a.stop} alvo=${a.take_profit}`)
})

test('credencial inválida é recusada de verdade pelo Google, sem análise', { timeout: 60_000 }, async () => {
  const fake = 'AQ.' + 'Zz9'.repeat(20)
  const r = await analyze({ key: fake, image: toB64(chartPath), mime: mimeOf(chartPath) })
  assert.equal(r.code, 401, `esperava 401, veio ${r.code}: ${JSON.stringify(r.body)}`)
  assert.equal(r.body.result, undefined)
  assert.ok(!JSON.stringify(r.body).includes(fake))
})

test('imagem ilegível não gera sinal de entrada', { timeout: 150_000 }, async () => {
  const p = new URL('../fixtures/ilegivel.png', import.meta.url)
  const r = await analyze({ key: KEY, image: toB64(p), mime: 'image/png' })
  assert.equal(r.code, 200, `esperava 200, veio ${r.code}: ${JSON.stringify(r.body)}`)
  assert.notEqual(r.body.result.decisao, 'ENTRAR', 'imagem ilegível não pode virar sinal')
  console.log(`# imagem ilegível → ${r.body.result.decisao}`)
})
