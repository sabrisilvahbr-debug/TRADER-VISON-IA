import { useState } from 'react'
import { AnalysisResult, DashTab, HistoryEntry, User } from '../lib/types'
import Ticker from './Ticker'
import AnalyzeTab from './AnalyzeTab'
import HistoryTab from './HistoryTab'
import UpgradeModal from './UpgradeModal'

const KIWIFY_URL = process.env.NEXT_PUBLIC_KIWIFY_URL || 'https://pay.kiwify.com.br/8dq9075'
const DAILY_LIMIT = 3

interface DashboardProps {
  user: User
  onLogout: () => void
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [tab, setTab]               = useState<DashTab>('analyze')
  const [isPro, setIsPro]           = useState(false)
  const [dailyCount, setDailyCount] = useState(0)
  const [history, setHistory]       = useState<HistoryEntry[]>([])
  const [showModal, setShowModal]   = useState(false)
  const [proToast, setProToast]     = useState(false)

  const handleAnalysisDone = (result: AnalysisResult, image: string) => {
    setDailyCount(c => c + 1)
    setHistory(prev => [
      {
        id: Date.now(),
        result,
        image,
        date: new Date().toLocaleString('pt-BR'),
      },
      ...prev,
    ])
  }

  const handleUpgrade = () => {
    window.open(KIWIFY_URL, '_blank')
    // Mock PRO activation after 1.5 s
    setTimeout(() => {
      setIsPro(true)
      setShowModal(false)
      setProToast(true)
      setTimeout(() => setProToast(false), 4000)
    }, 1500)
  }

  const NAV_ITEMS: { id: DashTab; icon: string; label: string }[] = [
    { id: 'analyze', icon: '🔍', label: 'Analisar' },
    { id: 'history', icon: '📋', label: 'Histórico' },
  ]

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg)' }}>

      {/* Top nav */}
      <header
        className="flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="font-bold text-base gradient-text">⚡ AlphaVision AI</div>

        <div className="flex items-center gap-3">
          {/* Plan badge */}
          {isPro ? (
            <span
              className="px-3 py-1 rounded-full text-xs font-bold text-black"
              style={{ background: 'linear-gradient(135deg, #FFD700, #ff8c00)' }}
            >
              PRO ⚡
            </span>
          ) : (
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(138,155,176,0.15)', color: 'var(--gray)', border: '1px solid rgba(138,155,176,0.25)' }}
            >
              FREE
            </span>
          )}

          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-black flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--blue), var(--green))' }}
          >
            {user.name[0].toUpperCase()}
          </div>

          <button
            onClick={onLogout}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ border: '1px solid var(--border)', color: 'var(--gray)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--gray)' }}
          >
            Sair
          </button>
        </div>
      </header>

      {/* Ticker */}
      <Ticker />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside
          className="hidden md:flex flex-col w-52 flex-shrink-0 p-3 gap-1"
          style={{ background: 'var(--bg2)', borderRight: '1px solid var(--border)' }}
        >
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-left transition-all"
              style={{
                background: tab === item.id ? 'rgba(0,194,255,0.08)' : 'transparent',
                color: tab === item.id ? 'var(--blue)' : 'var(--gray)',
                border: tab === item.id ? '1px solid var(--border)' : '1px solid transparent',
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}

          {/* Upgrade button at bottom */}
          {!isPro && (
            <button
              onClick={() => setShowModal(true)}
              className="btn-glow-gold mt-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold text-black"
              style={{ background: 'linear-gradient(135deg, #FFD700, #ff8c00)' }}
            >
              <span>💎</span> Upgrade PRO
            </button>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-5">
          {/* Mobile tab bar */}
          <div className="flex md:hidden gap-2 mb-4">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: tab === item.id ? 'rgba(0,194,255,0.1)' : 'var(--glass)',
                  color: tab === item.id ? 'var(--blue)' : 'var(--gray)',
                  border: `1px solid ${tab === item.id ? 'var(--border)' : 'transparent'}`,
                }}
              >
                {item.icon} {item.label}
              </button>
            ))}
            {!isPro && (
              <button
                onClick={() => setShowModal(true)}
                className="flex-1 py-2 rounded-xl text-sm font-bold text-black"
                style={{ background: 'linear-gradient(135deg, #FFD700, #ff8c00)' }}
              >
                💎 PRO
              </button>
            )}
          </div>

          {tab === 'analyze' && (
            <AnalyzeTab
              isPro={isPro}
              dailyCount={dailyCount}
              dailyLimit={DAILY_LIMIT}
              onAnalysisComplete={handleAnalysisDone}
              onUpgrade={() => setShowModal(true)}
            />
          )}
          {tab === 'history' && (
            <HistoryTab
              history={history}
              isPro={isPro}
              onUpgrade={() => setShowModal(true)}
            />
          )}
        </main>
      </div>

      {/* Upgrade modal */}
      {showModal && (
        <UpgradeModal
          onClose={() => setShowModal(false)}
          onUpgrade={handleUpgrade}
        />
      )}

      {/* PRO toast */}
      {proToast && (
        <div
          className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl font-semibold text-sm animate-fade-in-up"
          style={{
            background: 'rgba(0,255,136,0.12)',
            border: '1px solid rgba(0,255,136,0.4)',
            color: 'var(--green)',
          }}
        >
          🎉 Bem-vindo ao PRO! Análises ilimitadas desbloqueadas.
        </div>
      )}
    </div>
  )
}
