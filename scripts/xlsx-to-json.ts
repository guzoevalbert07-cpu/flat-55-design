/**
 * Читает input/Смета_*.xlsx и пишет src/data/estimate.json.
 * Листы: Параметры, 1_Ремонт, 2_Заезд, 3_Саммари, Планировка, Закупка_ссылки,
 * Работы_подрядчики, Видео_и_порядок.
 * Числа берутся из кэшированных значений формул (файл должен быть сохранён Excel/LibreOffice).
 * Запуск: npm run data
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as XLSX from 'xlsx';

const ROOT = resolve(import.meta.dirname, '..');
const INPUT = join(ROOT, 'input');
const OUT = join(ROOT, 'src', 'data', 'estimate.json');

const file = readdirSync(INPUT).find((f) => /^Смета_.*\.xlsx$/i.test(f) && !f.startsWith('~$'));
if (!file) {
  console.error('❌ В input/ нет файла Смета_*.xlsx');
  process.exit(1);
}
const wb = XLSX.read(readFileSync(join(INPUT, file)), { type: 'buffer' });

type Row = unknown[];
function sheet(name: string): Row[] {
  const ws = wb.Sheets[name];
  if (!ws) {
    console.error(`❌ Нет листа «${name}»`);
    process.exit(1);
  }
  return XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: true, defval: null });
}
const s = (v: unknown) => (v == null ? '' : String(v).trim());
const n = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const must = (v: unknown, where: string): number => {
  const x = n(v);
  if (x == null) {
    console.error(`❌ Нет числа в ${where}. Откройте xlsx в Excel/LibreOffice, пересчитайте и сохраните.`);
    process.exit(1);
  }
  return x;
};

/* ---------- Параметры ---------- */
const params = sheet('Параметры')
  .filter((r) => s(r[0]) && r[1] != null && s(r[0]) !== 'Параметр')
  .map((r) => ({ name: s(r[0]), value: r[1] as number | string, note: s(r[2]) }));

/* ---------- Смета: общий парсер ---------- */
type Item = {
  n: number;
  section: string;
  item: string;
  unit: string;
  qty: number | null;
  priceMin: number | null;
  sumMin: number;
  priceMid: number | null;
  sumMid: number;
  priceMax: number | null;
  sumMax: number;
  note: string;
  link?: string;
  realChoice: string;
  sumReal: number;
};
type Total = { label: string; min: number; mid: number; max: number; real: number };

function parseEstimate(name: string, hasLink: boolean) {
  const rows = sheet(name);
  const items: Item[] = [];
  const sections: string[] = [];
  const totals: Total[] = [];
  let inTotals = false;
  for (const r of rows) {
    const a = r[0];
    if (s(r[2]) === 'ИТОГИ ПО РАЗДЕЛАМ') {
      inTotals = true;
      continue;
    }
    if (inTotals) {
      if (s(r[2]) && n(r[6]) != null) {
        const realCol = hasLink ? 14 : 13;
        totals.push({
          label: s(r[2]),
          min: must(r[6], `${name}:${s(r[2])} МИН`),
          mid: must(r[8], `${name}:${s(r[2])} СРЕД`),
          max: must(r[10], `${name}:${s(r[2])} МАКС`),
          real: must(r[realCol], `${name}:${s(r[2])} РЕАЛ`),
        });
      }
      continue;
    }
    if (typeof a === 'number' && s(r[2])) {
      const realCol = hasLink ? 13 : 12;
      items.push({
        n: a,
        section: s(r[1]),
        item: s(r[2]),
        unit: s(r[3]),
        qty: n(r[4]),
        priceMin: n(r[5]),
        sumMin: must(r[6], `${name} строка ${a} МИН`),
        priceMid: n(r[7]),
        sumMid: must(r[8], `${name} строка ${a} СРЕД`),
        priceMax: n(r[9]),
        sumMax: must(r[10], `${name} строка ${a} МАКС`),
        note: s(r[11]),
        ...(hasLink ? { link: s(r[12]) } : {}),
        realChoice: s(r[realCol]),
        sumReal: must(r[realCol + 1], `${name} строка ${a} РЕАЛ`),
      });
    } else if (typeof a === 'string' && /^([0-9]+\.|[А-ЯЁ]\.)\s/.test(a) && !s(r[2]) && a.length < 60) {
      sections.push(a.trim());
    }
  }
  return { items, sections, totals };
}

