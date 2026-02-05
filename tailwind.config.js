/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        qfc: {
          50: '#f0f5ff',
          100: '#e0ebff',
          200: '#c2d6ff',
          300: '#94b8ff',
          400: '#6694ff',
          500: '#4270ff',
          600: '#2952f5',
          700: '#1e3dd4',
          800: '#1d34ab',
          900: '#1d3186',
        },
      },
    },
  },
  plugins: [],
};
