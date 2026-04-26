import { useCallback, useRef, useState } from 'react'
import { AnalysisResult } from '../lib/types'
import AnalysisResultCard from './AnalysisResultCard'

interface AnalyzeTabProps {
  isPro: boolean
  dailyCount: number
  dailyLimit: number
  onAnalysisComplete: (result: AnalysisResult, image: string) => void
  onUpgrade: () => void
}

export default function AnalyzeTab({
  isPro, dailyCount, dailyLimit, onAnalysisComplete, onUpgrade,
}: AnalyzeTabProps) {
  const [image, setImage] = useState<string | null>(null)
  const [imageData, setImageData] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState<string>('image/jpeg')
  const [dragging, setDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const remaining = dailyLimit - dailyCount
  const canAnalyze = isPro || remaining > 0

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Por favor, envie um arquivo de imagem (PNG, JPG, etc.)')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setImage(dataUrl)
      setImageData(dataUrl.split(',')[1])
      setMimeType(file.type)
      setResult(null)
      setError('')
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }, [loadFile])

  const runAnalysis = async () => {
    if (!imageData || !canAnalyze || analyzing) return
    setAnalyzing(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData, mimeType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro na análise')
      setResult(data.result)
      onAnalysisComplete(data.result, image!)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Limit banner */}
      {!isPro && (
        <div
          className="flex items-center justify-between gap-4 rounded-xl px-5 py-4"
          style={{ background: 'rgba(0,194,255,0.06)', border: '1px solid rgba(0,194,255,0.2)' }}
        >
          <div className="text-sm">
            Plano FREE:{' '}
            <strong style={{ color: 'var(--blue)' }}>
              {remaining} de {dailyLimit} análises
            </strong>{' '}
            restantes hoje
          </div>
          <button
            onClick={onUpgrade}
            className="btn-glow-gold px-4 py-2 rounded-lg text-sm font-bold text-black flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #FFD700, #ff8c00)' }}
          >
            💎 Upgrade PRO
          </button>
        </div>
      )}

      {/* Section header */}
      <div className="flex items-center gap-3 text-lg font-semibold">
        <span>🔍</span> Análise de Gráfico com IA
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
          dragging ? 'drop-zone-active' : ''
        }`}
        style={{
          border: `2px dashed ${image ? 'var(--blue)' : 'var(--border)'}`,
          background: image ? 'rgba(0,194,255,0.04)' : 'var(--glass)',
          borderStyle: image ? 'solid' : 'dashed',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => e.target.files?.[0] && loadFile(e.target.files[0])}
        />
        {image ? (
          <>
            <img
              src={image}
              alt="Gráfico carregado"
              className="max-w-full max-h-52 mx-auto rounded-lg object-contain"
            />
            <p className="mt-3 text-sm" style={{ color: 'var(--blue)' }}>
              ✓ Gráfico carregado · clique para trocar
            </p>
          </>
        ) : (
          <>
            <div className="text-4xl mb-3">📊</div>
            <div className="font-semibold mb-1">Faça upload do seu gráfico</div>
            <div className="text-sm" style={{ color: 'var(--gray)' }}>
              Arraste ou clique · PNG, JPG · Qualquer ativo
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl px-5 py-4 text-sm"
          style={{ background: 'rgba(255,69,96,0.08)', border: '1px solid rgba(255,69,96,0.3)', color: 'var(--red)' }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Analyze button */}
      <button
        onClick={canAnalyze ? runAnalysis : onUpgrade}
        disabled={(!image || analyzing) && canAnalyze}
        className="btn-glow w-full py-4 rounded-xl font-bold text-base text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, var(--blue), #0080ff)' }}
      >
        {analyzing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="spinner" /> Analisando com IA...
          </span>
        ) : !canAnalyze ? (
          '🔒 Limite atingido — Upgrade PRO para continuar'
        ) : (
          '⚡ Analisar com IA'
        )}
      </button>

      {/* Analyzing state */}
      {analyzing && (
        <div className="text-center py-4 space-y-2">
          <div className="text-sm font-medium">Identificando padrões técnicos...</div>
          <div className="text-xs" style={{ color: 'var(--gray)' }}>
            Suporte · Resistência · Tendência · Padrão gráfico
          </div>
          <div
            className="h-1 rounded-full mx-auto mt-3 overflow-hidden"
            style={{ width: '200px', background: 'rgba(255,255,255,0.08)' }}
          >
            <div
              className="h-full rounded-full animate-pulse"
              style={{
                width: '60%',
                background: 'linear-gradient(90deg, var(--blue), var(--green))',
                animation: 'fillBar 2s ease-in-out infinite alternate',
              }}
            />
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <AnalysisResultCard result={result} isPro={isPro} onUpgrade={onUpgrade} />
      )}
    </div>
  )
}
