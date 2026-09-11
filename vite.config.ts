import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

/** og:description собирается из estimate.json, чтобы при пересчёте Excel превью ссылки не протухало. */
function ogFromEstimate() {
  const e = JSON.parse(readFileSync(new URL('./src/data/estimate.json', import.meta.url), 'utf8'));
  const g = e.totalsByBlock.grand as { min: number; mid: number; max: number };
  const f = (n: number) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн ₽` : `${Math.round(n / 1000)} тыс. ₽`);
  const desc = `Эконом ≈ ${f(g.min)} · Стандарт ≈ ${f(g.mid)} · Премиум ≈ ${f(g.max)}. План, развёртки, бюджет, где купить — Саратов.`;
  return {
    name: 'og-from-estimate',
    transformIndexHtml(html: string) {
      return html.replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${desc}" />`);
    },
  };
}

// GitHub Pages: сайт живёт по адресу https://<user>.github.io/flat-55-design/
export default defineConfig({
  base: '/flat-55-design/',
  plugins: [react(), ogFromEstimate()],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    reportCompressedSize: false,
  },
});
