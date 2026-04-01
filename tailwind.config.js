/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Inter Tight"', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#38bdf8',
        accent: '#f97316',
        night: '#0b1221',
        mist: '#0f172a',
      },
      boxShadow: {
        soft: '0 15px 60px rgba(0,0,0,0.25)',
      },
      backgroundImage: {
        'grid-radial':
          'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
}
