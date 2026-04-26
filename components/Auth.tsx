import { useState } from 'react'
import { AuthMode, User } from '../lib/types'

interface AuthProps {
  onSuccess: (user: User) => void
  onBack: () => void
}

export default function Auth({ onSuccess, onBack }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('trader@demo.com')
  const [password, setPassword] = useState('123456')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email || !password) { setError('Preencha todos os campos'); return }
    if (mode === 'register' && !name) { setError('Informe seu nome'); return }
    setError('')
    setLoading(true)

    // Simulate auth delay
    await new Promise(r => setTimeout(r, 800))

    const userName = mode === 'register' ? name : email.split('@')[0]
    onSuccess({ email, name: userName })
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}
    >
      {/* Back */}
      <button
        onClick={onBack}
        className="mb-6 text-sm transition-colors"
        style={{ color: 'var(--gray)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--blue)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--gray)')}
      >
        ← Voltar para a página inicial
      </button>

      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
      >
        <div className="text-center mb-6">
          <div className="text-2xl font-bold gradient-text mb-1">⚡ AlphaVision AI</div>
          <div className="text-sm" style={{ color: 'var(--gray)' }}>Plataforma premium de análise com IA</div>
        </div>

        {/* Tabs */}
        <div
          className="flex rounded-xl mb-6 overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          {(['login', 'register'] as AuthMode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className="flex-1 py-2.5 text-sm font-medium transition-all"
              style={{
                background: mode === m ? 'linear-gradient(135deg, var(--blue), #0080ff)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--gray)',
              }}
            >
              {m === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--gray)' }}>Nome</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
                onFocus={e => (e.target.style.borderColor = 'var(--blue)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          )}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--gray)' }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--blue)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--gray)' }}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--blue)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-center" style={{ color: 'var(--red)' }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-glow mt-5 w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, var(--blue), #0080ff)' }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="spinner" /> Entrando...
            </span>
          ) : (
            mode === 'login' ? 'Entrar' : 'Criar conta'
          )}
        </button>

        <p className="mt-4 text-center text-xs" style={{ color: 'var(--gray)' }}>
          Demo: trader@demo.com / 123456
        </p>
      </div>
    </div>
  )
}
