import type { NextApiRequest, NextApiResponse } from 'next'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { getProvider, ProviderId } from '../../lib/providers'

export const config = { api: { bodyParser: { sizeLimit: '6mb' } } }

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemma-3-27b-it:free'
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
- Isto é análise educacional, não recomendação de investimento.`

// Para provedores sem schema nativo: descreve o JSON esperado no próprio prompt.
const JSON_SPEC = `Responda SOMENTE com um objeto JSON válido, sem markdown e sem texto extra, com exatamente estes campos:
{"tendencia":"Alta|Baixa|Lateral","suporte":"texto","resistencia":"texto","padrao":"texto","entrada":"texto","stop":"texto","take_profit":"texto","confianca":0-100,"decisao":"ENTRAR|ESPERAR|EVITAR","explicacao":"texto","riscos":"texto","ativo":"texto","timeframe":"texto","niveis_y":{"suporte":0-1,"resistencia":0-1,"entrada":0-1,"stop":0-1,"take_profit":0-1}}`

const geminiSchema = {
  type: SchemaType.OBJECT,
  properties: {
    tendencia: { type: SchemaType.STRING, format: 'enum', enum: ['Alta', 'Baixa', 'Lateral'] },
    suporte: { type: SchemaType.STRING },
    resistencia: { type: SchemaType.STRING },
    padrao: { type: SchemaType.STRING },
    entrada: { type: SchemaType.STRING },
    stop: { type: SchemaType.STRING },
    take_profit: { type: SchemaType.STRING },
    confianca: { type: SchemaType.INTEGER },
    decisao: { type: SchemaType.STRING, format: 'enum', enum: ['ENTRAR', 'ESPERAR', 'EVITAR'] },
    explicacao: { type: SchemaType.STRING },
    riscos: { type: SchemaType.STRING },
    ativo: { type: SchemaType.STRING },
    timeframe: { type: SchemaType.STRING },
    niveis_y: {
      type: SchemaType.OBJECT,
      properties: {
        suporte: { type: SchemaType.NUMBER },
        resistencia: { type: SchemaType.NUMBER },
        entrada: { type: SchemaType.NUMBER },
        stop: { type: SchemaType.NUMBER },
        take_profit: { type: SchemaType.NUMBER },
      },
    },
  },
  required: ['tendencia', 'suporte', 'resistencia', 'padrao', 'entrada', 'stop', 'take_profit', 'confianca', 'decisao', 'explicacao', 'riscos', 'ativo', 'timeframe'],
}

class ProviderError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

const clean = (v: unknown, n: number) => String(v ?? '').replace(/[^\p{L}\p{N} ./:_-]/gu, '').slice(0, n)

async function callGemini(key: string, image: string, mime: string, ctx: string): Promise<string> {
  const model = new GoogleGenerativeAI(key).getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { responseMimeType: 'application/json', responseSchema: geminiSchema, temperature: 0.2 },
  })
  const out = await model.generateContent([{ inlineData: { data: image, mimeType: mime } }, PROMPT + '\n' + ctx])
  return out.response.text()
}

async function callChat(
  url: string,
  key: string,
  model: string,
  image: string,
  mime: string,
  ctx: string,
  jsonMode: boolean,
): Promise<string> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 1200,
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
    }),
  })
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    if (r.status === 401 || r.status === 403) throw new ProviderError(401, 'Chave recusada pelo provedor. Gere outra e cole de novo.')
    if (r.status === 402 || /insufficient_quota|insufficient credits/i.test(body)) {
      throw new ProviderError(402, 'Sem saldo nesta conta. Adicione créditos ou escolha um provedor gratuito.')
    }
    if (r.status === 429) throw new ProviderError(429, 'Limite do provedor atingido. Aguarde um minuto e tente de novo.')
    throw new ProviderError(502, 'O provedor não conseguiu analisar o gráfico agora.')
  }
  const data = await r.json()
  const text = data?.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text) throw new ProviderError(502, 'O modelo não devolveu uma resposta.')
  return text
}

/** Aceita JSON puro, com cercas de markdown ou com texto em volta. */
function parseJson(text: string): Record<string, unknown> {
  const stripped = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
  try {
    return JSON.parse(stripped)
  } catch {
    const m = stripped.match(/\{[\s\S]*\}/)
    if (!m) throw new ProviderError(502, 'A resposta do modelo veio em formato inesperado. Tente de novo.')
    return JSON.parse(m[0])
  }
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim()
  if (rateLimited(ip)) return res.status(429).json({ error: 'Muitas análises seguidas. Aguarde um minuto.' })

  const { imageData, mimeType, contexto } = req.body ?? {}
  if (typeof imageData !== 'string' || !imageData) return res.status(400).json({ error: 'Imagem não fornecida' })
  if (imageData.length > MAX_BASE64_CHARS) return res.status(413).json({ error: 'Imagem muito grande (máx. ~3,5MB).' })
  if (!ALLOWED_MIME.includes(mimeType)) return res.status(400).json({ error: 'Formato inválido. Use PNG, JPG ou WEBP.' })

  // A chave é do próprio usuário. Não é salva nem registrada no servidor.
  const providerHeader = String(req.headers['x-provider'] || 'gemini')
  const provider = getProvider(providerHeader)
  if (!provider) return res.status(400).json({ error: 'Provedor desconhecido.' })

  const header = req.headers['x-user-api-key'] ?? req.headers['x-user-gemini-key']
  const userKey = typeof header === 'string' ? header.trim() : ''
  if (userKey && !provider.keyPattern.test(userKey)) {
    return res.status(401).json({ error: `A chave não parece ser do ${provider.label}. Copie-a de novo.` })
  }
  const envKey = provider.id === 'gemini' ? process.env.GOOGLE_GEMINI_API_KEY : undefined
  const apiKey = userKey || envKey
  if (!apiKey) return res.status(401).json({ error: `Cole sua chave do ${provider.label} para analisar.` })

  const ctx = `Contexto informado: ativo="${clean(contexto?.ativo, 24)}", timeframe="${clean(contexto?.timeframe, 12)}", perfil="${clean(contexto?.perfil, 16)}".`
  const id: ProviderId = provider.id

  try {
    let text: string
    if (id === 'gemini') text = await callGemini(apiKey, imageData, mimeType, ctx)
    else if (id === 'openai') text = await callChat('https://api.openai.com/v1/chat/completions', apiKey, OPENAI_MODEL, imageData, mimeType, ctx, true)
    else text = await callChat('https://openrouter.ai/api/v1/chat/completions', apiKey, OPENROUTER_MODEL, imageData, mimeType, ctx, false)

    return res.status(200).json({ result: normalize(parseJson(text)) })
  } catch (error) {
    if (error instanceof ProviderError) return res.status(error.status).json({ error: error.message })
    const msg = error instanceof Error ? error.message : ''
    if (/API key not valid|API_KEY_INVALID|permission/i.test(msg)) {
      return res.status(401).json({ error: 'Chave recusada pelo Google. Gere outra no AI Studio e cole de novo.' })
    }
    if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) {
      return res.status(429).json({ error: 'Limite gratuito do Google atingido. Aguarde um minuto e tente de novo.' })
    }
    console.error('Analysis error:', id, msg.slice(0, 200))
    return res.status(502).json({ error: 'Não foi possível analisar o gráfico agora. Tente novamente.' })
  }
}
