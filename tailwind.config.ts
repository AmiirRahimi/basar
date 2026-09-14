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
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/container-queries')],
};

export default config;
