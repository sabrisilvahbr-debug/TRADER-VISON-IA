import { useCallback, useEffect, useRef, useState } from 'react'
import ChartCanvas from '../components/ChartCanvas'
import Verdict from '../components/Verdict'
import History from '../components/History'
import { AnalysisResult, Contexto, HistoryEntry, Perfil } from '../lib/types'
import { resizeImage } from '../lib/levels'

const STORAGE_KEY = 'trader-vision-history-v1'
const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D', '1W']
const PERFIS: { value: Perfil; label: string }[] = [
  { value: 'conservador', label: 'Conservador' },
  { value: 'moderado', label: 'Moderado' },
  { value: 'agressivo', label: 'Agressivo' },
]

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(items: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* armazenamento indisponível ou cheio: segue sem histórico */
  }
}

export default function Home() {
  const [image, setImage] = useState<string | null>(null)
  const [base64, setBase64] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [contexto, setContexto] = useState<Contexto>({ ativo: '', timeframe: '15m', perfil: 'moderado' })
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setHistory(loadHistory()), [])

  const loadFile = useCallback(async (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Envie um print em PNG, JPG ou WEBP.')
      return
    }
    try {
      const { dataUrl, base64 } = await resizeImage(file, 1600, 0.85)
      setImage(dataUrl)
      setBase64(base64)
      setResult(null)
      setActiveId(null)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível ler a imagem.')
    }
  }, [])

  // Colar print direto da área de transferência (Ctrl+V / Cmd+V)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find(f => f.type.startsWith('image/'))
      if (file) loadFile(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [loadFile])

  const analyze = async () => {
    if (!base64 || !image || analyzing) return
    setAnalyzing(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: base64, mimeType: 'image/jpeg', contexto }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha na análise.')
      const r: AnalysisResult = data.result
      setResult(r)

      const thumb = await makeThumb(image)
      const entry: HistoryEntry = {
        id: Date.now(),
        date: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        thumb,
        contexto,
        result: r,
      }
      const next = [entry, ...history].slice(0, 12)
      setHistory(next)
      saveHistory(next)
      setActiveId(entry.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha na análise.')
    } finally {
      setAnalyzing(false)
    }
  }

  const openEntry = (h: HistoryEntry) => {
    setImage(h.thumb)
    setBase64(null) // miniatura serve só para consulta; envie o print de novo para reanalisar
    setResult(h.result)
    setContexto(h.contexto)
    setActiveId(h.id)
    setError('')
  }

  const reset = () => {
    setImage(null)
    setBase64(null)
    setResult(null)
    setActiveId(null)
    setError('')
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">Trader Vision</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Envie o print de um gráfico. O bot marca suporte, resistência, entrada, stop e alvo direto na sua imagem.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div>
          {!image ? (
            <div
              role="button"
              tabIndex={0}
              aria-label="Enviar print do gráfico"
              onClick={() => inputRef.current?.click()}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => {
                e.preventDefault()
                setDragging(false)
                const f = e.dataTransfer.files[0]
                if (f) loadFile(f)
              }}
              className={`flex min-h-[22rem] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 text-center transition-colors ${
                dragging ? 'border-blue bg-blue/5' : 'border-ink-soft/50 bg-sheet/70 hover:border-ink'
              }`}
            >
              <p className="text-2xl font-bold">Solte o print do gráfico aqui</p>
              <p className="mt-2 text-ink-soft">
                ou clique para escolher um arquivo. Também dá para colar com <span className="num">Ctrl+V</span>.
              </p>
              <p className="mt-4 text-sm text-ink-soft">PNG, JPG ou WEBP</p>
            </div>
          ) : (
            <div className="space-y-3">
              <ChartCanvas src={image} result={result} analyzing={analyzing} />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={analyze}
                  disabled={analyzing || !base64}
                  className="rounded-md bg-ink px-5 py-2.5 font-medium text-white transition-opacity disabled:opacity-40"
                >
                  {analyzing ? 'Analisando…' : result ? 'Analisar de novo' : 'Analisar gráfico'}
                </button>
                <button onClick={reset} className="rounded-md border border-rule bg-sheet px-4 py-2.5 font-medium hover:border-ink-soft">
                  Trocar imagem
                </button>
                {!base64 && <span className="text-sm text-ink-soft">Envie o print novamente para reanalisar.</span>}
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) loadFile(f)
              e.target.value = ''
            }}
          />

          {error && (
            <p role="alert" className="mt-3 rounded-md border border-bear/40 bg-bear/10 px-4 py-3 text-sm text-bear">
              {error}
            </p>
          )}
        </div>

        <aside className="space-y-4">
          <fieldset className="rounded-lg border border-rule bg-sheet p-5">
            <legend className="px-1 text-sm font-medium text-ink-soft">Contexto (opcional)</legend>
            <label className="block text-sm" htmlFor="ativo">Ativo</label>
            <input
              id="ativo"
              value={contexto.ativo}
              maxLength={24}
              placeholder="Ex.: EURUSD, PETR4, BTC"
              onChange={e => setContexto({ ...contexto, ativo: e.target.value })}
              className="num mt-1 w-full rounded-md border border-rule bg-white px-3 py-2"
            />
            <label className="mt-3 block text-sm" htmlFor="tf">Timeframe</label>
            <select
              id="tf"
              value={contexto.timeframe}
              onChange={e => setContexto({ ...contexto, timeframe: e.target.value })}
              className="num mt-1 w-full rounded-md border border-rule bg-white px-3 py-2"
            >
              {TIMEFRAMES.map(t => <option key={t}>{t}</option>)}
            </select>
            <div className="mt-3 text-sm" id="perfil-label">Perfil de risco</div>
            <div className="mt-1 grid grid-cols-3 gap-1.5" role="radiogroup" aria-labelledby="perfil-label">
              {PERFIS.map(p => (
                <button
                  key={p.value}
                  role="radio"
                  aria-checked={contexto.perfil === p.value}
                  onClick={() => setContexto({ ...contexto, perfil: p.value })}
                  className={`rounded-md border px-2 py-2 text-sm font-medium ${
                    contexto.perfil === p.value ? 'border-ink bg-ink text-white' : 'border-rule bg-white hover:border-ink-soft'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </fieldset>

          {result ? (
            <Verdict result={result} />
          ) : (
            <div className="rounded-lg border border-rule bg-sheet/70 p-5 text-ink-soft">
              {analyzing ? 'Lendo candles, níveis e padrões…' : 'O veredito e o plano de trade aparecem aqui depois da análise.'}
            </div>
          )}
        </aside>
      </div>

      <History
        items={history}
        activeId={activeId}
        onSelect={openEntry}
        onClear={() => { setHistory([]); saveHistory([]); setActiveId(null) }}
      />
    </main>
  )
}

function makeThumb(dataUrl: string): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const w = 480
      const h = Math.round((img.height / img.width) * w)
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      c.getContext('2d')?.drawImage(img, 0, 0, w, h)
      resolve(c.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}
