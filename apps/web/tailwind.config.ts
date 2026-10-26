import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Bleu du logo JESA : valeurs dans globals.css (variables, plus lumineuses en thème sombre)
        jesa: {
          DEFAULT: 'rgb(var(--jesa) / <alpha-value>)',
          light: 'rgb(var(--jesa-light) / <alpha-value>)',
          dark: 'rgb(var(--jesa-dark) / <alpha-value>)',
        },
        navy: { DEFAULT: '#0A1730', light: '#13254A', dark: '#050B1A' },
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' } },
        rise: { from: { opacity: '0', transform: 'translateY(12px)' } },
        pop: { from: { opacity: '0', transform: 'scale(0.95) translateY(-4px)' } },
        bar: { from: { transform: 'scaleX(0)' } },
        'fade-out': { to: { opacity: '0' } },
        'pop-out': { to: { opacity: '0', transform: 'scale(0.96) translateY(-4px)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out backwards',
        rise: 'rise 0.35s cubic-bezier(0.22, 1, 0.36, 1) backwards',
        pop: 'pop 0.22s cubic-bezier(0.22, 1, 0.36, 1) backwards',
        bar: 'bar 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.15s backwards',
        'fade-out': 'fade-out 0.16s ease-in forwards',
        'pop-out': 'pop-out 0.16s ease-in forwards',
      },
    },
  },
  plugins: [],
};

export default config;