const repair = parseEstimate('1_Ремонт', false);
const movein = parseEstimate('2_Заезд', true);

/* ---------- 3_Саммари ---------- */
const summaryRows = sheet('3_Саммари');
const summary: Total[] = [];
let summaryNotes: string[] = [];
for (const r of summaryRows) {
  const label = s(r[0]);
  if (!label || label === 'Блок') continue;
  if (n(r[1]) != null) {
    summary.push({
      label,
      min: must(r[1], `3_Саммари:${label} МИН`),
      mid: must(r[2], `3_Саммари:${label} СРЕД`),
      max: must(r[3], `3_Саммари:${label} МАКС`),
      real: must(r[4], `3_Саммари:${label} РЕАЛ`),
    });
  } else if (!/^\d\.\s/.test(label) && r[1] == null) {
    summaryNotes.push(label);
  }
}
summaryNotes = summaryNotes.filter((t) => !t.startsWith('3. САММАРИ'));
const find = (re: RegExp) => {
  const t = summary.find((x) => re.test(x.label));
  if (!t) {
    console.error(`❌ В 3_Саммари не найдена строка ${re}`);
    process.exit(1);
  }
  return t;
};
const totalsByBlock = {
  repair: find(/^1\. РЕМОНТ — ИТОГО/),
  movein: find(/^2\. ЗАЕЗД — ИТОГО/),
  grand: find(/^ОБЩИЙ ИТОГ/),
  perM2: find(/^На 1 м²/),
};

/* ---------- Планировка ---------- */
const layout = sheet('Планировка')
  .filter((r) => s(r[0]) && n(r[1]) != null && s(r[0]) !== 'Помещение')
  .map((r) => ({
    room: s(r[0]),
    plan: n(r[1]),
    after: n(r[2]),
    purpose: s(r[3]),
    change: s(r[4]),
  }));
const layoutNotes = sheet('Планировка')
  .map((r) => s(r[0]))
  .filter((t) => t.startsWith('Заметка брата') || t.startsWith('Выведенные величины'));

/* ---------- Закупка_ссылки ---------- */
const shopping = sheet('Закупка_ссылки')
  .filter((r) => s(r[0]) && s(r[0]) !== 'Позиция' && s(r[5]).startsWith('http'))
  .map((r) => ({
    position: s(r[0]),
    option: s(r[1]),
    model: s(r[2]),
    price: s(r[3]),
    store: s(r[4]),
    url: s(r[5]),
  }));

/* ---------- Работы_подрядчики ---------- */
const contractors = sheet('Работы_подрядчики')
  .filter((r) => s(r[0]) && s(r[0]) !== 'Вид работ' && s(r[3]).startsWith('http'))
  .map((r) => ({ work: s(r[0]), price: s(r[1]), where: s(r[2]), url: s(r[3]), check: s(r[4]) }));

/* ---------- Видео_и_порядок ---------- */
const order = sheet('Видео_и_порядок').map((r) => s(r[0]));
const workOrder = order.filter((t) => /^\d\.\s/.test(t));
const ceilingPrep = order.filter((t) => t.startsWith('— '));
const videoRows = sheet('Видео_и_порядок')
  .filter((r) => s(r[0]) && s(r[3]) && s(r[0]) !== 'Зона')
  .map((r) => ({ zone: s(r[0]), state: s(r[1]), todo: s(r[2]), stage: s(r[3]) }));

const out = {
  meta: {
    source: file,
    generatedAt: new Date().toISOString(),
    priceNote: params.length ? s(sheet('Параметры').map((r) => s(r[0])).find((t) => t.startsWith('Цены — '))) : '',
  },
  params,
  summary,
  summaryNotes,
  totalsByBlock,
  repair,
  movein,
  layout,
  layoutNotes,
  shopping,
  contractors,
  workOrder,
  ceilingPrep,
  videoRows,
};

mkdirSync(resolve(OUT, '..'), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');

const g = totalsByBlock.grand;
console.log(`✅ ${file} → src/data/estimate.json`);
console.log(`   Ремонт: ${repair.items.length} позиций, Заезд: ${movein.items.length}, Закупка: ${shopping.length} ссылок`);
console.log(`   ИТОГО с резервом: МИН ${g.min} · СРЕД ${g.mid} · МАКС ${g.max} · РЕАЛ ${g.real}`);
