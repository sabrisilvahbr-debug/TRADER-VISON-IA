import { AnalysisResult, Decisao } from '../lib/types'
import { riskReward } from '../lib/levels'

const DECISION: Record<Decisao, { text: string; tone: string; line: string }> = {
  ENTRAR: { text: 'Entrar', tone: 'bg-bull text-white', line: 'O setup está claro o bastante para uma entrada.' },
  ESPERAR: { text: 'Esperar', tone: 'bg-mark text-ink', line: 'Ainda falta confirmação. Aguarde.' },
  EVITAR: { text: 'Evitar', tone: 'bg-bear text-white', line: 'Este gráfico não oferece um setup confiável.' },
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule py-2.5 last:border-0">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className={`num text-right text-sm font-medium ${tone ?? ''}`}>{value}</dd>
    </div>
  )
}

export default function Verdict({ result }: { result: AnalysisResult }) {
  const d = DECISION[result.decisao] ?? DECISION.ESPERAR
  const rr = riskReward(result.entrada, result.stop, result.take_profit)
  const trendTone = result.tendencia === 'Alta' ? 'text-bull' : result.tendencia === 'Baixa' ? 'text-bear' : 'text-ink'

  return (
    <section aria-live="polite" className="space-y-4">
      <div className="rounded-lg border border-rule bg-sheet p-5">
        <div className="flex items-center gap-3">
          <span className={`rounded-md px-3 py-1.5 text-xl font-bold ${d.tone}`}>{d.text}</span>
          <span className="num text-sm text-ink-soft">
            {result.ativo !== '—' ? result.ativo : 'Ativo não identificado'}
            {result.timeframe !== '—' ? ` · ${result.timeframe}` : ''}
          </span>
        </div>
        <p className="mt-3 text-sm text-ink-soft">{d.line}</p>

        <div className="mt-4">
          <div className="flex justify-between text-sm">
            <span className="text-ink-soft">Confiança da leitura</span>
            <span className="num font-medium">{result.confianca}%</span>
          </div>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper"
            role="progressbar"
            aria-valuenow={result.confianca}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Confiança da leitura"
          >
            <div className="h-full rounded-full bg-blue" style={{ width: `${result.confianca}%` }} />
          </div>
        </div>
      </div>

      <dl className="rounded-lg border border-rule bg-sheet px-5 py-2">
        <Row label="Tendência" value={result.tendencia} tone={trendTone} />
        <Row label="Padrão" value={result.padrao} />
        <Row label="Entrada" value={result.entrada} />
        <Row label="Stop" value={result.stop} tone="text-bear" />
        <Row label="Alvo" value={result.take_profit} tone="text-bull" />
        <Row label="Risco/retorno" value={rr !== null ? `1 : ${rr}` : '—'} />
      </dl>

      <div className="rounded-lg border border-rule bg-sheet p-5">
        <h2 className="text-sm font-medium text-ink-soft">Leitura do bot</h2>
        <p className="mt-1.5 leading-relaxed">{result.explicacao}</p>
        <h2 className="mt-4 text-sm font-medium text-ink-soft">O que invalida o setup</h2>
        <p className="mt-1.5 leading-relaxed">{result.riscos}</p>
      </div>

      <p className="text-xs leading-relaxed text-ink-soft">
        Análise automática para estudo. Não é recomendação de investimento e pode errar níveis e padrões.
      </p>
    </section>
  )
}
