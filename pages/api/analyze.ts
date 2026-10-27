import type { NextApiRequest, NextApiResponse } from 'next'
import { getProvider, checkKey, ProviderId } from '../../lib/providers'
import { GeminiError, generateText, redact } from '../../lib/gemini'

export const config = { api: { bodyParser: { sizeLimit: '6mb' } }, maxDuration: 60 }

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free'
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BASE64_CHARS = 5 * 1024 * 1024 // ~3,7MB de imagem
const RATE_LIMIT = 10 // análises por janela, por IP
const WINDOW_MS = 60_000

// Limite simples em memória (por instância). Para produção, use Redis/Upstash.
const hits = new Map<string, { count: number; reset: number }>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || entry.reset < now) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > RATE_LIMIT
}

const PROMPT = `Você é um analista técnico de trading experiente. Analise o gráfico da imagem e preencha o JSON.
Regras:
- "niveis_y": posição vertical APROXIMADA de cada nível na imagem, de 0 (topo) a 1 (base). Omita o que não conseguir localizar.
- "ativo" e "timeframe": leia da imagem; se ilegível, use o contexto informado; senão "—".
- "riscos": 1 frase sobre o que invalida o setup.
- Ajuste a cautela ao perfil de risco informado (conservador exige mais confirmação).
- Use apenas o que é visível no gráfico; não invente níveis ilegíveis (use "—").
- Se a imagem não for um gráfico financeiro, use decisao "EVITAR", confianca 55 e explique.
- "explicacao": 2-3 frases em português justificando o setup e a decisão.
- Se houver "Dados reais de mercado", use-os para conferir preço e níveis: entrada, stop e alvo devem ser coerentes com o preço atual. Se o gráfico divergir dos dados, diga em "riscos".
- Isto é análise educacional, não recomendação de investimento.`

// Para provedores sem schema nativo: descreve o JSON esperado no próprio prompt.
const JSON_SPEC = `Responda SOMENTE com um objeto JSON válido. Sem raciocínio, sem markdown, sem texto antes ou depois: a resposta deve começar com { e terminar com }. Use exatamente estes campos:
{"tendencia":"Alta|Baixa|Lateral","suporte":"texto","resistencia":"texto","padrao":"texto","entrada":"texto","stop":"texto","take_profit":"texto","confianca":0-100,"decisao":"ENTRAR|ESPERAR|EVITAR","explicacao":"texto","riscos":"texto","ativo":"texto","timeframe":"texto","niveis_y":{"suporte":0-1,"resistencia":0-1,"entrada":0-1,"stop":0-1,"take_profit":0-1}}`

class ProviderError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

/** Reconstrói o resumo só com números validados; nada do cliente entra como texto livre. */
function marketContext(m: unknown): string {
  if (!m || typeof m !== 'object') return ''
  const o = m as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v * 1e6) / 1e6) : '—')
  const sym = String(o.symbol ?? '').replace(/[^A-Za-z0-9.^=-]/g, '').slice(0, 20)
  const trend = ['Alta', 'Baixa', 'Lateral'].includes(String(o.trend)) ? String(o.trend) : '—'
  const asOf = String(o.asOf ?? '').replace(/[^0-9-]/g, '').slice(0, 10)
  if (!sym) return ''
  return `Dados reais de mercado (Alpha Vantage, candles diários, até ${asOf || '—'}): ativo=${sym}, último=${num(o.last)}, RSI14=${num(o.rsi14)}, SMA20=${num(o.sma20)}, SMA50=${num(o.sma50)}, ATR14=${num(o.atr14)}, máxima20=${num(o.high20)}, mínima20=${num(o.low20)}, tendência pelas médias=${trend}.`
}

const clean = (v: unknown, n: number) => String(v ?? '').replace(/[^\p{L}\p{N} ./:_-]/gu, '').slice(0, n)

async function callGemini(key: string, image: string, mime: string, ctx: string): Promise<string> {
  const prompt = `${PROMPT}\n${JSON_SPEC}\n${ctx}`
  let last: unknown = new ProviderError(502, 'O modelo não devolveu uma resposta.')
  for (let i = 0; i < 2; i++) {
    const { text } = await generateText({ apiKey: key, prompt, image: { data: image, mime } })
    try {
      parseJson(text)
      return text
    } catch (e) {
      last = e // resposta fora do formato: tenta de novo
    }
  }
  throw last
}

