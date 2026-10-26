import type { NextApiRequest, NextApiResponse } from 'next'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'

export const config = { api: { bodyParser: { sizeLimit: '6mb' } } }

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BASE64_CHARS = 5 * 1024 * 1024 // ~3.7MB de imagem
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

const schema = {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim()
  if (rateLimited(ip)) return res.status(429).json({ error: 'Muitas análises seguidas. Aguarde um minuto.' })

  const { imageData, mimeType, contexto } = req.body ?? {}
  if (typeof imageData !== 'string' || !imageData) return res.status(400).json({ error: 'Imagem não fornecida' })
  if (imageData.length > MAX_BASE64_CHARS) return res.status(413).json({ error: 'Imagem muito grande (máx. ~3,5MB).' })
  if (!ALLOWED_MIME.includes(mimeType)) return res.status(400).json({ error: 'Formato inválido. Use PNG, JPG ou WEBP.' })

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Serviço de análise não configurado.' })

  try {
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: MODEL,
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.2 },
    })
    const clean = (v: unknown, n: number) => String(v ?? '').replace(/[^\p{L}\p{N} ./:_-]/gu, '').slice(0, n)
    const ctx = `Contexto informado: ativo="${clean(contexto?.ativo, 24)}", timeframe="${clean(contexto?.timeframe, 12)}", perfil="${clean(contexto?.perfil, 16)}".`
    const out = await model.generateContent([{ inlineData: { data: imageData, mimeType } }, PROMPT + '\n' + ctx])
    const parsed = JSON.parse(out.response.text())

    parsed.confianca = Math.min(95, Math.max(0, Math.round(Number(parsed.confianca) || 55)))
    for (const k of Object.keys(parsed.niveis_y ?? {})) {
      const v = parsed.niveis_y[k]
      if (typeof v !== 'number' || v < 0 || v > 1) delete parsed.niveis_y[k]
    }
    return res.status(200).json({ result: parsed })
  } catch (error) {
    console.error('Gemini API error:', error)
    return res.status(502).json({ error: 'Não foi possível analisar o gráfico agora. Tente novamente.' })
  }
}
