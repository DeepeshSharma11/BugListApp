module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#6b21a8',
        accent: '#06b6d4'
      },
      backgroundImage: {
        'soft-gradient': 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(6,182,212,0.08))'
      }
    }
  },
  plugins: []
}
