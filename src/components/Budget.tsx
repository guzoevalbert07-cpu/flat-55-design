import type { Option } from '../data/options';
import { baseArea, pick, reservePct, rub } from '../lib/format';
import type { Estimate } from '../types';

function sumLabel(label: string) {
  return label
    .replace(/^\d\.\s/, '')
    .replace(' — материалы (пол, потолок, сантехника, электрика, обои, двери)', ' — материалы')
    .replace(' — закупка (кухня, мебель, техника, текстиль)', ' — закупка')
    .replace(' — работы (сборка, подключение, доставка)', ' — работы');
}

export default function Budget({ opt, estimate }: { opt: Option; estimate: Estimate }) {
  const k = opt.key;
  const tb = estimate.totalsByBlock;
  const reserve = reservePct(estimate.params);
  const area = baseArea(estimate.params);
  const realNote = estimate.summaryNotes.find((s) => s.startsWith('РЕАЛ (сборка)'));
  const summaryRows = estimate.summary.filter((r) => /^(1\.|2\.)/.test(r.label));
  const repairSections = estimate.repair.totals.filter((t) => /^\d\.\s/.test(t.label));
  const repairTail = estimate.repair.totals.filter((t) => /^(ВСЕГО БЕЗ РЕЗЕРВА|Резерв|ИТОГО С РЕЗЕРВОМ)/.test(t.label));
  const moveinSections = estimate.movein.totals.filter((t) => /^[А-Я]\.\s/.test(t.label));
  const moveinTail = estimate.movein.totals.filter((t) => /^(ВСЕГО БЕЗ РЕЗЕРВА|Резерв|ИТОГО С РЕЗЕРВОМ)/.test(t.label));

  const items = (list: (Estimate['repair']['items'][number] & { link?: string })[]) => (
    <table>
      <thead>
        <tr>
          <th>Позиция</th>
          <th className="num">Кол-во</th>
          <th className="num">Сумма</th>
        </tr>
      </thead>
      <tbody>
        {list.map((it) => {
          const sum = k === 'eco' ? it.sumMin : k === 'std' ? it.sumMid : it.sumMax;
          return (
            <tr key={it.n}>
              <td>
                <span className="muted small">{it.section} · </span>
                {it.item}
              </td>
              <td className="num">
                {it.qty ?? '—'} {it.unit}
              </td>
              <td className="num">{sum === 0 ? <span className="muted">{it.note || 'не берём'}</span> : rub(sum)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <section className="section" id="budget" aria-labelledby="budget-h">
      <div className="wrap">
        <div className="kicker">Бюджет · {opt.name} (столбец {opt.excelCol} в смете)</div>
        <h2 id="budget-h">Сколько нужно денег</h2>
        <p className="lead">
          Цифры — из листа «3_Саммари» сметы, с резервом {reserve} на непредвиденное; цены — ориентир по каталогам, итог показан как в
          смете. Ремонт — это материалы и работы до чистовой квартиры; заезд — кухня, мебель, техника и их сборка.
        </p>

        <div className="kpi">
          <div className="card">
            <div className="l">Ремонт</div>
            <div className="v">{rub(pick(tb.repair, k))}</div>
            <div className="s">пол, потолок, сантехника, электрика, обои, двери + работы</div>
          </div>
          <div className="card">
            <div className="l">Заезд</div>
            <div className="v">{rub(pick(tb.movein, k))}</div>
            <div className="s">кухня, мебель, техника + сборка и доставка</div>
          </div>
          <div className="card total">
            <div className="l">Итого</div>
            <div className="v">{rub(pick(tb.grand, k))}</div>
            <div className="s">
              ремонт + заезд, с резервом {reserve} · {rub(pick(tb.perM2, k))} на 1 м²{area ? ` (база ${area} м² с лоджией)` : ''}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <h3>Сводка по блокам (лист 3_Саммари)</h3>
          <div className="scroll-x">
            <table>
              <thead>
                <tr>
                  <th>Блок</th>
                  <th className="num">Эконом</th>
                  <th className="num">Стандарт</th>
                  <th className="num">Премиум</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((r) => (
                  <tr key={r.label} className={/ИТОГО/.test(r.label) ? 'total' : 'sub'}>
                    <td>{sumLabel(r.label)}</td>
                    <td className="num">{rub(r.min)}</td>
                    <td className="num">{rub(r.mid)}</td>
                    <td className="num">{rub(r.max)}</td>
                  </tr>
                ))}
                <tr className="total">
                  <td>Общий итог: ремонт + заезд</td>
                  <td className="num">{rub(tb.grand.min)}</td>
                  <td className="num">{rub(tb.grand.mid)}</td>
                  <td className="num">{rub(tb.grand.max)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>
            Столбец «РЕАЛ (сборка)» в смете — {rub(tb.grand.real)}. {realNote ?? ''}
          </p>
        </div>

        <div className="budget-tables">
          <div className="card">
            <h3>Ремонт по разделам — {opt.name}</h3>
            <table>
              <tbody>
                {repairSections.map((t) => (
                  <tr key={t.label}>
                    <td>{t.label.replace(/^\d\.\s/, '')}</td>
                    <td className="num">{rub(pick(t, k))}</td>
                  </tr>
                ))}
                {repairTail.map((t) => (
                  <tr key={t.label} className={/ИТОГО/.test(t.label) ? 'total' : 'sub'}>
                    <td>{t.label}</td>
                    <td className="num">{rub(pick(t, k))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <details>
              <summary>Все {estimate.repair.items.length} позиций ремонта</summary>
              {items(estimate.repair.items)}
            </details>
          </div>
          <div className="card">
            <h3>Заезд по разделам — {opt.name}</h3>
            <table>
              <tbody>
                {moveinSections.map((t) => (
                  <tr key={t.label}>
                    <td>{t.label.replace(/^[А-Я]\.\s/, '')}</td>
                    <td className="num">{rub(pick(t, k))}</td>
                  </tr>
                ))}
                {moveinTail.map((t) => (
                  <tr key={t.label} className={/ИТОГО/.test(t.label) ? 'total' : 'sub'}>
                    <td>{t.label}</td>
                    <td className="num">{rub(pick(t, k))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <details>
              <summary>Все {estimate.movein.items.length} позиций заезда</summary>
              {items(estimate.movein.items)}
            </details>
          </div>
        </div>
      </div>
    </section>
  );
}
