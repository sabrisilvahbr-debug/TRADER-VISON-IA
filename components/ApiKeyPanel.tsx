import { useState } from 'react'
import { PROVIDERS, ProviderId, getProvider } from '../lib/providers'

interface Props {
  provider: ProviderId
  keys: Partial<Record<ProviderId, string>>
  onProvider: (id: ProviderId) => void
  onKey: (id: ProviderId, key: string) => void
  highlight: boolean
}

export default function ApiKeyPanel({ provider, keys, onProvider, onKey, highlight }: Props) {
  const [draft, setDraft] = useState('')
  const info = getProvider(provider)!
  const saved = keys[provider] ?? ''
  const invalid = draft.trim().length > 0 && !info.keyPattern.test(draft.trim())

  return (
    <section className={`rounded-lg border bg-sheet p-5 ${highlight ? 'border-bear' : 'border-rule'}`}>
      <h2 className="text-sm font-medium text-ink-soft">Serviço de análise</h2>

      <div className="mt-2 grid gap-1.5" role="radiogroup" aria-label="Provedor de IA">
        {PROVIDERS.map(p => (
          <button
            key={p.id}
            role="radio"
            aria-checked={provider === p.id}
            onClick={() => { onProvider(p.id); setDraft('') }}
            className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm ${
              provider === p.id ? 'border-ink bg-ink text-white' : 'border-rule bg-white hover:border-ink-soft'
            }`}
          >
            <span className="font-medium">{p.label}</span>
            <span className={provider === p.id ? 'text-white/80' : 'text-ink-soft'}>
              {keys[p.id] ? 'Chave salva' : p.cost}
            </span>
          </button>
        ))}
      </div>

      {saved ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="num text-sm">Chave ····{saved.slice(-4)}</span>
          <button onClick={() => onKey(provider, '')} className="text-sm underline underline-offset-4 hover:text-bear">
            Remover
          </button>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed">
            Cole sua chave do {info.label}.{' '}
            <a
              href={info.keyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue underline underline-offset-4"
            >
              Gerar chave
            </a>
          </p>
          <form
            className="mt-2 flex gap-2"
            onSubmit={e => {
              e.preventDefault()
              const k = draft.trim()
              if (k && info.keyPattern.test(k)) { onKey(provider, k); setDraft('') }
            }}
          >
            <label htmlFor="api-key" className="sr-only">Chave do {info.label}</label>
            <input
              id="api-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={info.keyHint}
              aria-invalid={invalid}
              className="num min-w-0 flex-1 rounded-md border border-rule bg-white px-3 py-2 text-sm"
            />
            <button disabled={!draft.trim() || invalid} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
              Salvar
            </button>
          </form>
          {invalid && <p className="mt-1.5 text-xs text-bear">Esta chave não parece ser do {info.label}.</p>}
        </>
      )}

      <p className="mt-3 text-xs leading-relaxed text-ink-soft">
        A chave fica só neste navegador e segue com cada análise. Nada é guardado no servidor.
      </p>
    </section>
  )
}
