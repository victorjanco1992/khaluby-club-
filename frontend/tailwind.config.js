export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Verde Khaluby — del logo
        khaluby: {
          50:  '#f2fce8',
          100: '#e1f8ca',
          200: '#c4f099',
          300: '#9de360',
          400: '#7bd132',
          500: '#5cb516',  // verde base del logo
          600: '#459110',
          700: '#366e0e',
          800: '#2c5710',
          900: '#264a11',
          950: '#102806',
        },
        // Dorado/ámbar — acentos del cartel
        gold: {
          300: '#fde68a',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        // Rojo pared
        brick: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        // Pizarra — fondo del logo
        slate: {
          900: '#0f1a0a',
          800: '#141f0e',
          700: '#1a2812',
          600: '#223318',
        },
        dark: {
          950: '#080d05',
          900: '#0c1409',
          800: '#111d0d',
          700: '#172612',
          600: '#1e3018',
          500: '#274020',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};