export interface Candle {
  t: string
  o: number
  h: number
  l: number
  c: number
}

export type AssetKind = 'acao' | 'forex' | 'cripto'
export type Trend = 'Alta' | 'Baixa' | 'Lateral'

export interface MarketData {
  symbol: string
  kind: AssetKind
  asOf: string
  last: number
  changePct: number
  rsi14: number | null
  sma20: number | null
  sma50: number | null
  atr14: number | null
  high20: number
  low20: number
  trend: Trend
}

const CRYPTO = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'BNB', 'LTC', 'DOT', 'AVAX']

export type Resolved =
  | { kind: 'acao'; symbol: string }
  | { kind: 'forex'; symbol: string; from: string; to: string }
  | { kind: 'cripto'; symbol: string }

/** Interpreta o que o usuário digitou: PETR4, AAPL, EURUSD, BTC-USD… */
export function resolveSymbol(input: string): Resolved | null {
  const raw = input.trim().toUpperCase()
  if (!/^[A-Z0-9.^=/\- ]{1,20}$/.test(raw)) return null
  const letters = raw.replace(/[^A-Z]/g, '')

  const crypto = CRYPTO.find(c => letters === c || letters === c + 'USD')
  if (crypto) return { kind: 'cripto', symbol: crypto }

  const fx = raw.replace(/=X$/, '').replace(/[/\- ]/g, '')
  if (/^[A-Z]{6}$/.test(fx)) return { kind: 'forex', symbol: fx, from: fx.slice(0, 3), to: fx.slice(3) }

  const stock = raw.replace(/\s/g, '')
  if (!/^[A-Z0-9][A-Z0-9.^-]{0,14}$/.test(stock)) return null
  if (/^[A-Z]{4}\d{1,2}$/.test(stock)) return { kind: 'acao', symbol: stock + '.SA' } // B3
  return { kind: 'acao', symbol: stock }
}

export function sma(values: number[], n: number): number | null {
  if (values.length < n) return null
  const slice = values.slice(-n)
  return slice.reduce((a, b) => a + b, 0) / n
}

/** RSI de Wilder. `closes` em ordem cronológica. */
export function rsi(closes: number[], n = 14): number | null {
  if (closes.length <= n) return null
  let gain = 0
  let loss = 0
  for (let i = 1; i <= n; i++) {
    const d = closes[i] - closes[i - 1]
    if (d >= 0) gain += d
    else loss -= d
  }
  let avgGain = gain / n
  let avgLoss = loss / n
  for (let i = n + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    avgGain = (avgGain * (n - 1) + Math.max(d, 0)) / n
    avgLoss = (avgLoss * (n - 1) + Math.max(-d, 0)) / n
  }
  if (avgLoss === 0) return 100
  return 100 - 100 / (1 + avgGain / avgLoss)
}

export function atr(candles: Candle[], n = 14): number | null {
  if (candles.length <= n) return null
  const tr: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const { h, l } = candles[i]
    const pc = candles[i - 1].c
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)))
  }
  let a = tr.slice(0, n).reduce((x, y) => x + y, 0) / n
  for (let i = n; i < tr.length; i++) a = (a * (n - 1) + tr[i]) / n
  return a
}

/** `candles` em ordem cronológica (mais antigo primeiro). */
export function computeMarket(symbol: string, kind: AssetKind, candles: Candle[]): MarketData {
  const closes = candles.map(c => c.c)
  const last = closes[closes.length - 1]
  const prev = closes.length > 1 ? closes[closes.length - 2] : last
  const s20 = sma(closes, 20)
  const s50 = sma(closes, 50)
  const recent = candles.slice(-20)

  let trend: Trend = 'Lateral'
  if (s20 !== null && s50 !== null) {
    if (last > s20 && s20 > s50) trend = 'Alta'
    else if (last < s20 && s20 < s50) trend = 'Baixa'
  }

  return {
    symbol,
    kind,
    asOf: candles[candles.length - 1].t,
    last,
    changePct: prev ? ((last - prev) / prev) * 100 : 0,
    rsi14: rsi(closes),
    sma20: s20,
    sma50: s50,
    atr14: atr(candles),
    high20: Math.max(...recent.map(c => c.h)),
    low20: Math.min(...recent.map(c => c.l)),
    trend,
  }
}

export function fmt(n: number | null, digits = 2): string {
  if (n === null || !Number.isFinite(n)) return '—'
  const d = Math.abs(n) < 10 ? Math.max(digits, 4) : digits
  return n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
}
