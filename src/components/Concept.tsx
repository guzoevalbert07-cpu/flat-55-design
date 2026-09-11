import type { Option } from '../data/options';

export default function Concept({ opt }: { opt: Option }) {
  return (
    <section className="section" id="concept" aria-labelledby="concept-h">
      <div className="wrap">
        <div className="kicker">Опция · {opt.name}</div>
        <h2 id="concept-h">{opt.style}</h2>
        <p className="lead">{opt.concept}</p>

        <div className="grid grid-2">
          <div className="card">
            <h3>Палитра</h3>
            <div className="swatches">
              {opt.palette.map((s) => (
                <div className="swatch" key={s.name}>
                  <div className="chip" style={{ background: s.hex }} aria-hidden="true" />
                  <div className="n">{s.name}</div>
                  <div className="hex">{s.hex.toUpperCase()}</div>
                  {s.note && <div className="note">{s.note}</div>}
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3>Материалы</h3>
            <div className="materials">
              {opt.materials.map((m) => (
                <div className="material" key={m.name}>
                  <div className="chip" style={{ background: m.hex }} aria-hidden="true">
                    {m.hex2 && <div className="half" style={{ background: m.hex2 }} />}
                  </div>
                  <div className="n">{m.name}</div>
                  <div className="t">{m.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h3>Дизайн-токены опции</h3>
          <ul className="spec-list">
            {opt.spec.map((s) => (
              <li key={s.label}>
                <b>{s.label}</b>
                <span>{s.value}</span>
              </li>
            ))}
            <li>
              <b>Свет</b>
              <span>{opt.light}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
