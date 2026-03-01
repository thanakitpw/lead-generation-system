/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans Thai', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#00b894',
          50:  '#f0fdf8',
          100: '#ccfbee',
          200: '#99f3dc',
          300: '#5ee8c5',
          400: '#2dd4aa',
          500: '#00b894',
          600: '#009b7d',
          700: '#007d65',
          800: '#006452',
          900: '#005244',
        },
        surface: {
          DEFAULT: '#ffffff',
          50: '#f8f9fb',
          100: '#f1f3f6',
          200: '#e8ecf0',
        },
        success: '#16a34a',
        warning: '#f59e0b',
        danger:  '#ef4444',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-md': '0 4px 12px 0 rgba(0,0,0,0.08)',
      },
      borderRadius: {
        xl:  '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}
