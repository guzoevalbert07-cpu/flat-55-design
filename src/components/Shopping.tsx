import { useMemo, useState } from 'react';
import type { Option } from '../data/options';
import { rub } from '../lib/format';
import type { Estimate } from '../types';

/** Строка листа «Ссылки_по_позициям» (бенчмарк по Саратову). */
export type LinkRow = {
  sheet: string;
  n: number;
  item: string;
  option: string;
  model: string;
  price: number | null;
  smetaPrice: number | null;
  deviationPct: number | null;
  store: string;
  city: string;
  url: string;
  evidence: string;
  checkedAt: string;
  status: string;
  comment: string;
};

type Offer = { model: string; price: string; smeta?: string; deviation?: number | null; store: string; city?: string; url: string; status?: string; note?: string };
type Position = { key: string; sheet: string; n: number; section: string; item: string; unit: string; offers: Offer[]; avito?: Offer };
type Section = { key: string; title: string; group: 'repair' | 'movein'; positions: Position[] };

function storeName(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '');
    if (h.includes('lemanapro')) return 'Лемана ПРО Саратов';
    if (h.includes('hoff')) return 'Hoff Саратов';
    if (h.includes('dns-shop')) return 'DNS Саратов';
    if (h.includes('santehnica')) return 'Сантехника.ру';
    if (h.includes('ozon')) return 'Ozon';
    if (h.includes('avito')) return 'Авито Саратов';
    return h;
  } catch {
    return '';
  }
}
const isAvitoUrl = (u: string) => /avito\.ru/i.test(u);

