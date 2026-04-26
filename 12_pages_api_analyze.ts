import type { NextApiRequest, NextApiResponse } from 'next'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM_PROMPT = `Você é um analista técnico de trading com 20 anos de experiência. 
Analise o gráfico enviado e retorne APENAS um objeto JSON válido, sem markdown, sem texto adicional, apenas o JSON puro.

O JSON deve ter exatamente estes campos:
{
  "tendencia": "Alta" ou "Baixa" ou "Lateral",
  "suporte": "nível de suporte em texto (ex: 1.2340 ou Zona 38.000-38.200)",
  "resistencia": "nível de resistência em texto",
  "padrao": "padrão técnico identificado (ex: Bandeira de Alta, Cabeça e Ombros, Triângulo Ascendente, etc.)",
  "entrada": "nível sugerido de entrada",
  "stop": "nível de stop loss sugerido",
  "take_profit": "nível de take profit sugerido",
  "confianca": número inteiro entre 55 e 95,
  "decisao": "ENTRAR" ou "ESPERAR" ou "EVITAR",
  "explicacao": "explicação profissional em 2-3 frases em português sobre o setup identificado, justificando a decisão"
}

Regras:
- Se a imagem não for claramente um gráfico financeiro, retorne decisao "EVITAR" com confiança 55 e explique que não foi possível identificar um gráfico válido.
- Seja preciso e profissional.
- Responda APENAS com o JSON, sem nenhum texto antes ou depois.`

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { imageData, mimeType } = req.body

  if (!imageData) {
    return res.status(400).json({ error: 'Imagem não fornecida' })
  }

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Chave de API não configurada. Configure GOOGLE_GEMINI_API_KEY no Vercel.' })
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const result = await model.generateContent([
      {
        inlineData: {
          data: imageData,
          mimeType: mimeType || 'image/jpeg',
        },
      },
      SYSTEM_PROMPT,
    ])

    const text = result.response.text().trim()

    // Remove markdown fences if present
    const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      // Try to extract JSON object from text
      const match = clean.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta da IA não contém JSON válido')
      parsed = JSON.parse(match[0])
    }

    // Validate required fields
    const required = ['tendencia','suporte','resistencia','padrao','entrada','stop','take_profit','confianca','decisao','explicacao']
    for (const field of required) {
      if (parsed[field] === undefined) {
        parsed[field] = field === 'confianca' ? 60 : '—'
      }
    }

    return res.status(200).json({ result: parsed })

  } catch (error: unknown) {
    console.error('Gemini API error:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return res.status(500).json({ error: `Erro na análise: ${message}` })
  }
}
