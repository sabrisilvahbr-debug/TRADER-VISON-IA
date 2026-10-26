import { useState } from 'react'

interface Props {
  value: string
  onChange: (key: string) => void
  highlight: boolean
}

export default function ApiKeyPanel({ value, onChange, highlight }: Props) {
  const [draft, setDraft] = useState('')
  const saved = value.length > 0

  return (
    <section className={`rounded-lg border bg-sheet p-5 ${highlight ? 'border-bear' : 'border-rule'}`}>
      <h2 className="text-sm font-medium text-ink-soft">Sua chave gratuita do Google</h2>
      {saved ? (
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="num text-sm">Chave salva ····{value.slice(-4)}</span>
          <button onClick={() => onChange('')} className="text-sm underline underline-offset-4 hover:text-bear">
            Remover
          </button>
        </div>
      ) : (
        <>
          <p className="mt-1.5 text-sm leading-relaxed">
            A análise usa a cota gratuita do seu próprio Google AI Studio. Não precisa de cartão nem de créditos.{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue underline underline-offset-4"
            >
              Gerar chave grátis
            </a>
          </p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={e => {
              e.preventDefault()
              if (draft.trim()) { onChange(draft.trim()); setDraft('') }
            }}
          >
            <label htmlFor="gemini-key" className="sr-only">Chave do Google AI Studio</label>
            <input
              id="gemini-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="AIza…"
              className="num min-w-0 flex-1 rounded-md border border-rule bg-white px-3 py-2 text-sm"
            />
            <button className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">Salvar</button>
          </form>
        </>
      )}
      <p className="mt-3 text-xs leading-relaxed text-ink-soft">
        A chave fica só neste navegador e segue com cada análise. Nada é guardado no servidor.
      </p>
    </section>
  )
}
