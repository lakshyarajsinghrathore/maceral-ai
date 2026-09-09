/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        coal: {
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
          500: '#64748B',
          100: '#F1F5F9',
          50: '#F8FAFC',
        },
        gold: {
          500: '#D97706',
          600: '#B45309',
          400: '#FBBF24',
          50: '#FFFBEB',
        },
        mining: {
          dark: '#0B1120',
          panel: '#131D33',
          border: '#1E293B',
          accent: '#38BDF8',
          orange: '#F97316',
          green: '#10B981',
          red: '#EF4444'
        }
      }
    },
  },
  plugins: [],
}
