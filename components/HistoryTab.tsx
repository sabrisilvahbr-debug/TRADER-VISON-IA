import { HistoryEntry } from '../lib/types'

interface HistoryTabProps {
  history: HistoryEntry[]
  isPro: boolean
  onUpgrade: () => void
}

const DECISION_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  ENTRAR: { label: 'ENTRAR', bg: 'rgba(0,255,136,0.12)', color: 'var(--green)' },
  ESPERAR: { label: 'ESPERAR', bg: 'rgba(255,215,0,0.12)', color: 'var(--gold)' },
  EVITAR:  { label: 'EVITAR',  bg: 'rgba(255,69,96,0.12)',  color: 'var(--red)'  },
}

export default function HistoryTab({ history, isPro, onUpgrade }: HistoryTabProps) {
  if (history.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-3 text-lg font-semibold mb-6">
          <span>📋</span> Histórico de Análises
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>
        <div className="text-center py-20" style={{ color: 'var(--gray)' }}>
          <div className="text-5xl mb-4">📭</div>
          <p className="text-base">Nenhuma análise ainda.</p>
          <p className="text-sm mt-1">Faça sua primeira análise para ver o histórico aqui.</p>
        </div>
      </div>
    )
  }

  const shown  = isPro ? history : history.slice(0, 5)
  const locked = isPro ? [] : history.slice(5)

  return (
    <div>
      <div className="flex items-center gap-3 text-lg font-semibold mb-6">
        <span>📋</span> Histórico de Análises
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      <div className="space-y-3">
        {shown.map((entry) => {
          const dec = DECISION_STYLE[entry.result.decisao] || DECISION_STYLE.ESPERAR
          const tendColor =
            entry.result.tendencia === 'Alta'  ? 'var(--green)' :
            entry.result.tendencia === 'Baixa' ? 'var(--red)'   : 'var(--blue)'

          return (
            <div
              key={entry.id}
              className="flex items-center gap-4 rounded-xl px-5 py-4 transition-all duration-200"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,194,255,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {/* Thumbnail */}
              <div
                className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl"
                style={{ background: 'var(--bg2)' }}
              >
                {entry.image
                  ? <img src={entry.image} alt="chart" className="w-full h-full object-cover" />
                  : '📊'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">
                  {entry.result.padrao || 'Análise técnica'}
                  {' · '}
                  <span style={{ color: tendColor }}>{entry.result.tendencia}</span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--gray)' }}>
                  {entry.date} · Confiança: {entry.result.confianca}%
                </div>
                <div className="text-xs mt-1 truncate" style={{ color: 'var(--gray)' }}>
                  Entrada: {entry.result.entrada} · Stop: {entry.result.stop} · TP: {entry.result.take_profit}
                </div>
              </div>

              {/* Decision badge */}
              <div
                className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: dec.bg, color: dec.color }}
              >
                {dec.label}
              </div>
            </div>
          )
        })}

        {/* Locked entries banner */}
        {locked.length > 0 && (
          <div
            className="rounded-xl px-6 py-8 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.05), rgba(255,140,0,0.05))',
              border: '1px solid rgba(255,215,0,0.2)',
            }}
          >
            <div className="text-2xl mb-2">🔒</div>
            <div className="font-semibold mb-1">+{locked.length} análises bloqueadas</div>
            <div className="text-sm mb-4" style={{ color: 'var(--gray)' }}>
              Assine o PRO para ver seu histórico completo
            </div>
            <button
              onClick={onUpgrade}
              className="btn-glow-gold px-6 py-2.5 rounded-xl font-bold text-sm text-black"
              style={{ background: 'linear-gradient(135deg, #FFD700, #ff8c00)' }}
            >
              💎 Desbloquear histórico
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
