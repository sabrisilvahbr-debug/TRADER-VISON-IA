/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'av-bg':     '#0B0F14',
        'av-bg2':    '#111820',
        'av-bg3':    '#161E27',
        'av-blue':   '#00C2FF',
        'av-green':  '#00FF88',
        'av-red':    '#FF4560',
        'av-gold':   '#FFD700',
        'av-gray':   '#8A9BB0',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'grid-move':  'gridMove 20s linear infinite',
        'orb':        'orb 8s ease-in-out infinite',
        'pulse-dot':  'pulseDot 2s infinite',
        'spin-slow':  'spin 0.8s linear infinite',
        'fade-in':    'fadeIn 0.5s ease forwards',
        'slide-up':   'slideUp 0.4s ease forwards',
      },
      keyframes: {
        gridMove:  { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '60px 60px' } },
        orb:       { '0%,100%': { transform: 'translate(0,0)' }, '50%': { transform: 'translate(30px,20px)' } },
        pulseDot:  { '0%,100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '0.5', transform: 'scale(0.8)' } },
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
