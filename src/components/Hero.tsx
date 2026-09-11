import { LAYOUT, OPTIONS, OPTION_KEYS, type OptionKey } from '../data/options';
import { pick, reservePct, rubK } from '../lib/format';
import type { Estimate } from '../types';

type Props = { current: OptionKey; onSelect: (k: OptionKey) => void; estimate: Estimate };

export default function Hero({ current, onSelect, estimate }: Props) {
  const grand = estimate.totalsByBlock.grand;
  return (
    <header className="hero">
      <div className="wrap">
        <div className="kicker">Дизайн-концепция · {LAYOUT.flat}</div>
        <h1>Дизайн квартиры 55 м² — 3 опции</h1>
        <p className="sub">
          Один план, одна семья с ребёнком — три уровня бюджета. Выберите опцию: палитра, план, развёртки, смета и ссылки на покупку
          перестроятся под неё.
        </p>
        <div className="areas">
          <span>
            Жилая <b>{LAYOUT.areas.living} м²</b>
          </span>
          <span>
            Общая <b>{LAYOUT.areas.total} м²</b>
          </span>
          <span>
            С лоджией <b>{LAYOUT.areas.withLoggia} м²</b>
          </span>
        </div>
        <div className="opt-cards" role="group" aria-label="Выбор опции">
          {OPTION_KEYS.map((k) => {
            const o = OPTIONS[k];
            return (
              <button key={k} className="opt-card" aria-pressed={current === k} onClick={() => onSelect(k)}>
                <span className="name">
                  <span className="dot" style={{ background: o.tokens.accent }} aria-hidden="true" />
                  {o.name}
                </span>
                <span className="style">{o.style}</span>
                <span className="price">
                  ≈ {rubK(pick(grand, k))} <small>ремонт + заезд, с резервом {reservePct(estimate.params)} · ориентир</small>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
