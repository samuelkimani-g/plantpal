/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-forest-green': '#1B4332',
        'soft-leaf-green': '#95D5B2',
        'muted-earth-brown': '#6B4226',
        'charcoal-gray': '#2E2E2E',
        'cream-white': '#F9FBE7',
        'sage-green': '#B7C9A8',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}