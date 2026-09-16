import type { Config } from 'tailwindcss';
import telcUiPreset from './src/ui/tailwind-preset';

const config: Config = {
  presets: [telcUiPreset as Config],
  content: ['./src/**/*.{js,ts,jsx,tsx}', './node_modules/rizzui/dist/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    screens: {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
      '4xl': '2560px',
    },
    extend: {
      colors: {
        shop: {
          ink: 'rgb(var(--shop-ink) / <alpha-value>)',
          mill: 'rgb(var(--shop-mill) / <alpha-value>)',
          saffron: 'rgb(var(--shop-saffron) / <alpha-value>)',
          bone: 'rgb(var(--shop-bone) / <alpha-value>)',
          paper: 'rgb(var(--shop-paper) / <alpha-value>)',
          madder: 'rgb(var(--shop-madder) / <alpha-value>)',
          line: 'rgb(var(--shop-line) / <alpha-value>)',
        },
      },
      keyframes: {
        'shop-kenburns': {
          '0%': { transform: 'scale(1) translate(0, 0)' },
          '100%': { transform: 'scale(1.08) translate(-1.5%, 1%)' },
        },
      },
      animation: {
        'shop-kenburns': 'shop-kenburns 22s ease-out forwards',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/container-queries')],
};

export default config;
