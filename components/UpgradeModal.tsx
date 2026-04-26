interface UpgradeModalProps {
  onClose: () => void
  onUpgrade: () => void
}

export default function UpgradeModal({ onClose, onUpgrade }: UpgradeModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative rounded-2xl p-8 w-full max-w-md text-center"
        style={{ background: 'var(--bg2)', border: '1px solid rgba(255,215,0,0.4)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white text-xl leading-none transition-colors"
        >
          ✕
        </button>

        <div className="text-5xl mb-4">💎</div>
        <h2 className="text-2xl font-bold mb-2">
          Torne-se <span className="gradient-text-gold">PRO</span>
        </h2>
        <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--gray)' }}>
          Desbloqueie análises ilimitadas, histórico completo e suporte prioritário 24h.
        </p>

        <div
          className="rounded-xl p-4 mb-6 text-left text-sm space-y-2"
          style={{ background: 'var(--bg3)' }}
        >
          {[
            'Análises ilimitadas por dia',
            'Histórico completo de análises',
            'Suporte prioritário 24h',
            'Novos recursos em primeira mão',
          ].map((f) => (
            <div key={f} className="flex items-center gap-2">
              <span style={{ color: 'var(--green)' }}>✓</span>
              <span className="text-white">{f}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onUpgrade}
          className="btn-glow-gold w-full py-4 rounded-xl font-bold text-base text-black"
          style={{ background: 'linear-gradient(135deg, #FFD700, #ff8c00)' }}
        >
          Assinar PRO — R$97/mês
        </button>
        <p className="text-xs mt-3" style={{ color: 'var(--gray)' }}>
          Cancele quando quiser · Sem multas · Pagamento seguro
        </p>
      </div>
    </div>
  )
}
