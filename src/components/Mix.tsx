import { useMemo, useState } from 'react';
import { OPTIONS, OPTION_KEYS, type OptionKey } from '../data/options';
import { reservePct, rub } from '../lib/format';
import type { Estimate } from '../types';

/**
 * Конструктор: по каждому разделу сметы выбираем Эконом / Стандарт / Премиум, сумма пересчитывается,
 * собранный вариант живёт в ссылке `#mix=…` (13 букв E/S/P в порядке разделов), чтобы его можно было переслать.
 */
export const LETTER: Record<OptionKey, string> = { eco: 'E', std: 'S', prem: 'P' };
const FROM_LETTER: Record<string, OptionKey> = { E: 'eco', S: 'std', P: 'prem' };

export type MixSection = { key: string; sheet: '1_Ремонт' | '2_Заезд'; title: string; sums: Record<OptionKey, number>; sumReal: number; count: number };

export function mixSections(estimate: Estimate): MixSection[] {
  const out: MixSection[] = [];
  const add = (sheet: '1_Ремонт' | '2_Заезд', items: Estimate['repair']['items']) => {
    for (const it of items) {
      const title = it.section.replace(/^\d\.\s/, '');
      const key = `${sheet}:${title}`;
      let s = out.find((x) => x.key === key);
      if (!s) {
        s = { key, sheet, title, sums: { eco: 0, std: 0, prem: 0 }, sumReal: 0, count: 0 };
        out.push(s);
      }
      s.sums.eco += it.sumMin;
      s.sums.std += it.sumMid;
      s.sums.prem += it.sumMax;
      s.sumReal += it.sumReal;
      s.count += 1;
    }
  };
  add('1_Ремонт', estimate.repair.items);
  add('2_Заезд', estimate.movein.items);
  return out;
}

export function parseMix(hash: string, n: number): OptionKey[] | null {
  const m = hash.match(/^#?mix=([ESP]+)$/i);
  if (!m || m[1].length !== n) return null;
  return m[1].toUpperCase().split('').map((c) => FROM_LETTER[c]);
}

export function majority(keys: OptionKey[]): OptionKey {
  const c: Record<OptionKey, number> = { eco: 0, std: 0, prem: 0 };
  keys.forEach((k) => (c[k] += 1));
  return (Object.keys(c) as OptionKey[]).sort((a, b) => c[b] - c[a])[0];
}

type Props = { estimate: Estimate; current: OptionKey; mix: OptionKey[] | null; onMix: (m: OptionKey[] | null) => void };

export default function Mix({ estimate, current, mix, onMix }: Props) {
  const sections = useMemo(() => mixSections(estimate), [estimate]);
  const choice = mix ?? sections.map(() => current);
  const reserve = reservePct(estimate.params);
  const reserveNum = parseFloat(reserve) / 100;
  const [copied, setCopied] = useState(false);

  const total = (keys: OptionKey[]) => sections.reduce((a, s, i) => a + s.sums[keys[i]], 0);
  const withReserve = (n: number) => Math.round(n * (1 + reserveNum));
  const mine = total(choice);
  const presets = OPTION_KEYS.map((k) => ({ k, sum: total(sections.map(() => k)) }));
  const realSum = sections.reduce((a, s) => a + s.sumReal, 0);
  const isCustom = mix != null && new Set(mix).size > 1;

  const set = (i: number, k: OptionKey) => {
    const next = [...choice];
    next[i] = k;
    onMix(next);
  };
  const share = async () => {
    const url = `${location.origin}${location.pathname}#mix=${choice.map((k) => LETTER[k]).join('')}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Скопируйте ссылку на ваш вариант:', url);
    }
  };

  return (
    <section className="section" id="mix" aria-labelledby="mix-h">
      <div className="wrap">
        <div className="kicker">Конструктор · соберите свой вариант</div>
        <h2 id="mix-h">Свой вариант: по каждому разделу — Эконом, Стандарт или Премиум</h2>
        <p className="lead">
          Суммы разделов — из листов «1_Ремонт» и «2_Заезд» сметы. Выберите уровень по каждому разделу, итог пересчитается; кнопка «Ссылка на этот
          вариант» кладёт в буфер адрес, по которому откроется именно ваша сборка.
        </p>

        <div className="mix-presets" role="group" aria-label="Готовые наборы">
          {presets.map((p) => (
            <button key={p.k} aria-pressed={!isCustom && choice.every((c) => c === p.k)} onClick={() => onMix(sections.map(() => p.k))}>
              Всё {OPTIONS[p.k].name} · {rub(withReserve(p.sum))}
            </button>
          ))}
        </div>

        <div className="card mix-total">
          <div>
            <div className="l">Ваш вариант, с резервом {reserve}</div>
            <div className="v">{rub(withReserve(mine))}</div>
            <div className="s">
              без резерва {rub(mine)} · ремонт {rub(sections.filter((s) => s.sheet === '1_Ремонт').reduce((a, s, i) => a + s.sums[choice[sections.indexOf(s)] ?? current] * (i >= 0 ? 1 : 1), 0))} · заезд{' '}
              {rub(sections.filter((s) => s.sheet === '2_Заезд').reduce((a, s) => a + s.sums[choice[sections.indexOf(s)]], 0))}
            </div>
            <div className="s muted">Для сравнения: столбец «РЕАЛ (сборка)» в смете — {rub(withReserve(realSum))}.</div>
          </div>
          <button className="btn-share" onClick={share} aria-live="polite">
            {copied ? 'Ссылка скопирована ✓' : 'Ссылка на этот вариант'}
          </button>
        </div>

        <div className="mix-grid">
          {(['1_Ремонт', '2_Заезд'] as const).map((sheet) => (
            <div className="card" key={sheet}>
              <h3>{sheet === '1_Ремонт' ? 'Ремонт' : 'Заезд'}</h3>
              <div className="mix-rows">
                {sections.map((s, i) =>
                  s.sheet !== sheet ? null : (
                    <div className="mix-row" key={s.key}>
                      <div className="mix-name">
                        {s.title}
                        <span className="muted small"> · {s.count} поз.</span>
                      </div>
                      <div className="seg mix-seg" role="group" aria-label={`Уровень для раздела ${s.title}`}>
                        {OPTION_KEYS.map((k) => (
                          <button key={k} aria-pressed={choice[i] === k} onClick={() => set(i, k)}>
                            {OPTIONS[k].name}
                            <span className="p">{s.sums[k] === 0 ? 'не берём' : rub(s.sums[k])}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>
          Палитра, план и развёртки выше показаны для опции {OPTIONS[current].name}
          {isCustom ? ' (преобладает в вашей сборке)' : ''}; переключатель опций сверху меняет визуал, конструктор — только деньги.
        </p>
      </div>
    </section>
  );
}
