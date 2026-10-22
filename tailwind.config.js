/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        paper: '#EAF0F4',
        sheet: '#F7FAFC',
        ink: '#0F2233',
        'ink-soft': '#4A6074',
        rule: '#C5D3DD',
        bull: '#0B8A57',
        bear: '#CF3340',
        mark: '#F2D14B',
        blue: '#1F5FBF',
      },
      fontFamily: {
        sans: ['Bricolage Grotesque', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