/** Extrai a mensagem de erro legível do corpo de uma resposta de erro (OpenAI/OpenRouter). */
function providerMessage(body: string): string {
  try {
    const j = JSON.parse(body)
    const raw = j?.error?.metadata?.raw
    const msg = typeof raw === 'string' && raw ? raw : j?.error?.message ?? j?.message ?? ''
    return String(msg).replace(/\s+/g, ' ').slice(0, 180)
  } catch {
    return body.replace(/\s+/g, ' ').slice(0, 120)
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function callChat(
  url: string,
  key: string,
  model: string,
  image: string,
  mime: string,
  ctx: string,
  jsonMode: boolean,
  attempts: number,
): Promise<string> {
  const body = JSON.stringify({
    model,
    temperature: 0.2,
    max_tokens: 3000,
    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `${PROMPT}\n${JSON_SPEC}\n${ctx}` },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${image}` } },
        ],
      },
    ],
  })

  let last: ProviderError = new ProviderError(502, 'O provedor não respondeu.')
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(900)
    let r: Response
    try {
      r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body,
        signal: AbortSignal.timeout(40_000),
      })
    } catch {
      last = new ProviderError(504, 'O provedor demorou demais para responder.')
      continue
    }

    const raw = await r.text().catch(() => '')

    if (r.ok) {
      let data: { choices?: { message?: { content?: unknown } }[]; error?: { message?: string } } = {}
      try { data = JSON.parse(raw) } catch { /* trata abaixo */ }
      const c = data.choices?.[0]?.message?.content
      const text = typeof c === 'string' ? c : Array.isArray(c) ? c.map((p: { text?: string }) => p?.text ?? '').join('') : ''
      if (text.trim()) {
        try {
          parseJson(text)
          return text
        } catch {
          console.error('Resposta fora do formato (início):', text.slice(0, 160).replace(/\s+/g, ' '))
          last = new ProviderError(502, 'A resposta do modelo veio em formato inesperado. Tente de novo.')
          continue
        }
      }
      // OpenRouter às vezes devolve 200 com erro do modelo escolhido: tenta de novo (outro modelo)
      last = new ProviderError(502, `O modelo não devolveu uma resposta${data.error?.message ? `: ${String(data.error.message).slice(0, 120)}` : '.'}`)
      continue
    }

    if (r.status === 401 || r.status === 403) throw new ProviderError(401, 'Chave recusada pelo provedor. Gere outra e cole de novo.')
    if (r.status === 402 || /insufficient_quota|insufficient credits/i.test(raw)) {
      throw new ProviderError(402, 'Sem saldo nesta conta. Adicione créditos ou escolha um provedor gratuito.')
    }

    const detail = providerMessage(raw)
    if (r.status === 429) last = new ProviderError(429, 'Limite do provedor atingido (modelos gratuitos ficam lotados). Tente de novo em instantes.')
    else if (r.status === 404 || r.status >= 500) last = new ProviderError(502, `Modelo indisponível no provedor agora${detail ? `: ${detail}` : '.'}`)
    else throw new ProviderError(502, `O provedor recusou a análise (código ${r.status})${detail ? `: ${detail}` : '.'}`)
  }
  throw last
}

/** Primeiro objeto {...} do texto, respeitando aspas. Se a resposta foi cortada, fecha o que ficou aberto. */
function extractObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start < 0) return null
  const stack: string[] = []
  let inStr = false
  let esc = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === '{') stack.push('}')
    else if (ch === '[') stack.push(']')
    else if (ch === '}' || ch === ']') {
      stack.pop()
      if (stack.length === 0) return text.slice(start, i + 1)
    }
  }
  // Truncado: remove cauda incompleta e fecha as estruturas abertas
  let t = text.slice(start)
  if (inStr) t += '"'
  t = t.replace(/[,:\s]+$/, '').replace(/,\s*"[^"]*"$/, '')
  return t + stack.reverse().join('')
}

/** Aceita JSON puro, com cercas de markdown, raciocínio (<think>), texto em volta, vírgulas sobrando ou resposta cortada. */
function parseJson(text: string): Record<string, unknown> {
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/i, '')
    .replace(/```(?:json)?/gi, '')
    .replace(/[\u201C\u201D]/g, '"')
    .trim()
  const candidates = [cleaned, extractObject(cleaned)]
  for (const c of candidates) {
    if (!c) continue
    for (const attempt of [c, c.replace(/,\s*([}\]])/g, '$1')]) {
      try {
        const v = JSON.parse(attempt)
        if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
      } catch {
        /* tenta a próxima variação */
      }
    }
  }
  throw new ProviderError(502, 'A resposta do modelo veio em formato inesperado. Tente de novo.')
}

