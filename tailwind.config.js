/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#333533',
        'dark-nav': '#242423',
        'dark-sidebar': '#161a1d',
        'light-bg': '#004e98',
        'light-nav': '#3a6ea5',
        'text-primary': '#c0c0c0',
        'text-hover': '#ebebeb',
        'primary-blue': '#004e98',
        'hover-blue': '#006ad2',
        'error-red': '#a4161a',
        'toast-green': '#006400',
      },
    },
  },
  plugins: [],
};