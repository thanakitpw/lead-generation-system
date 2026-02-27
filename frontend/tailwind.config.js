/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sarabun', 'sans-serif'],
      },
      colors: {
        primary: { DEFAULT: '#0284c7', 50: '#f0f9ff', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1' },
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
      },
    },
  },
  plugins: [],
}