function normalize(p: Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '—')
  const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(v as T) ? (v as T) : fallback

  const niveis: Record<string, number> = {}
  const raw = (p.niveis_y ?? {}) as Record<string, unknown>
  for (const k of ['suporte', 'resistencia', 'entrada', 'stop', 'take_profit']) {
    const v = Number(raw[k])
    if (raw[k] !== undefined && raw[k] !== null && Number.isFinite(v) && v >= 0 && v <= 1) niveis[k] = v
  }

  return {
    tendencia: pick(p.tendencia, ['Alta', 'Baixa', 'Lateral'] as const, 'Lateral'),
    suporte: str(p.suporte),
    resistencia: str(p.resistencia),
    padrao: str(p.padrao),
    entrada: str(p.entrada),
    stop: str(p.stop),
    take_profit: str(p.take_profit),
    confianca: Math.min(95, Math.max(0, Math.round(Number(p.confianca) || 55))),
    decisao: pick(p.decisao, ['ENTRAR', 'ESPERAR', 'EVITAR'] as const, 'ESPERAR'),
    explicacao: str(p.explicacao),
    riscos: str(p.riscos),
    ativo: str(p.ativo),
    timeframe: str(p.timeframe),
    niveis_y: niveis,
  }
}

/** Confere a assinatura real do arquivo (PNG, JPEG ou WEBP), sem confiar no tipo declarado. */
function looksLikeImage(b64: string): boolean {
  const b = Buffer.from(b64.slice(0, 48), 'base64')
  const png = b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
  const jpeg = b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  const webp = b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'
  return png || jpeg || webp
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim()
  if (rateLimited(ip)) return res.status(429).json({ error: 'Muitas análises seguidas. Aguarde um minuto.' })

  const { imageData, mimeType, contexto, mercado } = req.body ?? {}
  if (typeof imageData !== 'string' || !imageData) return res.status(400).json({ error: 'Imagem não fornecida' })
  if (imageData.length > MAX_BASE64_CHARS) return res.status(413).json({ error: 'Imagem muito grande (máx. ~3,5MB).' })
  if (!ALLOWED_MIME.includes(mimeType)) return res.status(400).json({ error: 'Formato inválido. Use PNG, JPG ou WEBP.' })
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageData) || !looksLikeImage(imageData)) {
    return res.status(400).json({ error: 'O arquivo enviado não é uma imagem válida (PNG, JPG ou WEBP).' })
  }

  // A chave é do próprio usuário. Não é salva nem registrada no servidor.
  const providerHeader = String(req.headers['x-provider'] || 'gemini')
  const provider = getProvider(providerHeader)
  if (!provider) return res.status(400).json({ error: 'Provedor desconhecido.' })

  const header = req.headers['x-user-api-key'] ?? req.headers['x-user-gemini-key']
  const userKey = typeof header === 'string' ? header.trim() : ''
  if (userKey) {
    const check = checkKey(provider.id, userKey)
    if (!check.ok) return res.status(401).json({ error: check.reason ?? 'Chave inválida.' })
  }
  const envKey = provider.id === 'gemini' ? process.env.GOOGLE_GEMINI_API_KEY : undefined
  const apiKey = userKey || envKey
  if (!apiKey) return res.status(401).json({ error: `Cole sua chave do ${provider.label} para analisar.` })

  const ctx = `Contexto informado: ativo="${clean(contexto?.ativo, 24)}", timeframe="${clean(contexto?.timeframe, 12)}", perfil="${clean(contexto?.perfil, 16)}".`
  const ctxFull = ctx + (marketContext(mercado) ? '\n' + marketContext(mercado) : '')
  const id: ProviderId = provider.id

  try {
    let text: string
    if (id === 'gemini') text = await callGemini(apiKey, imageData, mimeType, ctxFull)
    else if (id === 'openai') text = await callChat('https://api.openai.com/v1/chat/completions', apiKey, OPENAI_MODEL, imageData, mimeType, ctxFull, true, 2)
    else text = await callChat('https://openrouter.ai/api/v1/chat/completions', apiKey, OPENROUTER_MODEL, imageData, mimeType, ctxFull, false, 3)

    return res.status(200).json({ result: normalize(parseJson(text)) })
  } catch (error) {
    if (error instanceof ProviderError || error instanceof GeminiError) {
      return res.status(error.status).json({ error: error.message })
    }
    // Nunca registra a chave: o texto do erro passa pela redação antes de ir para o log.
    const msg = redact(error instanceof Error ? error.message : '', apiKey)
    console.error('Analysis error:', id, msg.slice(0, 200))
    return res.status(502).json({ error: 'Não foi possível analisar o gráfico agora. Tente novamente.' })
  }
}
