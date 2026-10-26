import type { NextApiRequest, NextApiResponse } from 'next'
import { Candle, computeMarket, resolveSymbol } from '../../lib/market'

const KEY_PATTERN = /^[A-Za-z0-9]{8,40}$/
const RATE_LIMIT = 20
const WINDOW_MS = 60_000
const hits = new Map<string, { count: number; reset: number }>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const e = hits.get(ip)
  if (!e || e.reset < now) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS })
    return false
  }
  e.count += 1
  return e.count > RATE_LIMIT
}

class MarketError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

type Row = Record<string, string>

function pickNumber(row: Row, word: string): number {
  const key = Object.keys(row).find(k => k.toLowerCase().includes(word))
  return key ? parseFloat(row[key]) : NaN
}

function toCandles(series: Record<string, Row>): Candle[] {
  return Object.entries(series)
    .map(([t, row]) => ({ t, o: pickNumber(row, 'open'), h: pickNumber(row, 'high'), l: pickNumber(row, 'low'), c: pickNumber(row, 'close') }))
    .filter(c => [c.o, c.h, c.l, c.c].every(Number.isFinite))
    .sort((a, b) => (a.t < b.t ? -1 : 1))
    .slice(-100)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim()
  if (rateLimited(ip)) return res.status(429).json({ error: 'Muitas consultas seguidas. Aguarde um minuto.' })

  const header = req.headers['x-av-key']
  const key = typeof header === 'string' ? header.trim() : ''
  if (!key) return res.status(401).json({ error: 'Cole sua chave da Alpha Vantage para buscar os dados do ativo.' })
  if (!KEY_PATTERN.test(key)) return res.status(401).json({ error: 'A chave da Alpha Vantage não parece válida.' })

  const resolved = resolveSymbol(String(req.body?.symbol ?? ''))
  if (!resolved) return res.status(400).json({ error: 'Ativo inválido. Exemplos: PETR4, AAPL, EURUSD, BTC.' })

  const q = new URLSearchParams({ apikey: key, outputsize: 'compact' })
  if (resolved.kind === 'forex') {
    q.set('function', 'FX_DAILY')
    q.set('from_symbol', resolved.from)
    q.set('to_symbol', resolved.to)
  } else if (resolved.kind === 'cripto') {
    q.set('function', 'DIGITAL_CURRENCY_DAILY')
    q.set('symbol', resolved.symbol)
    q.set('market', 'USD')
  } else {
    q.set('function', 'TIME_SERIES_DAILY')
    q.set('symbol', resolved.symbol)
  }

  try {
    const r = await fetch(`https://www.alphavantage.co/query?${q}`, { signal: AbortSignal.timeout(12_000) })
    if (!r.ok) throw new MarketError(502, 'A Alpha Vantage não respondeu agora.')
    const json = (await r.json()) as Record<string, unknown>

    if (typeof json['Error Message'] === 'string') {
      throw new MarketError(404, `Não encontrei "${resolved.symbol}" na Alpha Vantage. Confira o código do ativo.`)
    }
    const notice = String(json['Information'] ?? json['Note'] ?? '')
    if (notice) {
      if (/premium/i.test(notice)) throw new MarketError(402, 'Este ativo exige o plano pago da Alpha Vantage.')
      if (/invalid|api key/i.test(notice) && !/rate|limit|per day|per minute/i.test(notice)) {
        throw new MarketError(401, 'Chave da Alpha Vantage recusada. Gere outra e cole de novo.')
      }
      throw new MarketError(429, 'Limite da Alpha Vantage atingido (a chave grátis permite cerca de 25 consultas por dia).')
    }

    const seriesKey = Object.keys(json).find(k => /time series/i.test(k))
    const candles = seriesKey ? toCandles(json[seriesKey] as Record<string, Row>) : []
    if (candles.length < 21) throw new MarketError(404, 'A Alpha Vantage devolveu poucos dados para este ativo.')

    return res.status(200).json({ market: computeMarket(resolved.symbol, resolved.kind, candles) })
  } catch (e) {
    if (e instanceof MarketError) return res.status(e.status).json({ error: e.message })
    console.error('Market data error:', e instanceof Error ? e.message.slice(0, 160) : 'desconhecido')
    return res.status(502).json({ error: 'Não foi possível buscar os dados do ativo agora.' })
  }
}
