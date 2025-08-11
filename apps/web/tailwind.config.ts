import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0a84ff',
          bg: '#111111',
          surface: '#1c1c1e',
        },
      },
    },
  },
  darkMode: 'media',
  plugins: [],
} satisfies Config;


