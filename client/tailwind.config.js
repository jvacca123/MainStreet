/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f3f7f4',
          100: '#dcebe1',
          200: '#b8d6c3',
          300: '#8dba9c',
          400: '#5d9971',
          500: '#3d7a52',
          600: '#2d5a3d',
          700: '#1f4329',
          800: '#1a3d2b',
          900: '#102a1c',
        },
        amber: {
          DEFAULT: '#e8a020',
          50: '#fdf6e3',
          100: '#fae7b3',
          200: '#f5d175',
          300: '#efb841',
          400: '#e8a020',
          500: '#c38416',
          600: '#9a6712',
        },
        cream: {
          DEFAULT: '#faf8f4',
          dark: '#f1ede4',
        },
        ink: '#1a1f1c',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(20, 40, 30, 0.04), 0 4px 12px rgba(20, 40, 30, 0.05)',
        cardHover: '0 4px 8px rgba(20, 40, 30, 0.06), 0 12px 28px rgba(20, 40, 30, 0.08)',
      },
    },
  },
  plugins: [],
};
