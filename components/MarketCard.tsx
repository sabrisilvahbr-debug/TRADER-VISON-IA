import { AnalysisResult } from '../lib/types'
import { MarketData, fmt } from '../lib/market'
import { parsePrice } from '../lib/levels'

function rsiLabel(v: number | null): string {
  if (v === null) return ''
  if (v >= 70) return 'sobrecomprado'
  if (v <= 30) return 'sobrevendido'
  return 'neutro'
}

function Cell({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="num mt-0.5 text-sm font-medium">{value}</dd>
      {note && <dd className="text-xs text-ink-soft">{note}</dd>}
    </div>
  )
}

export default function MarketCard({ market, result }: { market: MarketData; result: AnalysisResult | null }) {
  const warnings: string[] = []
  if (result) {
    if (result.tendencia !== market.trend) {
      warnings.push(`O gráfico indica tendência de ${result.tendencia.toLowerCase()}, mas as médias móveis diárias indicam ${market.trend.toLowerCase()}.`)
    }
    const entrada = parsePrice(result.entrada)
    if (entrada !== null && market.last > 0) {
      // "38.000" pode ser 38 ou 38 mil: usa a leitura mais próxima do preço atual
      const candidatos = /^\D*\d{1,3}\.\d{3}\D*$/.test(result.entrada.split('-')[0].trim()) ? [entrada, entrada * 1000] : [entrada]
      const dist = Math.min(...candidatos.map(v => Math.abs(v - market.last) / market.last))
      if (dist > 0.1) {
        warnings.push(`A entrada sugerida está ${(dist * 100).toFixed(0)}% longe do preço atual. Confira se o print é deste ativo.`)
      }
    }
  }
  const up = market.changePct >= 0

  return (
    <section className="rounded-lg border border-rule bg-sheet p-5" aria-label="Dados reais de mercado">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-ink-soft">Dados reais · {market.symbol}</h2>
        <span className="num text-xs text-ink-soft">diário até {market.asOf}</span>
      </div>

      <div className="mt-2 flex items-baseline gap-3">
        <span className="num text-2xl font-bold">{fmt(market.last)}</span>
        <span className={`num text-sm font-medium ${up ? 'text-bull' : 'text-bear'}`}>
          {up ? '+' : ''}{market.changePct.toFixed(2)}%
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Cell label="RSI (14)" value={market.rsi14 === null ? '—' : market.rsi14.toFixed(0)} note={rsiLabel(market.rsi14)} />
        <Cell label="Média 20" value={fmt(market.sma20)} />
        <Cell label="Média 50" value={fmt(market.sma50)} />
        <Cell label="Volatilidade (ATR)" value={fmt(market.atr14)} />
        <Cell label="Máxima 20d" value={fmt(market.high20)} />
        <Cell label="Mínima 20d" value={fmt(market.low20)} />
      </dl>

      <p className="mt-3 text-sm">
        Tendência pelas médias: <span className="font-medium">{market.trend}</span>
      </p>

      {warnings.map(w => (
        <p key={w} className="mt-2 rounded-md bg-mark/40 px-3 py-2 text-sm">{w}</p>
      ))}
      {result && warnings.length === 0 && (
        <p className="mt-2 text-sm text-bull">A leitura do gráfico confere com os dados reais.</p>
      )}
    </section>
  )
}
