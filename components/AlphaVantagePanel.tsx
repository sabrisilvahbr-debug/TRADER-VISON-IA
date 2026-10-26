import { useState } from 'react'

interface Props {
  value: string
  onChange: (key: string) => void
  highlight: boolean
}

const PATTERN = /^[A-Za-z0-9]{8,40}$/

export default function AlphaVantagePanel({ value, onChange, highlight }: Props) {
  const [draft, setDraft] = useState('')
  const invalid = draft.trim().length > 0 && !PATTERN.test(draft.trim())

  return (
    <section className={`rounded-lg border bg-sheet p-5 ${highlight ? 'border-bear' : 'border-rule'}`}>
      <h2 className="text-sm font-medium text-ink-soft">Dados de mercado (Alpha Vantage)</h2>
      {value ? (
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="num text-sm">Chave ····{value.slice(-4)}</span>
          <button onClick={() => onChange('')} className="text-sm underline underline-offset-4 hover:text-bear">
            Remover
          </button>
        </div>
      ) : (
        <>
          <p className="mt-1.5 text-sm leading-relaxed">
            Com a chave grátis, o app confere o print com o preço real, o RSI e as médias móveis do ativo.{' '}
            <a
              href="https://www.alphavantage.co/support/#api-key"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue underline underline-offset-4"
            >
              Gerar chave grátis
            </a>
          </p>
          <form
            className="mt-2 flex gap-2"
            onSubmit={e => {
              e.preventDefault()
              const k = draft.trim()
              if (PATTERN.test(k)) { onChange(k); setDraft('') }
            }}
          >
            <label htmlFor="av-key" className="sr-only">Chave da Alpha Vantage</label>
            <input
              id="av-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Chave da Alpha Vantage"
              aria-invalid={invalid}
              className="num min-w-0 flex-1 rounded-md border border-rule bg-white px-3 py-2 text-sm"
            />
            <button disabled={!draft.trim() || invalid} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
              Salvar
            </button>
          </form>
          {invalid && <p className="mt-1.5 text-xs text-bear">A chave tem só letras e números.</p>}
        </>
      )}
      <p className="mt-3 text-xs leading-relaxed text-ink-soft">
        Informe o ativo no contexto (PETR4, AAPL, EURUSD, BTC). Cada análise usa 1 das cerca de 25 consultas diárias do plano grátis.
      </p>
    </section>
  )
}
