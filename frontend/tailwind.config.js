/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        'text-main': 'var(--text)',
        'text-muted': 'var(--text-muted)',
        brand: {
          DEFAULT: 'var(--brand)',
          indigo: '#4F46E5',
          violet: '#7C3AED'
        },
        risk: {
          low: '#10B981',
          med: '#F59E0B',
          high: '#F97316',
          crit: '#EF4444'
        }
      },
      borderRadius: {
        card: '16px',
        control: '10px'
      }
    }
  },
  plugins: []
}
