import { useEffect, useState } from 'react'

const BASE_TICKERS = [
  { sym: 'BTC/USD',  price: 67842,  decimals: 0 },
  { sym: 'ETH/USD',  price: 3521,   decimals: 0 },
  { sym: 'PETR4',    price: 38.42,  decimals: 2 },
  { sym: 'IBOV',     price: 128450, decimals: 0 },
  { sym: 'EUR/USD',  price: 1.0842, decimals: 4 },
  { sym: 'GOLD',     price: 2318,   decimals: 0 },
  { sym: 'DOGE/USD', price: 0.1342, decimals: 4 },
  { sym: 'VALE3',    price: 68.54,  decimals: 2 },
]

interface TickerItem {
  sym: string
  price: number
  change: number
  decimals: number
}

export default function Ticker() {
  const [tickers, setTickers] = useState<TickerItem[]>(
    BASE_TICKERS.map(t => ({ ...t, change: (Math.random() - 0.45) * 3 }))
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setTickers(prev =>
        prev.map(t => ({
          ...t,
          price: t.price * (1 + (Math.random() - 0.5) * 0.001),
          change: t.change + (Math.random() - 0.5) * 0.1,
        }))
      )
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const doubled = [...tickers, ...tickers]

  return (
    <div
      className="overflow-hidden border-b"
      style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}
    >
      <div className="ticker-inner py-2 px-4">
        {doubled.map((t, i) => {
          const up = t.change >= 0
          const fmt = (n: number) =>
            n.toLocaleString('pt-BR', {
              minimumFractionDigits: t.decimals,
              maximumFractionDigits: t.decimals,
            })
          return (
            <div key={i} className="flex items-center gap-2 text-sm whitespace-nowrap">
              <span className="font-semibold font-mono" style={{ color: 'var(--blue)' }}>
                {t.sym}
              </span>
              <span className="font-mono text-white">{fmt(t.price)}</span>
              <span
                className="text-xs font-semibold"
                style={{ color: up ? 'var(--green)' : 'var(--red)' }}
              >
                {up ? '▲' : '▼'} {Math.abs(t.change).toFixed(2)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
