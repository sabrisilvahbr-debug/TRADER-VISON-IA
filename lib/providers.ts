export type ProviderId = 'gemini' | 'zai' | 'openai' | 'openrouter'

export interface ProviderInfo {
  id: ProviderId
  label: string
  cost: string
  keyUrl: string
  keyHint: string
  /** Texto de ajuda extra mostrado abaixo do campo da chave. */
  keyNote?: string
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    cost: 'Grátis, sem cartão',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyHint: 'Cole a chave do AI Studio',
    keyNote:
      'Cole a chave exatamente como o AI Studio a gerou. As chaves novas costumam começar com AQ. e as antigas com AIza. ' +
      'Chaves antigas sem restrição podem ser recusadas pelo Google: nesse caso, gere uma nova.',
  },
  {
    id: 'zai',
    label: 'Z.ai GLM-5.3-Flash',
    cost: 'Pago por uso',
    keyUrl: 'https://z.ai/manage-apikey/apikey-list',
    keyHint: 'Cole a chave da Z.ai',
    keyNote: 'Modelo GLM-5.3-Flash, que aceita imagem. É cobrado por uso: confira o saldo no painel da Z.ai.',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    cost: 'Modelos grátis, sem cartão',
    keyUrl: 'https://openrouter.ai/keys',
    keyHint: 'sk-or-…',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    cost: 'Pago, precisa de saldo',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyHint: 'sk-…',
  },
]

export const DEFAULT_PROVIDER: ProviderId = 'gemini'

export function getProvider(id: string): ProviderInfo | undefined {
  return PROVIDERS.find(p => p.id === id)
}

export interface KeyCheck {
  ok: boolean
  /** Mensagem em português quando `ok` é falso. */
  reason?: string
}

/** Só remove espaços acidentais nas pontas. A chave nunca é alterada além disso. */
export function cleanKey(raw: string): string {
  return raw.trim()
}

const OPENAI_PATTERN = /^sk-(?!or-)[0-9A-Za-z_-]{20,200}$/
const OPENROUTER_PATTERN = /^sk-or-[0-9A-Za-z_-]{20,200}$/

/**
 * Checagem local de formato, sem chamar nenhuma API.
 * Gemini: o Google mudou o formato das chaves (AIza → AQ.), então NÃO se exige prefixo.
 * Só se barra o que não pode ser uma chave enviada em um cabeçalho HTTP
 * (espaços, aspas, quebras de linha, caracteres não ASCII). Quem decide se a chave vale é o Google.
 */
export function checkKey(id: ProviderId, raw: string): KeyCheck {
  const key = cleanKey(raw)
  if (!key) return { ok: false, reason: 'Cole a chave.' }

  if (id === 'gemini' || id === 'zai') {
    // Sem prefixo obrigatório: o formato da chave é decidido pelo provedor, não pelo app.
    if (/\s/.test(key)) return { ok: false, reason: 'A chave não pode ter espaços ou quebras de linha.' }
    if (/["'`<>]/.test(key)) return { ok: false, reason: 'Remova as aspas ou símbolos ao redor da chave.' }
    if (!/^[\x21-\x7E]+$/.test(key)) return { ok: false, reason: 'A chave tem caracteres inválidos. Copie-a de novo.' }
    if (key.length < 8) return { ok: false, reason: 'A chave parece curta demais. Copie-a inteira.' }
    if (key.length > 512) return { ok: false, reason: 'A chave parece longa demais. Confira o que foi colado.' }
    return { ok: true }
  }

  const pattern = id === 'openai' ? OPENAI_PATTERN : OPENROUTER_PATTERN
  const label = getProvider(id)?.label ?? id
  return pattern.test(key) ? { ok: true } : { ok: false, reason: `Esta chave não parece ser do ${label}.` }
}
