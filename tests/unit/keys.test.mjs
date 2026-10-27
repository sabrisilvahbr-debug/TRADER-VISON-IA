// Validação local do campo de chave. Não chama nenhuma API e não presume que o Google aceite cada formato:
// só garante que o app não barra uma chave por causa do prefixo.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { checkKey, cleanKey } = createRequire(import.meta.url)('../../.test-build/lib/providers.js')

const NEW_FORMAT = 'AQ.Ab8RN6K' + 'x'.repeat(40) + '_-.9'
const OLD_FORMAT = 'AIza' + 'Sy' + 'x'.repeat(33)

test('aceita chave no formato novo (AQ.) sem exigir prefixo', () => {
  assert.equal(checkKey('gemini', NEW_FORMAT).ok, true)
})

test('aceita chave no formato antigo (AIza) para não quebrar quem já a usa', () => {
  assert.equal(checkKey('gemini', OLD_FORMAT).ok, true)
})

test('não vincula a validade ao prefixo: qualquer chave bem formada passa na checagem local', () => {
  assert.equal(checkKey('gemini', 'ZZ-' + 'a'.repeat(30)).ok, true)
})

test('remove só espaços e quebras de linha nas pontas e não altera o resto', () => {
  assert.equal(cleanKey(`  \n${NEW_FORMAT}\t `), NEW_FORMAT)
  assert.equal(checkKey('gemini', `  ${NEW_FORMAT}  \n`).ok, true)
})

test('barra o que não pode ser chave em cabeçalho HTTP, com mensagem clara', () => {
  for (const [raw, motivo] of [
    ['', /Cole a chave/],
    ['   ', /Cole a chave/],
    ['AQ.abc def' + 'x'.repeat(20), /espaços/],
    ['"' + NEW_FORMAT + '"', /aspas/],
    ["'" + NEW_FORMAT + "'", /aspas/],
    ['AQ.abc\nxyz' + 'x'.repeat(20), /espaços/],
    ['AQ.chávé' + 'x'.repeat(20), /inválidos/],
    ['AQ.1', /curta/],
    ['A'.repeat(600), /longa/],
  ]) {
    const r = checkKey('gemini', raw)
    assert.equal(r.ok, false, `deveria barrar: ${JSON.stringify(raw).slice(0, 30)}`)
    assert.match(r.reason, motivo)
  }
})

test('OpenAI e OpenRouter continuam com o formato próprio', () => {
  assert.equal(checkKey('openai', 'sk-' + 'a'.repeat(40)).ok, true)
  assert.equal(checkKey('openai', 'sk-or-' + 'a'.repeat(40)).ok, false)
  assert.equal(checkKey('openrouter', 'sk-or-' + 'a'.repeat(40)).ok, true)
  assert.equal(checkKey('openrouter', 'AQ.' + 'a'.repeat(40)).ok, false)
})
