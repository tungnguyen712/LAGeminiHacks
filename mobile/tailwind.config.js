/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Gemini dark theme
        surface: '#1C1C1E',
        primary: '#8AB4F8',
        'friction-low': '#81C995',
        'friction-medium': '#FA7B17',
        'friction-high': '#F28B82',
      },
    },
  },
  plugins: [],
};
