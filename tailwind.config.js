/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        green: {
          primary: '#1a5c2e',
          dark: '#134522',
          light: '#236b38',
          muted: '#2d7a42',
        },
      },
    },
  },
  plugins: [],
}
