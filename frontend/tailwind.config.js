/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0066ff',
          600: '#0052cc',
          700: '#003d99',
        },
        dark: {
          bg: '#0a0d14',
          surface: '#111726',
          card: '#182234',
          border: '#233148',
          text: '#f1f5f9',
          muted: '#94a3b8'
        }
      },
      boxShadow: {
        'glow': '0 0 25px -5px rgba(0, 102, 255, 0.3)',
        'glow-subtle': '0 0 15px -3px rgba(0, 102, 255, 0.15)',
      }
    },
  },
  plugins: [],
}
