import { AnalysisResult } from '../lib/types'

interface Props {
  result: AnalysisResult
  isPro: boolean
  onUpgrade: () => void
}

const DECISION_CONFIG = {
  ENTRAR: { label: '✅ ENTRAR', colorVar: '--green', bgClass: 'rgba(0,255,136,0.06)', borderClass: 'rgba(0,255,136,0.3)' },
  ESPERAR: { label: '⏳ ESPERAR', colorVar: '--gold', bgClass: 'rgba(255,215,0,0.06)', borderClass: 'rgba(255,215,0,0.3)' },
  EVITAR:  { label: '🚫 EVITAR', colorVar: '--red', bgClass: 'rgba(255,69,96,0.06)', borderClass: 'rgba(255,69,96,0.3)' },
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
    >
      <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--gray)' }}>
        {label}
      </div>
      <div
        className="text-lg font-bold font-mono"
        style={{ color: color || 'var(--blue)' }}
      >
        {value}
      </div>
    </div>
  )
}

export default function AnalysisResultCard({ result, isPro, onUpgrade }: Props) {
  const dec = DECISION_CONFIG[result.decisao] || DECISION_CONFIG.ESPERAR
  const tendColor =
    result.tendencia === 'Alta' ? 'var(--green)' :
    result.tendencia === 'Baixa' ? 'var(--red)' : 'var(--blue)'

  return (
    <div className="mt-6 space-y-4 animate-fade-in-up">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <span>📊</span> Resultado da Análise
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </h3>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Tendência"   value={result.tendencia}   color={tendColor} />
        <MetricCard label="Padrão"      value={result.padrao}      color="var(--blue)" />
        <MetricCard label="Suporte"     value={result.suporte}     color="var(--green)" />
        <MetricCard label="Resistência" value={result.resistencia} color="var(--red)" />
        <MetricCard label="Entrada"     value={result.entrada}     color="var(--blue)" />
        <MetricCard label="Stop Loss"   value={result.stop}        color="var(--red)" />
        <MetricCard label="Take Profit" value={result.take_profit} color="var(--gold)" />
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
        >
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--gray)' }}>
            Confiança
          </div>
          <div className="text-lg font-bold font-mono" style={{ color: 'var(--blue)' }}>
            {result.confianca}%
          </div>
          <div className="mt-2 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${result.confianca}%`,
                background: 'linear-gradient(90deg, var(--blue), var(--green))',
              }}
            />
          </div>
        </div>
      </div>

      {/* Decision box */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: dec.bgClass,
          border: `1px solid ${dec.borderClass}`,
        }}
      >
        <div
          className="text-2xl font-bold mb-2"
          style={{ color: `var(${dec.colorVar})` }}
        >
          {dec.label}
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#ccc' }}>
          {result.explicacao}
        </p>
      </div>

      {/* Upgrade banner for free users */}
      {!isPro && (
        <div
          className="rounded-xl p-4 flex items-center justify-between gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.06), rgba(255,140,0,0.06))',
            border: '1px solid rgba(255,215,0,0.2)',
          }}
        >
          <div className="text-sm">
            <strong style={{ color: 'var(--gold)' }}>💎 PRO</strong>{' '}
            <span style={{ color: '#ccc' }}>desbloqueie análises ilimitadas e histórico completo</span>
          </div>
          <button
            onClick={onUpgrade}
            className="btn-glow-gold px-4 py-2 rounded-lg text-sm font-bold text-black whitespace-nowrap flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #FFD700, #ff8c00)' }}
          >
            Assinar PRO
          </button>
        </div>
      )}
    </div>
  )
}
