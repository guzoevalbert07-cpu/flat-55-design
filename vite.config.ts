import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages: сайт живёт по адресу https://<user>.github.io/flat-55-design/
export default defineConfig({
  base: '/flat-55-design/',
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    reportCompressedSize: false,
  },
});
