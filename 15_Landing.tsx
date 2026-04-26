import { useState } from 'react'

const KIWIFY_URL = process.env.NEXT_PUBLIC_KIWIFY_URL || 'https://pay.kiwify.com.br/8dq9075'

const FAQ_ITEMS = [
  {
    q: 'A IA executa ordens automaticamente?',
    a: 'Não. O AlphaVision é exclusivamente uma ferramenta de análise e sugestão. Nenhuma ordem é enviada a corretoras. A decisão final é sempre sua.',
  },
  {
    q: 'Quais tipos de gráfico posso analisar?',
    a: 'Qualquer gráfico em imagem: ações, cripto, forex, índices, commodities. Basta fazer um print da sua plataforma favorita.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. O plano PRO pode ser cancelado a qualquer momento, sem multas ou burocracia.',
  },
  {
    q: 'A análise é precisa?',
    a: 'Nossa IA tem precisão média de 89% nos backtests. Porém, nenhuma análise garante resultado. Use como ferramenta de apoio à decisão.',
  },
]

interface LandingProps {
  onEnter: () => void
}

export default function Landing({ onEnter }: LandingProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 grid-bg" />
        <div className="orb orb-blue" style={{ top: '-100px', left: '-100px' }} />
        <div className="orb orb-green" style={{ bottom: '-50px', right: '-50px' }} />
      </div>

      <div className="relative z-10">
        {/* Nav */}
        <nav
          className="flex justify-between items-center px-6 md:px-10 py-5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="text-xl font-bold gradient-text tracking-tight">⚡ AlphaVision AI</div>
          <div className="flex gap-3">
            <button
              onClick={onEnter}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ border: '1px solid var(--border)', color: '#fff' }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = 'var(--blue)'; (e.target as HTMLButtonElement).style.color = 'var(--blue)' }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.target as HTMLButtonElement).style.color = '#fff' }}
            >
              Entrar
            </button>
            <button
              onClick={() => window.open(KIWIFY_URL, '_blank')}
              className="btn-glow-gold px-5 py-2 rounded-lg text-sm font-bold text-black"
              style={{ background: 'linear-gradient(135deg, #FFD700, #ff8c00)' }}
            >
              💎 Upgrade PRO
            </button>
          </div>
        </nav>

        {/* Hero */}
        <section className="text-center px-6 py-20 max-w-4xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-8"
            style={{ background: 'var(--glass2)', border: '1px solid var(--border)', color: 'var(--blue)' }}
          >
            <span className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
            IA ativa — analisando mercados em tempo real
          </div>

          <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
            IA que analisa o mercado{' '}
            <span className="gradient-text">em segundos</span>
          </h1>

          <p className="text-lg mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--gray)' }}>
            Pare de operar no achismo. Use inteligência artificial para validar suas decisões
            com precisão profissional.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={onEnter}
              className="btn-glow px-8 py-4 rounded-xl font-bold text-base text-white"
              style={{ background: 'linear-gradient(135deg, var(--blue), #0080ff)' }}
            >
              🚀 Testar agora — grátis
            </button>
            <button
              onClick={() => window.open(KIWIFY_URL, '_blank')}
              className="btn-glow-gold px-8 py-4 rounded-xl font-bold text-base text-black"
              style={{ background: 'linear-gradient(135deg, #FFD700, #ff8c00)' }}
            >
              💎 Upgrade PRO
            </button>
          </div>
        </section>

        {/* Stats */}
        <div
          className="flex flex-wrap justify-center gap-8 md:gap-16 px-6 py-8"
          style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--glass)' }}
        >
          {[
            { num: '14.800+', lbl: 'Análises realizadas' },
            { num: '89%',     lbl: 'Precisão média' },
            { num: '3.200+', lbl: 'Traders ativos' },
            { num: '<1s',     lbl: 'Tempo de resposta' },
          ].map(s => (
            <div key={s.lbl} className="text-center">
              <div className="text-3xl font-bold gradient-text">{s.num}</div>
              <div className="text-sm mt-1" style={{ color: 'var(--gray)' }}>{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Problema */}
        <section className="px-6 py-16 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3 tracking-tight">O problema</h2>
          <p className="text-center mb-12" style={{ color: 'var(--gray)' }}>Operar sem dados é jogar no escuro</p>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: '😰', title: 'Decisões emocionais', desc: 'Comprar por medo de perder ou vender no pânico destrói qualquer estratégia.' },
              { icon: '📉', title: 'Falta de análise técnica', desc: 'Suportes, resistências e padrões exigem horas de estudo que você não tem.' },
              { icon: '⏰', title: 'Tempo é dinheiro', desc: 'Analisar gráficos manualmente leva horas. O mercado não espera.' },
            ].map(c => (
              <div key={c.title} className="glass-card p-7 transition-all hover:-translate-y-1 hover:border-blue-400/30 duration-300">
                <div className="text-3xl mb-4">{c.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{c.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--gray)' }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Solução */}
        <section className="px-6 py-16" style={{ background: 'var(--glass)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-3 tracking-tight">A solução</h2>
            <p className="text-center mb-12" style={{ color: 'var(--gray)' }}>AlphaVision analisa seu gráfico e devolve um parecer completo em segundos</p>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { icon: '🧠', title: 'IA de última geração', desc: 'Motor Google Gemini treinado para identificar padrões técnicos com precisão de especialista.' },
                { icon: '⚡', title: 'Resultado em 1 segundo', desc: 'Faça upload do gráfico e receba tendência, suporte, resistência, entrada e stop imediatamente.' },
                { icon: '🎯', title: 'Decisão clara', desc: 'Entrar / Esperar / Evitar. Sem ambiguidade, com justificativa profissional completa.' },
              ].map(c => (
                <div key={c.title} className="glass-card p-7 transition-all hover:-translate-y-1 duration-300">
                  <div className="text-3xl mb-4">{c.icon}</div>
                  <h3 className="text-lg font-semibold mb-2">{c.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--gray)' }}>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section className="px-6 py-16 max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3 tracking-tight">Como funciona</h2>
          <p className="text-center mb-12" style={{ color: 'var(--gray)' }}>Três passos simples</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: '1', title: 'Faça upload', desc: 'Envie um print do gráfico diretamente do seu setup' },
              { n: '2', title: 'IA analisa', desc: 'O Gemini identifica padrões, suportes e tendências automaticamente' },
              { n: '3', title: 'Tome a decisão', desc: 'Receba a análise completa e execute com confiança' },
            ].map(s => (
              <div key={s.n} className="text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-black mx-auto mb-4"
                  style={{ background: 'linear-gradient(135deg, var(--blue), var(--green))' }}
                >
                  {s.n}
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--gray)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Planos */}
        <section className="px-6 py-16" style={{ background: 'var(--glass)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-3xl font-bold text-center mb-3 tracking-tight">Planos</h2>
          <p className="text-center mb-12" style={{ color: 'var(--gray)' }}>Comece grátis, escale quando quiser</p>
          <div className="grid md:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {/* Free */}
            <div className="rounded-2xl p-8" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
              <div className="text-xs font-bold tracking-widest mb-2" style={{ color: 'var(--gray)' }}>FREE</div>
              <div className="text-4xl font-bold mb-1">R$0 <span className="text-base font-normal" style={{ color: 'var(--gray)' }}>/ mês</span></div>
              <ul className="my-6 space-y-3 text-sm">
                {['3 análises por dia','Decisão: Entrar/Esperar/Evitar','Histórico 7 dias'].map(f => (
                  <li key={f} className="flex items-center gap-2"><span style={{ color: 'var(--green)' }}>✓</span>{f}</li>
                ))}
                {['Análises ilimitadas','Histórico completo','Suporte prioritário'].map(f => (
                  <li key={f} className="flex items-center gap-2" style={{ color: 'var(--gray)' }}><span>✗</span>{f}</li>
                ))}
              </ul>
              <button
                onClick={onEnter}
                className="btn-glow w-full py-3 rounded-xl font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, var(--blue), #0080ff)' }}
              >
                Começar grátis
              </button>
            </div>
            {/* Pro */}
            <div className="rounded-2xl p-8" style={{ background: 'var(--bg3)', border: '1px solid rgba(255,215,0,0.4)', background: 'linear-gradient(135deg, rgba(255,215,0,0.04), rgba(255,140,0,0.04))' } as React.CSSProperties}>
              <div className="text-xs font-bold tracking-widest mb-2" style={{ color: 'var(--gold)' }}>PRO ⚡</div>
              <div className="text-4xl font-bold mb-1 gradient-text-gold">R$97 <span className="text-base font-normal" style={{ color: 'var(--gray)' }}>/ mês</span></div>
              <ul className="my-6 space-y-3 text-sm">
                {['Análises ilimitadas','Decisão detalhada com IA','Histórico completo','Exportar análises','Suporte prioritário 24h','Novos recursos em primeira mão'].map(f => (
                  <li key={f} className="flex items-center gap-2"><span style={{ color: 'var(--green)' }}>✓</span>{f}</li>
                ))}
              </ul>
              <button
                onClick={() => window.open(KIWIFY_URL, '_blank')}
                className="btn-glow-gold w-full py-3 rounded-xl font-bold text-black"
                style={{ background: 'linear-gradient(135deg, #FFD700, #ff8c00)' }}
              >
                Assinar PRO agora
              </button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 py-16 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 tracking-tight">Perguntas frequentes</h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <button
                  className="w-full px-5 py-4 text-left flex justify-between items-center font-medium text-sm transition-colors"
                  style={{ background: openFaq === i ? 'var(--glass)' : 'transparent' }}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {item.q}
                  <span
                    className="ml-3 flex-shrink-0 transition-transform duration-200 text-xs"
                    style={{
                      color: 'var(--blue)',
                      transform: openFaq === i ? 'rotate(180deg)' : 'none',
                    }}
                  >
                    ▾
                  </span>
                </button>
                <div
                  className="faq-answer px-5 text-sm leading-relaxed"
                  style={{ color: 'var(--gray)' }}
                  aria-hidden={openFaq !== i}
                  ref={el => {
                    if (el) el.className = `faq-answer px-5 text-sm leading-relaxed${openFaq === i ? ' open' : ''}`
                  }}
                >
                  <div className="pb-4">{item.a}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer
          className="text-center py-8 px-6 text-sm"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--gray)' }}
        >
          © 2025 AlphaVision AI · Apenas análise e sugestão · Não executa trades · Não é assessoria financeira
        </footer>
      </div>
    </div>
  )
}
