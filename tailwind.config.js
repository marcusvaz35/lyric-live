/** @type {import('tailwindcss').Config} */
// Cores lidas de variáveis CSS (ver styles/themes.css) pra dar pra trocar o visual inteiro em tempo real.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          950: v('s-950'),
          900: v('s-900'),
          850: v('s-850'),
          800: v('s-800'),
          700: v('s-700'),
          600: v('s-600')
        },
        neutral: {
          50: v('n-50'),
          100: v('n-100'),
          200: v('n-200'),
          300: v('n-300'),
          400: v('n-400'),
          500: v('n-500'),
          600: v('n-600')
        },
        accent: {
          DEFAULT: v('accent'),
          hover: v('accent-hover')
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
