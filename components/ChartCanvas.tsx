import { AnalysisResult, NiveisY } from '../lib/types'

interface Props {
  src: string
  result: AnalysisResult | null
  analyzing: boolean
}

const LINES: { key: keyof NiveisY; label: string; color: string; textKey: keyof AnalysisResult; dashed?: boolean }[] = [
  { key: 'resistencia', label: 'Resistência', color: '#CF3340', textKey: 'resistencia', dashed: true },
  { key: 'take_profit', label: 'Alvo', color: '#0B8A57', textKey: 'take_profit' },
  { key: 'entrada', label: 'Entrada', color: '#1F5FBF', textKey: 'entrada' },
  { key: 'stop', label: 'Stop', color: '#CF3340', textKey: 'stop' },
  { key: 'suporte', label: 'Suporte', color: '#0B8A57', textKey: 'suporte', dashed: true },
]

export default function ChartCanvas({ src, result, analyzing }: Props) {
  const niveis = result?.niveis_y ?? {}

  return (
    <figure className="relative overflow-hidden rounded-lg border border-rule bg-sheet shadow-[0_1px_0_#C5D3DD]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Gráfico enviado para análise" className="block w-full h-auto select-none" draggable={false} />

      {analyzing && <div className="scan-bar" aria-hidden />}

      {result &&
        LINES.map((l, i) => {
          const y = niveis[l.key]
          if (typeof y !== 'number') return null
          const value = String(result[l.textKey] ?? '')
          return (
            <div key={l.key} className="absolute left-0 right-0" style={{ top: `${y * 100}%` }}>
              <div
                className="level-line w-full"
                style={{
                  animationDelay: `${i * 90}ms`,
                  borderTop: `2px ${l.dashed ? 'dashed' : 'solid'} ${l.color}`,
                }}
              />
              <span
                className="num absolute right-2 -translate-y-full rounded-sm px-1.5 py-0.5 text-[11px] font-medium text-white"
                style={{ background: l.color }}
              >
                {l.label} {value}
              </span>
            </div>
          )
        })}

      {result && Object.keys(niveis).length > 0 && (
        <figcaption className="absolute bottom-2 left-2 rounded-sm bg-mark px-2 py-0.5 text-[11px] font-medium text-ink">
          Posição das linhas é aproximada
        </figcaption>
      )}
    </figure>
  )
}
