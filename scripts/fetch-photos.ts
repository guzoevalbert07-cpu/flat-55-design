/**
 * Фотореференсы (ТЗ §4.5): 3–4 бесплатных стоковых фото на опцию через Unsplash API или Pexels API.
 * Ключ — только из .env (UNSPLASH_ACCESS_KEY или PEXELS_API_KEY). Без ключа: секция на сайте скрыта,
 * src/data/photos.json не трогается.
 * Запуск: npm run photos
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT_JSON = join(ROOT, 'src', 'data', 'photos.json');
const OUT_DIR = join(ROOT, 'public', 'photos');

// .env без зависимостей
const envPath = join(ROOT, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
const UNSPLASH = process.env.UNSPLASH_ACCESS_KEY;
const PEXELS = process.env.PEXELS_API_KEY;

const QUERIES: Record<'eco' | 'std' | 'prem', string[]> = {
  eco: ['scandinavian white kitchen oak floor', 'scandinavian bedroom light wood minimal', 'white kids room desk window', 'small bathroom white tiles shower'],
  std: ['warm minimalist greige living room', 'cashmere kitchen cabinets graphite', 'beige bedroom upholstered headboard sconces', 'walk-in shower glass minimal bathroom'],
  prem: ['japandi walnut brass interior', 'japandi kitchen quartz countertop walnut', 'japandi bedroom linen full wall headboard', 'bathroom brass fixtures beige stone'],
};

type Photo = {
  option: 'eco' | 'std' | 'prem';
  src: string;
  width: number;
  height: number;
  alt: string;
  author: string;
  authorUrl: string;
  source: string;
  sourceUrl: string;
  query: string;
};

if (!UNSPLASH && !PEXELS) {
  if (!existsSync(OUT_JSON)) writeFileSync(OUT_JSON, '[]\n');
  console.log('ℹ️  Нет ключа UNSPLASH_ACCESS_KEY / PEXELS_API_KEY в .env — фотореференсы пропущены, секция на сайте скрыта.');
  process.exit(0);
}

async function download(url: string, file: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}

async function unsplash(q: string): Promise<Omit<Photo, 'option' | 'query' | 'src'> & { dl: string }> {
  const r = await fetch(`https://api.unsplash.com/search/photos?per_page=1&orientation=landscape&content_filter=high&query=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Client-ID ${UNSPLASH}` },
  });
  if (!r.ok) throw new Error(`Unsplash ${r.status}`);
  const j = (await r.json()) as { results: { urls: { regular: string }; width: number; height: number; alt_description: string | null; user: { name: string; links: { html: string } }; links: { html: string; download_location: string } }[] };
  const p = j.results[0];
  if (!p) throw new Error(`Unsplash: ничего не найдено по «${q}»`);
  // правило Unsplash API: триггер download_location
  await fetch(p.links.download_location, { headers: { Authorization: `Client-ID ${UNSPLASH}` } }).catch(() => undefined);
  return {
    dl: `${p.urls.regular}&w=1200&q=80&fm=jpg`,
    width: 1200,
    height: Math.round((1200 * p.height) / p.width),
    alt: p.alt_description || q,
    author: p.user.name,
    authorUrl: `${p.user.links.html}?utm_source=flat-55-design&utm_medium=referral`,
    source: 'Unsplash',
    sourceUrl: `${p.links.html}?utm_source=flat-55-design&utm_medium=referral`,
  };
}

async function pexels(q: string): Promise<Omit<Photo, 'option' | 'query' | 'src'> & { dl: string }> {
  const r = await fetch(`https://api.pexels.com/v1/search?per_page=1&orientation=landscape&query=${encodeURIComponent(q)}`, {
    headers: { Authorization: PEXELS! },
  });
  if (!r.ok) throw new Error(`Pexels ${r.status}`);
  const j = (await r.json()) as { photos: { src: { large: string }; width: number; height: number; alt: string; photographer: string; photographer_url: string; url: string }[] };
  const p = j.photos[0];
  if (!p) throw new Error(`Pexels: ничего не найдено по «${q}»`);
  return {
    dl: p.src.large,
    width: 940,
    height: Math.round((940 * p.height) / p.width),
    alt: p.alt || q,
    author: p.photographer,
    authorUrl: p.photographer_url,
    source: 'Pexels',
    sourceUrl: p.url,
  };
}

mkdirSync(OUT_DIR, { recursive: true });
const photos: Photo[] = [];
for (const option of ['eco', 'std', 'prem'] as const) {
  let i = 0;
  for (const q of QUERIES[option]) {
    try {
      const p = UNSPLASH ? await unsplash(q) : await pexels(q);
      const file = `photos/${option}-${++i}.jpg`;
      await download(p.dl, join(ROOT, 'public', file));
      const { dl: _dl, ...rest } = p;
      photos.push({ option, query: q, src: file, ...rest });
      console.log(`✅ ${option} ${i}: ${q} — ${p.author} (${p.source})`);
    } catch (e) {
      console.warn(`⚠️  ${option}: «${q}» — ${(e as Error).message}`);
    }
  }
}
writeFileSync(OUT_JSON, JSON.stringify(photos, null, 2) + '\n');
console.log(`Записано ${photos.length} фото → src/data/photos.json`);
