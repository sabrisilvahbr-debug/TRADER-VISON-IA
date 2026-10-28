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
  return forced ? [forced] : ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash']
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
  /** Instante (ms desde 1970) em que a chamada inteira deve terminar. Padrão: 52 s a partir de agora. */
  deadline?: number
}

/** Tempo máximo de cada tentativa; o orçamento total (deadline) manda se for menor. */
const ATTEMPT_MS = 40_000
/** Abaixo disto não vale a pena iniciar outra tentativa. */
const MIN_ATTEMPT_MS = 6_000

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

function describeNetworkError(e: unknown, timeoutMs: number): Attempt {
  const name = e instanceof Error ? e.name : ''
  if (name === 'TimeoutError' || name === 'AbortError') {
    const secs = Math.round(timeoutMs / 1000)
    return {
      retryNext: true,
      error: new GeminiError(504, `O Google demorou mais de ${secs} s para responder. Tente de novo; se repetir, use outra imagem menor ou outro provedor.`),
    }
  }
  const cause = (e as { cause?: { code?: unknown }; code?: unknown } | undefined)
  const code = String(cause?.cause?.code ?? cause?.code ?? '').replace(/[^A-Z0-9_]/gi, '').slice(0, 40)
  return { retryNext: true, error: new GeminiError(504, `Falha de conexão com o Google${code ? ` (${code})` : ''}. Tente de novo.`) }
}

async function once(model: string, p: GeminiParams, timeoutMs: number): Promise<{ text: string } | Attempt> {
  const doFetch = p.fetchImpl ?? fetch
  const parts: Record<string, unknown>[] = []
  if (p.image) parts.push({ inline_data: { mime_type: p.image.mime, data: p.image.data } })
  parts.push({ text: p.prompt })

  let r: Response
  try {
    r = await doFetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': p.apiKey },
      body: JSON.stringify({
        contents: [{ parts }],
        // Nos modelos Gemini 3 o raciocínio padrão é "high" e pode levar dezenas de segundos antes da 1ª resposta.
        // `thinkingConfig.thinkingLevel` é o parâmetro documentado; o 2.5 usa outro mecanismo e fica no padrão.
        ...(/^gemini-3/.test(model) ? { generationConfig: { thinkingConfig: { thinkingLevel: 'low' } } } : {}),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (e) {
    return describeNetworkError(e, timeoutMs)
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
  const deadline = p.deadline ?? Date.now() + 52_000

  for (const model of models) {
    const remaining = deadline - Date.now()
    if (failures.length > 0 && remaining < MIN_ATTEMPT_MS) break // sem tempo para outra tentativa
    const res = await once(model, p, Math.max(1_000, Math.min(ATTEMPT_MS, remaining)))
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
