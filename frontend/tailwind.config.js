/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          green: '#00A854',
          darkGreen: '#008744',
          lightGreen: '#E8F5E9',
          paleGreen: '#F0F9F4',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          sidebar: '#FFFFFF',
          hover: '#F9FAFB',
          input: '#F4F6F5',
          border: '#E5E7EB',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
