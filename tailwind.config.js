/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#0a0a0d',
          900: '#121216',
          850: '#17171d',
          800: '#1d1d24',
          700: '#2a2a33',
          600: '#3a3a45'
        },
        accent: {
          DEFAULT: '#6d5efc',
          hover: '#7f72ff'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
