import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages base path: https://slookisen.github.io/Travel-swish/
export default defineConfig({
  base: '/Travel-swish/',
  plugins: [react()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
});