export default function Shopping({ opt, estimate }: { opt: Option; estimate: Estimate }) {
  const [group, setGroup] = useState<'all' | 'repair' | 'movein'>('all');
  const k = opt.key;
  const links = ((estimate as unknown as { links?: LinkRow[] }).links ?? []) as LinkRow[];
  const bench = links.length > 0;

  const sections = useMemo<Section[]>(() => {
    const order: Position[] = [];
    const byKey = new Map<string, Position>();
    const add = (sheet: string, n: number, section: string, item: string, unit: string) => {
      const key = `${sheet}:${n}`;
      let p = byKey.get(key);
      if (!p) {
        p = { key, sheet, n, section, item, unit, offers: [] };
        byKey.set(key, p);
        order.push(p);
      }
      return p;
    };
    // каркас позиций — из сметы, чтобы порядок и разделы были как в Excel
    estimate.repair.items.forEach((it) => add('1_Ремонт', it.n, it.section, it.item, it.unit));
    estimate.movein.items.forEach((it) => add('2_Заезд', it.n, it.section, it.item, it.unit));

    if (bench) {
      for (const l of links) {
        if (!l.url.startsWith('http')) continue;
        const p = byKey.get(`${l.sheet}:${l.n}`);
        if (!p) continue;
        const offer: Offer = {
          model: l.model || 'уточнить',
          price: l.price == null ? 'уточнить' : l.price === 0 ? 'в этой опции не берём' : rub(l.price),
          smeta: l.smetaPrice == null ? undefined : rub(l.smetaPrice),
          deviation: l.deviationPct,
          store: l.store || storeName(l.url),
          city: l.city,
          url: l.url,
          status: l.status,
          note: l.comment || undefined,
        };
        if (l.option === 'ВСЕ' || isAvitoUrl(l.url)) {
          if (!p.avito) p.avito = offer;
        } else if (l.option === opt.excelCol) {
          p.offers.push(offer);
        }
      }
    } else {
      // Запасной режим: столбец «Где купить» листа 2_Заезд
      for (const it of estimate.movein.items) {
        if (!it.link || !it.link.startsWith('http')) continue;
        const p = byKey.get(`2_Заезд:${it.n}`)!;
        const price = k === 'eco' ? it.priceMin : k === 'std' ? it.priceMid : it.priceMax;
        const note = it.note || '';
        const m = note.match(new RegExp(`(?:^|·\\s*|\\s)(?:[А-Я/]*\\/)?${opt.excelCol}(?:\\/[А-Я]+)?\\s*[:—]\\s*([^·]+?)(?=\\.\\s+[А-ЯA-Z]|\\s*·|$)`));
        p.offers.push({
          model: m ? m[1].trim().replace(/\.$/, '') : 'уточнить',
          note: !m && note ? note : undefined,
          price: price == null ? 'уточнить' : price === 0 ? 'в этой опции не берём' : `≈ ${rub(price)}${it.qty && it.qty > 1 ? ` × ${it.qty}` : ''}`,
          store: storeName(it.link),
          url: it.link,
        });
      }
    }
    const secs: Section[] = [];
    for (const p of order) {
      if (p.offers.length === 0 && !p.avito) continue;
      const title = p.section.replace(/^\d\.\s/, '');
      const g = p.sheet === '1_Ремонт' ? 'repair' : 'movein';
      let s = secs.find((x) => x.key === `${p.sheet}:${title}`);
      if (!s) {
        s = { key: `${p.sheet}:${title}`, title, group: g, positions: [] };
        secs.push(s);
      }
      s.positions.push(p);
    }
    return secs;
  }, [estimate, links, bench, opt, k]);

  const shown = sections.filter((s) => group === 'all' || s.group === group);
  const checked = bench ? links.find((l) => l.checkedAt)?.checkedAt : undefined;
  const total = sections.reduce((a, s) => a + s.positions.length, 0);
  const confirmed = sections.reduce((a, s) => a + s.positions.filter((p) => p.offers.some((o) => o.status === 'ок')).length, 0);

  return (
    <section className="section" id="shopping" aria-labelledby="shop-h">
      <div className="wrap">
        <div className="kicker">Что купить · {opt.name}</div>
        <h2 id="shop-h">Позиция → модель → магазин → ссылка</h2>
        <p className="lead">
          {bench ? (
            <>
              На каждую из {total} позиций сметы — вариант для опции {opt.name} (столбец {opt.excelCol}): цена, которую показал магазин
              {checked ? ` на ${checked}` : ''}, и рядом цена из сметы; у {confirmed} позиций цена подтверждена. Это лист «Ссылки_по_позициям» в Excel; цены в
              самой смете не менялись. «Уточнить» — подтверждённой цены не было, дана ссылка в каталог. Под каждой позицией — готовый поиск на Авито
              Саратов: через Авито можно посмотреть предложения и оптимизировать стоимость относительно сметы. Перед оплатой сверяйте на сайте магазина.
            </>
          ) : (
            <>
              Ремонт — лист «Закупка_ссылки» сметы (строки для {opt.excelCol} и общие). Заезд — столбец «Где купить» листа «2_Заезд». Ссылки ведут в
              каталоги; артикулы и цены сверяйте перед оплатой.
            </>
          )}
        </p>
        <div className="shop-filter" role="group" aria-label="Фильтр">
          <button aria-pressed={group === 'all'} onClick={() => setGroup('all')}>
            Всё ({total})
          </button>
          <button aria-pressed={group === 'repair'} onClick={() => setGroup('repair')}>
            Ремонт ({sections.filter((s) => s.group === 'repair').reduce((a, s) => a + s.positions.length, 0)})
          </button>
          <button aria-pressed={group === 'movein'} onClick={() => setGroup('movein')}>
            Заезд ({sections.filter((s) => s.group === 'movein').reduce((a, s) => a + s.positions.length, 0)})
          </button>
        </div>

        <div className="shop-sections">
          {shown.map((s, si) => (
            <details className="shop-section" key={s.key} open={si === 0}>
              <summary>
                <span className="muted small">{s.group === 'repair' ? 'Ремонт' : 'Заезд'} · </span>
                {s.title}
                <span className="pill" style={{ marginLeft: 8 }}>
                  {s.positions.length} поз.
                </span>
              </summary>
              <div className="shop-list">
                {s.positions.map((p) => (
                  <div className="card shop-pos" key={p.key}>
                    <div className="pos">
                      <span className="muted small">{p.n}. </span>
                      {p.item}
                    </div>
                    {p.offers.map((o, i) => (
                      <div className="offer" key={i}>
                        <div className="offer-main">
                          <div className="model">{o.model}</div>
                          <div className="store">
                            {o.store}
                            {o.city ? ` · ${o.city}` : ''}
                            {o.status && (
                              <span className={`pill${o.status === 'ок' ? ' on' : ''}`} style={{ marginLeft: 6 }}>
                                {o.status === 'ок' ? 'цена подтверждена' : 'уточнить'}
                              </span>
                            )}
                          </div>
                          {o.note && <div className="note muted small">{o.note}</div>}
                        </div>
                        <div className="offer-price">
                          <div className="price">{o.price}</div>
                          {o.smeta && (
                            <div className="muted small">
                              в смете {o.smeta}
                              {o.deviation != null && Math.abs(o.deviation) > 30 ? ` · ${o.deviation > 0 ? '+' : ''}${Math.round(o.deviation)} %` : ''}
                            </div>
                          )}
                          <a className="btn" href={o.url} target="_blank" rel="noopener">
                            Открыть ↗
                          </a>
                        </div>
                      </div>
                    ))}
                    {p.offers.length === 0 && <div className="muted small">уточнить — подтверждённого варианта для этой опции нет</div>}
                    {p.avito && (
                      <div className="avito">
                        <a href={p.avito.url} target="_blank" rel="noopener">
                          Авито Саратов — посмотреть предложения и оптимизировать стоимость ↗
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>

        {bench && (
          <details>
            <summary>Каталоги и прайсы из листа «Закупка_ссылки» ({estimate.shopping.length})</summary>
            <div className="scroll-x">
              <table>
                <thead>
                  <tr>
                    <th>Позиция</th>
                    <th>Опция</th>
                    <th>Что купить</th>
                    <th>Ориентир</th>
                    <th>Магазин</th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.shopping.map((r, i) => (
                    <tr key={i}>
                      <td>{r.position}</td>
                      <td>{r.option}</td>
                      <td>{r.model}</td>
                      <td>{r.price}</td>
                      <td>
                        <a href={r.url} target="_blank" rel="noopener">
                          {r.store}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}

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
