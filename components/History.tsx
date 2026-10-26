import { HistoryEntry } from '../lib/types'

interface Props {
  items: HistoryEntry[]
  activeId: number | null
  onSelect: (e: HistoryEntry) => void
  onClear: () => void
}

const DOT: Record<string, string> = { ENTRAR: 'bg-bull', ESPERAR: 'bg-mark', EVITAR: 'bg-bear' }

export default function History({ items, activeId, onSelect, onClear }: Props) {
  if (items.length === 0) return null
  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Análises anteriores</h2>
        <button onClick={onClear} className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
          Apagar histórico
        </button>
      </div>
      <ul className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {items.map(h => (
          <li key={h.id} className="shrink-0">
            <button
              onClick={() => onSelect(h)}
              aria-current={h.id === activeId}
              className={`block w-44 overflow-hidden rounded-lg border bg-sheet text-left transition-colors ${
                h.id === activeId ? 'border-blue' : 'border-rule hover:border-ink-soft'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={h.thumb} alt="" className="h-24 w-full object-cover" />
              <div className="flex items-center gap-2 px-3 py-2">
                <span className={`h-2.5 w-2.5 rounded-full ${DOT[h.result.decisao] ?? 'bg-rule'}`} aria-hidden />
                <span className="text-sm font-medium">{h.result.decisao === 'ENTRAR' ? 'Entrar' : h.result.decisao === 'ESPERAR' ? 'Esperar' : 'Evitar'}</span>
                <span className="num ml-auto text-xs text-ink-soft">{h.date}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
