import { useMemo, useState } from 'react';
import type { Option } from '../data/options';
import { rub } from '../lib/format';
import type { Estimate } from '../types';

type Row = { position: string; model: string; note?: string; store: string; url: string; price: string; group: 'repair' | 'movein'; option: string };

function storeName(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '');
    if (h.includes('lemanapro')) return 'Лемана ПРО Саратов';
    if (h.includes('hoff')) return 'Hoff Саратов';
    if (h.includes('dns-shop')) return 'DNS Саратов';
    if (h.includes('santehnica')) return 'Сантехника.ру';
    if (h.includes('ozon')) return 'Ozon';
    return h;
  } catch {
    return '';
  }
}

export default function Shopping({ opt, estimate }: { opt: Option; estimate: Estimate }) {
  const [group, setGroup] = useState<'all' | 'repair' | 'movein'>('all');
  const k = opt.key;

  const rows = useMemo<Row[]>(() => {
    const repair: Row[] = estimate.shopping
      .filter((r) => r.option === opt.excelCol || r.option === 'ВСЕ' || r.option.split('/').includes(opt.excelCol))
      .map((r) => ({ ...r, group: 'repair' as const }));
    const movein: Row[] = estimate.movein.items
      .filter((it) => it.link && it.link.startsWith('http'))
      .map((it) => {
        const price = k === 'eco' ? it.priceMin : k === 'std' ? it.priceMid : it.priceMax;
        const note = it.note || '';
        const hasOptions = /(МИН|СРЕД|МАКС)\s*[:—]/.test(note);
        const m = note.match(new RegExp(`${opt.excelCol}[:—]\\s*([^·]+)`));
        const model = m ? m[1].trim() : hasOptions ? 'в этой опции — см. смету' : 'модель подобрать в каталоге по ссылке';
        return {
          position: it.item,
          model,
          note: hasOptions ? undefined : note || undefined,
          store: storeName(it.link!),
          url: it.link!,
          price: price == null ? 'уточнить' : price === 0 ? 'в этой опции не берём' : `≈ ${rub(price)}${it.qty && it.qty > 1 ? ` × ${it.qty}` : ''}`,
          group: 'movein' as const,
          option: opt.excelCol,
        };
      });
    return [...repair, ...movein];
  }, [estimate, opt, k]);

  const shown = rows.filter((r) => group === 'all' || r.group === group);

  return (
    <section className="section" id="shopping" aria-labelledby="shop-h">
      <div className="wrap">
        <div className="kicker">Что купить · {opt.name}</div>
        <h2 id="shop-h">Позиция → модель → магазин → ссылка</h2>
        <p className="lead">
          Ремонт — лист «Закупка_ссылки» сметы (строки для {opt.excelCol} и общие). Заезд — столбец «Где купить» листа «2_Заезд». Ссылки ведут
          в каталоги; артикулы и цены сверяйте перед оплатой.
        </p>
        <div className="shop-filter" role="group" aria-label="Фильтр">
          <button aria-pressed={group === 'all'} onClick={() => setGroup('all')}>
            Всё ({rows.length})
          </button>
          <button aria-pressed={group === 'repair'} onClick={() => setGroup('repair')}>
            Ремонт ({rows.filter((r) => r.group === 'repair').length})
          </button>
          <button aria-pressed={group === 'movein'} onClick={() => setGroup('movein')}>
            Заезд ({rows.filter((r) => r.group === 'movein').length})
          </button>
        </div>
        <div className="shop-list">
          {shown.map((r, i) => (
            <div className="card shop-item" key={`${r.group}-${r.position}-${i}`}>
              <div className="pos">{r.position}</div>
              <div className="price">{r.price}</div>
              <div className="model">
                {r.model}
                {r.note && <span className="muted"> · {r.note}</span>}
              </div>
              <div className="store">{r.store}</div>
              <a className="btn" href={r.url} target="_blank" rel="noopener">
                Открыть ссылку ↗
              </a>
            </div>
          ))}
        </div>

        <details>
          <summary>Расценки на работы и где искать мастеров (лист «Работы_подрядчики»)</summary>
          <div className="scroll-x">
            <table>
              <thead>
                <tr>
                  <th>Вид работ</th>
                  <th>Ориентир цены</th>
                  <th>Где искать</th>
                  <th>Что проверить у мастера</th>
                </tr>
              </thead>
              <tbody>
                {estimate.contractors.map((c) => (
                  <tr key={c.work}>
                    <td>{c.work}</td>
                    <td>{c.price}</td>
                    <td>
                      <a href={c.url} target="_blank" rel="noopener">
                        {c.where}
                      </a>
                    </td>
                    <td>{c.check}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}
