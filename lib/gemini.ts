/**
 * Cliente REST do Gemini (generateContent), seguindo a documentação oficial:
 *   POST https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent
 *   Autenticação: cabeçalho `x-goog-api-key` (único método documentado para REST).
 *   Imagem: contents[].parts[] com `inline_data` { mime_type, data } e depois o texto.
 *   Resposta: candidates[].content.parts[].text
 *
 * A chave é usada exatamente como recebida, só no cabeçalho. Nunca vai em URL, corpo, log ou mensagem de erro.
 * Não depende do pacote @google/generative-ai (legado), que não é garantido para as chaves novas.
 */

export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

/** Modelo recomendado pela documentação para projetos novos primeiro; os demais são reserva. */
export function geminiModels(): string[] {
  const forced = process.env.GEMINI_MODEL
  return forced ? [forced] : ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-2.5-flash']
}

export class GeminiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

/** Remove a chave e qualquer coisa parecida com chave de um texto. */
export function redact(text: string, apiKey?: string): string {
  let out = text
  if (apiKey) out = out.split(apiKey).join('[chave]')
  return out
    .replace(/\bAQ\.[A-Za-z0-9._~-]{8,}/g, '[chave]')
    .replace(/\bAIza[0-9A-Za-z_-]{16,}/g, '[chave]')
    .replace(/(Bearer\s+)[^\s"']+/gi, '$1[chave]')
}

export interface GeminiImage {
  data: string // base64 sem prefixo
  mime: string
}

export interface GeminiParams {
  apiKey: string
  prompt: string
  image?: GeminiImage
  fetchImpl?: typeof fetch
}

interface Attempt {
  retryNext: boolean
  error: GeminiError
}

function describeError(status: number, body: string, apiKey: string): Attempt {
  let message = ''
  let reason = ''
  try {
    const j = JSON.parse(body)
    message = String(j?.error?.message ?? '')
    reason = JSON.stringify(j?.error?.details ?? '') + String(j?.error?.status ?? '')
  } catch {
    message = body.slice(0, 200)
  }
  const detail = redact(message.replace(/\s+/g, ' '), apiKey).slice(0, 180)
  const haystack = `${message} ${reason}`

  if (status === 429) {
    return { retryNext: true, error: new GeminiError(429, 'Limite de uso do Google atingido (cota grátis). Aguarde um minuto e tente de novo.') }
  }
  if (status === 404) {
    return { retryNext: true, error: new GeminiError(503, 'Modelo Gemini indisponível para esta chave.') }
  }
  if (status >= 500) {
    return { retryNext: true, error: new GeminiError(502, 'O Google está instável agora. Tente de novo em instantes.') }
  }
  if (status === 400 && /API_KEY_INVALID|API key not valid|API key expired/i.test(haystack)) {
    return { retryNext: false, error: new GeminiError(401, 'O Google não reconheceu esta chave. Gere uma nova no AI Studio e cole de novo.') }
  }
  if (status === 401 || status === 403) {
    if (/unrestricted|restrict/i.test(haystack)) {
      return {
        retryNext: false,
        error: new GeminiError(
          401,
          'O Google recusou esta chave: chaves padrão sem restrição não são mais aceitas. Gere uma nova chave no AI Studio ou restrinja esta à Gemini API.',
        ),
      }
    }
    if (/block|dormant|expired|suspend|disabled/i.test(haystack)) {
      return { retryNext: false, error: new GeminiError(401, 'Esta chave está bloqueada, expirada ou desativada. Gere uma nova no AI Studio.') }
    }
    // 403 pode ser a chave ou o acesso a um modelo específico: tenta o próximo antes de desistir.
    return {
      retryNext: status === 403,
      error: new GeminiError(401, 'O Google recusou esta chave ou ela não tem permissão para este modelo. Gere uma nova no AI Studio.'),
    }
  }
  if (status === 400) {
    return { retryNext: false, error: new GeminiError(400, `O Google recusou o pedido${detail ? `: ${detail}` : '.'}`) }
  }
  return { retryNext: false, error: new GeminiError(502, `Resposta inesperada do Google (código ${status}).`) }
}

async function once(model: string, p: GeminiParams): Promise<{ text: string } | Attempt> {
  const doFetch = p.fetchImpl ?? fetch
  const parts: Record<string, unknown>[] = []
  if (p.image) parts.push({ inline_data: { mime_type: p.image.mime, data: p.image.data } })
  parts.push({ text: p.prompt })

  let r: Response
  try {
    r = await doFetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': p.apiKey },
      body: JSON.stringify({ contents: [{ parts }] }),
      signal: AbortSignal.timeout(45_000),
    })
  } catch {
    return { retryNext: false, error: new GeminiError(504, 'Não foi possível falar com o Google (rede ou tempo esgotado). Tente de novo.') }
  }

  const raw = await r.text().catch(() => '')
  if (!r.ok) return describeError(r.status, raw, p.apiKey)

  let data: {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[]
    promptFeedback?: { blockReason?: string }
  } = {}
  try {
    data = JSON.parse(raw)
  } catch {
    /* tratado abaixo */
  }

  const block = data.promptFeedback?.blockReason
  if (block) {
    return { retryNext: false, error: new GeminiError(422, `O Google bloqueou este pedido (motivo: ${String(block).slice(0, 40)}). Tente outra imagem.`) }
  }
  const cand = data.candidates?.[0]
  const text = (cand?.content?.parts ?? [])
    .filter(x => !x.thought && typeof x.text === 'string')
    .map(x => x.text as string)
    .join('')
  if (!text.trim()) {
    const why = cand?.finishReason ? ` (motivo: ${String(cand.finishReason).slice(0, 40)})` : ''
    return { retryNext: true, error: new GeminiError(502, `O modelo não devolveu texto${why}.`) }
  }
  return { text }
}

/** Envia o pedido (com imagem, se houver) e devolve o texto. Nunca inventa resposta: falha com GeminiError. */
export async function generateText(p: GeminiParams): Promise<{ text: string; model: string }> {
  const models = geminiModels()
  const failures: GeminiError[] = []

  for (const model of models) {
    const res = await once(model, p)
    if ('text' in res) return { text: res.text, model }
    failures.push(res.error)
    if (!res.retryNext) throw res.error
  }

  // Todos os modelos falharam
  if (failures.every(f => f.status === 503)) {
    throw new GeminiError(503, `Nenhum modelo Gemini está disponível para esta chave (tentados: ${models.join(', ')}).`)
  }
  throw failures.find(f => f.status === 401) ?? failures.find(f => f.status === 429) ?? failures[0]
}
