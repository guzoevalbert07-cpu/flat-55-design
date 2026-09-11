import type { Option } from '../data/options';
import { LAYOUT } from '../data/options';
import type { Estimate } from '../types';

/**
 * План с расстановкой (ТЗ §4.3). Масштаб условный: 1 м = 60 px, площади — из плана и правок брата.
 * Координаты в метрах, начало — левый верхний угол.
 */
const S = 60;
const OX = 22;
const OY = 22;
const px = (m: number) => OX + m * S;
const py = (m: number) => OY + m * S;

const INK = '#1d1d1b';
const TILE = '#e9e7e2';
const GLASS = '#6aa9d8';
const REMOVED = '#c0392b';

type RectProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke?: string;
  rx?: number;
  label?: string;
  sub?: string;
  fs?: number;
  color?: string;
  opacity?: number;
};
function Box({ x, y, w, h, fill, stroke = 'rgba(0,0,0,0.35)', rx = 2, label, sub, fs = 9, color = INK, opacity = 1 }: RectProps) {
  const cx = px(x) + (w * S) / 2;
  const cy = py(y) + (h * S) / 2;
  return (
    <g opacity={opacity}>
      <rect x={px(x)} y={py(y)} width={w * S} height={h * S} fill={fill} stroke={stroke} strokeWidth={1} rx={rx} />
      {label && (
        <text x={cx} y={sub ? cy - 1 : cy + fs / 3} textAnchor="middle" fontSize={fs} fontWeight={700} fill={color}>
          {label}
        </text>
      )}
      {sub && (
        <text x={cx} y={cy + fs + 1} textAnchor="middle" fontSize={fs - 1} fill={color} opacity={0.85}>
          {sub}
        </text>
      )}
    </g>
  );
}

function Wall({ x1, y1, x2, y2, w = 5 }: { x1: number; y1: number; x2: number; y2: number; w?: number }) {
  return <line x1={px(x1)} y1={py(y1)} x2={px(x2)} y2={py(y2)} stroke={INK} strokeWidth={w} strokeLinecap="square" />;
}

function Window({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={px(x1)} y1={py(y1)} x2={px(x2)} y2={py(y2)} stroke={GLASS} strokeWidth={6} strokeLinecap="butt" />;
}

/** Дверь: проём (стирает стену) + полотно + дуга открывания. dir: направление открывания. */
function Door({ x, y, w, vertical, dir }: { x: number; y: number; w: number; vertical: boolean; dir: 'l' | 'r' | 'u' | 'd' }) {
  const gap = vertical ? (
    <line x1={px(x)} y1={py(y)} x2={px(x)} y2={py(y + w)} stroke="#fff" strokeWidth={7} />
  ) : (
    <line x1={px(x)} y1={py(y)} x2={px(x + w)} y2={py(y)} stroke="#fff" strokeWidth={7} />
  );
  const r = w * S;
  let leaf, arc;
  if (vertical) {
    const sx = dir === 'r' ? 1 : -1;
    leaf = <line x1={px(x)} y1={py(y)} x2={px(x) + sx * r} y2={py(y)} stroke={INK} strokeWidth={2} />;
    arc = <path d={`M ${px(x) + sx * r} ${py(y)} A ${r} ${r} 0 0 ${sx === 1 ? 1 : 0} ${px(x)} ${py(y) + r}`} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="2 2" />;
  } else {
    const sy = dir === 'd' ? 1 : -1;
    leaf = <line x1={px(x)} y1={py(y)} x2={px(x)} y2={py(y) + sy * r} stroke={INK} strokeWidth={2} />;
    arc = <path d={`M ${px(x)} ${py(y) + sy * r} A ${r} ${r} 0 0 ${sy === 1 ? 0 : 1} ${px(x) + r} ${py(y)}`} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="2 2" />;
  }
  return (
    <g>
      {gap}
      {leaf}
      {arc}
    </g>
  );
}

function RoomLabel({ x, y, name, area, sub2, fs = 12 }: { x: number; y: number; name: string; area: string; sub2?: string; fs?: number }) {
  return (
    <g>
      <text x={px(x)} y={py(y)} textAnchor="middle" fontSize={fs} fontWeight={800} fill={INK}>
        {name}
      </text>
      <text x={px(x)} y={py(y) + fs + 1} textAnchor="middle" fontSize={fs - 1} fill={INK} opacity={0.75}>
        {area}
      </text>
      {sub2 && (
        <text x={px(x)} y={py(y) + 2 * fs + 1} textAnchor="middle" fontSize={fs - 3} fill={INK} opacity={0.7}>
          {sub2}
        </text>
      )}
    </g>
  );
}

export default function Plan({ opt, estimate }: { opt: Option; estimate: Estimate }) {
  const t = opt.tokens;
  const floor = t.floor;
  const wood = t.wood;
  const W = px(9.5) + 22;
  const H = py(6.75) + 22;

  return (
    <section className="section" id="plan" aria-labelledby="plan-h">
      <div className="wrap">
        <div className="kicker">План с расстановкой · {opt.name}</div>
        <h2 id="plan-h">Планировка после правок брата</h2>
        <p className="lead">
          Детская — в бывшей гостиной, кухня-гостиная ≈ 23.6 м² после сноса стены, зона зала в прихожей: диван спиной к санузлам, ТВ на торцевой
          стене на дистанции ≈ 2.3 м. Пол и мебель показаны в цветах опции.
        </p>
        <figure className="figure plan" style={{ margin: 0 }}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="План квартиры 55 м² с расстановкой мебели">
            <title>План квартиры с расстановкой мебели — опция {opt.name}</title>
            {/* --- полы помещений --- */}
            <rect x={px(0)} y={py(0)} width={3.0 * S} height={0.9 * S} fill="#eef2e6" />
            <rect x={px(0)} y={py(0.9)} width={3.0 * S} height={3.9 * S} fill={floor} opacity={0.55} />
            <rect x={px(3.0)} y={py(0)} width={3.2 * S} height={3.7 * S} fill={floor} opacity={0.55} />
            <rect x={px(6.2)} y={py(0)} width={3.3 * S} height={3.7 * S} fill={floor} opacity={0.55} />
            <rect x={px(3.0)} y={py(3.7)} width={3.2 * S} height={2.4 * S} fill={floor} opacity={0.55} />
            <rect x={px(6.2)} y={py(3.7)} width={1.7 * S} height={2.4 * S} fill={TILE} />
            <rect x={px(7.9)} y={py(3.7)} width={1.6 * S} height={1.6 * S} fill={TILE} />
            <rect x={px(7.9)} y={py(5.3)} width={1.6 * S} height={1.45 * S} fill={TILE} />
            {/* плитка у входа — сетка */}
            <g stroke="rgba(0,0,0,0.08)" strokeWidth={1}>
              {[6.5, 6.8, 7.1, 7.4, 7.7].map((x) => (
                <line key={`v${x}`} x1={px(x)} y1={py(3.7)} x2={px(x)} y2={py(6.1)} />
              ))}
              {[4.0, 4.3, 4.6, 4.9, 5.2, 5.5, 5.8].map((y) => (
                <line key={`h${y}`} x1={px(6.2)} y1={py(y)} x2={px(7.9)} y2={py(y)} />
              ))}
            </g>
            {/* акцентная стена за ТВ (торцевая) */}
            <rect x={px(3.0)} y={py(3.7)} width={0.08 * S} height={2.4 * S} fill={t.accent} />

            {/* --- ковёр и мебель зала --- */}
            <Box x={3.55} y={3.78} w={1.6} h={2.3} fill={t.accent} opacity={0.35} stroke="none" rx={3} />
            <text x={px(4.35)} y={py(6.0)} textAnchor="middle" fontSize={7} fill={INK} opacity={0.8}>
              ковёр 160×230
            </text>
            <Box x={5.3} y={3.8} w={0.9} h={2.2} fill={t.textile} label="диван" sub="220×90" fs={9} color="#fff" rx={5} />
            <rect x={px(5.3)} y={py(3.8)} width={0.2 * S} height={2.2 * S} fill="rgba(0,0,0,0.12)" rx={4} />
            <Box x={4.15} y={4.65} w={0.8} h={0.5} fill={wood} label="столик" fs={7} rx={4} />
            <rect x={px(3.08)} y={py(4.75)} width={0.1 * S} height={1.2 * S} fill={INK} rx={1} />
            <text x={px(3.25)} y={py(4.7)} fontSize={8} fontWeight={700} fill={INK}>
              ТВ 55"
            </text>
            <text x={px(3.25)} y={py(6.02)} fontSize={7} fill={INK} opacity={0.75}>
              на кронштейне
            </text>
            {/* дистанция ТВ → диван */}
            <line x1={px(3.2)} y1={py(4.45)} x2={px(5.28)} y2={py(4.45)} stroke={INK} strokeWidth={1} markerEnd="url(#arr)" markerStart="url(#arrS)" />
            <text x={px(4.25)} y={py(4.38)} textAnchor="middle" fontSize={8} fontWeight={700} fill={INK}>
              ≈ 2.3 м
            </text>

            {/* --- кухня --- */}
            <Box x={3.3} y={0.05} w={2.9} h={0.6} fill={t.facade} rx={2} />
            <text x={px(3.36)} y={py(0.31)} fontSize={7} fontWeight={700} fill={INK}>
              гарнитур
            </text>
            <text x={px(3.36)} y={py(0.31) + 9} fontSize={7} fontWeight={700} fill={INK}>
              2.9 м
            </text>
            <Box x={5.6} y={0.65} w={0.6} h={1.7} fill={t.facade2 === t.facade ? t.facade : t.facade2} label="2.4 м" fs={8} color={t.facade2 === '#4a4a4a' || t.facade2 === '#6b4a34' ? '#fff' : INK} rx={2} />
            <Box x={5.6} y={2.35} w={0.6} h={0.7} fill="#f4f4f2" label="холод." fs={7} rx={2} />
            <Box x={4.95} y={0.12} w={0.6} h={0.46} fill="#2b2b2b" label="индукция" fs={6} color="#fff" rx={2} />
            <Box x={4.05} y={0.12} w={0.5} h={0.46} fill="#d8d8d4" label="мойка" fs={6} rx={6} />
            <Box x={3.35} y={2.55} w={1.2} h={0.8} fill={wood} label="стол 120×80" fs={8} color="#fff" rx={3} />
            {[3.5, 4.0].map((x) => (
              <rect key={x} x={px(x)} y={py(2.2)} width={0.35 * S} height={0.3 * S} fill={wood} opacity={0.6} rx={3} />
            ))}
            {[3.5, 4.0].map((x) => (
              <rect key={`b${x}`} x={px(x)} y={py(3.4)} width={0.35 * S} height={0.3 * S} fill={wood} opacity={0.6} rx={3} />
            ))}

            {/* --- детская --- */}
            <Box x={6.3} y={1.4} w={0.8} h={1.9} fill={t.accent} label="кровать" sub="80×130→190" fs={8} color="#fff" rx={4} />
            <rect x={px(6.3)} y={py(3.1)} width={0.8 * S} height={0.2 * S} fill="rgba(0,0,0,0.15)" rx={3} />
            <Box x={7.5} y={0.08} w={1.2} h={0.6} fill={wood} label="стол 120×60" fs={8} color="#fff" rx={3} />
            <rect x={px(7.95)} y={py(0.78)} width={0.4 * S} height={0.4 * S} fill={wood} opacity={0.6} rx={6} />
            <Box x={8.9} y={1.7} w={0.6} h={1.6} fill={t.facade} label="шкаф" sub="160×60" fs={8} rx={2} />
            <Box x={8.95} y={0.1} w={0.5} h={1.4} fill={t.facade} label="полки" sub="50×140" fs={7} rx={2} />

            {/* --- спальня и лоджия --- */}
            <Box x={0.5} y={2.75} w={1.6} h={2.0} fill={t.textile} label="кровать" sub="160×200" fs={9} color="#fff" rx={5} />
            <rect x={px(0.5)} y={py(4.55)} width={1.6 * S} height={0.2 * S} fill="rgba(0,0,0,0.18)" rx={3} />
            <Box x={0.05} y={4.3} w={0.42} h={0.42} fill={wood} label="тумба" fs={6} color="#fff" rx={3} />
            <Box x={2.15} y={4.3} w={0.42} h={0.42} fill={wood} label="тумба" fs={6} color="#fff" rx={3} />
            <Box x={2.4} y={1.0} w={0.6} h={2.0} fill={t.facade} label="шкаф" sub="200×60" fs={8} rx={2} />
            <Box x={0.1} y={0.15} w={1.2} h={0.5} fill={wood} label="стол-кабинет" fs={7} color="#fff" rx={3} />
            <Box x={1.5} y={0.15} w={1.4} h={0.35} fill={t.facade} label="полки / хранение" fs={7} rx={2} />

            {/* --- прихожая у входа --- */}
            <Box x={6.25} y={3.8} w={0.45} h={1.9} fill={t.facade} label="шкаф" sub="190×45" fs={7} rx={2} />
            <Box x={6.25} y={5.72} w={0.75} h={0.33} fill={wood} label="обувница" fs={6} color="#fff" rx={2} />
            <rect x={px(6.72)} y={py(3.85)} width={0.05 * S} height={0.9 * S} fill={GLASS} />
            <text x={px(6.8)} y={py(4.35)} fontSize={6} fill={INK} opacity={0.75}>
              зеркало
            </text>

            {/* --- душевая --- */}
            <Box x={8.55} y={3.75} w={0.9} h={0.9} fill="#dbe9f3" label="подиум" sub="90×90" fs={7} rx={2} />
            <line x1={px(8.55)} y1={py(3.75)} x2={px(8.55)} y2={py(4.65)} stroke={GLASS} strokeWidth={3} />
            <line x1={px(8.55)} y1={py(4.65)} x2={px(9.1)} y2={py(4.65)} stroke={GLASS} strokeWidth={3} />
            <Box x={8.85} y={4.82} w={0.6} h={0.42} fill="#f4f4f2" rx={2} />
            <text x={px(8.9)} y={py(5.07)} fontSize={6} fontWeight={700} fill={INK}>
              тумба 60
            </text>
            <circle cx={px(9.35)} cy={py(5.03)} r={5} fill="#fff" stroke="rgba(0,0,0,0.35)" />

            {/* --- с/у --- */}
            <Box x={8.9} y={6.05} w={0.45} h={0.65} fill="#f4f4f2" label="унитаз" fs={6} rx={6} />
            <Box x={8.0} y={6.3} w={0.45} h={0.4} fill="#f4f4f2" label="раков." fs={6} rx={4} />
            <Box x={9.3} y={5.38} w={0.18} h={0.5} fill="#cfd4d8" fs={6} rx={1} />
            <text x={px(8.55)} y={py(5.6)} fontSize={6} fill={INK} opacity={0.75}>
              колонка →
            </text>

            {/* --- стены --- */}
            <path
              d={`M ${px(0)} ${py(0)} H ${px(9.5)} V ${py(6.75)} H ${px(7.9)} V ${py(6.1)} H ${px(3.0)} V ${py(4.8)} H ${px(0)} Z`}
              fill="none"
              stroke={INK}
              strokeWidth={7}
              strokeLinejoin="miter"
            />
            <Wall x1={0} y1={0.9} x2={3.0} y2={0.9} />
            <Wall x1={3.0} y1={0} x2={3.0} y2={4.8} />
            <Wall x1={6.2} y1={0} x2={6.2} y2={3.7} />
            <Wall x1={6.2} y1={3.7} x2={7.9} y2={3.7} />
            <Wall x1={7.9} y1={3.7} x2={9.5} y2={3.7} />
            <Wall x1={7.9} y1={3.7} x2={7.9} y2={6.1} />
            <Wall x1={7.9} y1={5.3} x2={9.5} y2={5.3} />
            {/* снесённая стена кухня–прихожая */}
            <line x1={px(3.0)} y1={py(3.7)} x2={px(6.2)} y2={py(3.7)} stroke={REMOVED} strokeWidth={4} strokeDasharray="9 6" />
            <text x={px(4.6)} y={py(3.62)} textAnchor="middle" fontSize={8} fontWeight={700} fill={REMOVED}>
              стена снесена → единое пространство ≈ 23.6 м²
            </text>

            {/* --- окна --- */}
            <Window x1={0.6} y1={0} x2={2.4} y2={0} />
            <Window x1={0.5} y1={0.9} x2={2.5} y2={0.9} />
            <Window x1={3.9} y1={0} x2={5.3} y2={0} />
            <Window x1={7.2} y1={0} x2={8.6} y2={0} />

            {/* --- двери и проёмы --- */}
            <Door x={3.0} y={3.85} w={0.8} vertical dir="l" />
            {/* широкий проём в детскую 1.4 м — двустворчатая дверь */}
            <line x1={px(6.35)} y1={py(3.7)} x2={px(7.75)} y2={py(3.7)} stroke="#fff" strokeWidth={7} />
            <line x1={px(6.35)} y1={py(3.7)} x2={px(6.35)} y2={py(3.7 - 0.7)} stroke={INK} strokeWidth={2} />
            <line x1={px(7.75)} y1={py(3.7)} x2={px(7.75)} y2={py(3.7 - 0.7)} stroke={INK} strokeWidth={2} />
            <path d={`M ${px(6.35)} ${py(3.0)} A ${0.7 * S} ${0.7 * S} 0 0 1 ${px(7.05)} ${py(3.7)}`} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="2 2" />
            <path d={`M ${px(7.75)} ${py(3.0)} A ${0.7 * S} ${0.7 * S} 0 0 0 ${px(7.05)} ${py(3.7)}`} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="2 2" />
            <text x={px(7.05)} y={py(3.9)} textAnchor="middle" fontSize={7} fontWeight={700} fill={INK}>
              проём 1.4 м
            </text>
            <Door x={7.9} y={4.35} w={0.8} vertical dir="r" />
            <Door x={7.9} y={5.38} w={0.7} vertical dir="r" />
            {/* входная дверь (стоит, не трогаем) */}
            <line x1={px(6.95)} y1={py(6.1)} x2={px(7.85)} y2={py(6.1)} stroke="#fff" strokeWidth={7} />
            <line x1={px(6.95)} y1={py(6.1)} x2={px(7.85)} y2={py(6.1)} stroke="#2f7d4f" strokeWidth={5} />
            <text x={px(7.4)} y={py(6.4)} textAnchor="middle" fontSize={8} fontWeight={800} fill="#2f7d4f">
              ВХОД
            </text>

            {/* --- подписи помещений --- */}
            <RoomLabel x={1.5} y={1.55} name="Спальня" area="11.7 м²" />
            <text x={px(0.7)} y={py(0.84)} fontSize={8} fontWeight={700} fill={INK}>
              Лоджия 2.7 м²
            </text>
            <RoomLabel x={4.6} y={1.35} name="Кухня" area="11.8 м²" />
            <RoomLabel x={8.0} y={2.05} name="Детская" area="12.2 м²" sub2="бывш. гостиная" fs={11} />
            <RoomLabel x={4.35} y={5.45} name="Зона зала" area="≈ 7–8 м² в прихожей 11.8" fs={10} />
            <RoomLabel x={8.15} y={4.0} name="Душевая" area="2.8 м²" fs={8} />
            <RoomLabel x={8.5} y={5.85} name="С/у" area="2.1 м²" fs={9} />
            <text x={px(6.95)} y={py(5.5)} fontSize={7} fill={INK} opacity={0.8}>
              прихожая
            </text>
            <text x={px(6.95)} y={py(5.6)} fontSize={7} fill={INK} opacity={0.8}>
              у входа ≈ 4 м²
            </text>
            <text x={px(4.6)} y={py(0) - 8} fontSize={7} fill="#3f7fae" textAnchor="middle" fontWeight={700}>
              окно
            </text>
            <text x={px(7.9)} y={py(0) - 8} fontSize={7} fill="#3f7fae" textAnchor="middle" fontWeight={700}>
              окно
            </text>
            <text x={px(1.5)} y={py(0) - 8} fontSize={7} fill="#3f7fae" textAnchor="middle" fontWeight={700}>
              окно лоджии
            </text>
            <text x={px(1.5)} y={py(0.9) + 13} fontSize={7} fill="#3f7fae" textAnchor="middle" fontWeight={700}>
              окно / выход на лоджию
            </text>

            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={INK} />
              </marker>
              <marker id="arrS" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 10 0 L 0 5 L 10 10 z" fill={INK} />
              </marker>
            </defs>
          </svg>
          <figcaption>
            Масштаб условный: 1 м = 60 px, размеры мебели — из планировочного решения. Площади — по плану и листу «Планировка» сметы.
          </figcaption>
        </figure>
        <div className="legend" aria-hidden="true">
          <span>снесённая стена кухня–прихожая</span>
          <span className="solid">стены</span>
          <span className="win">окна / стекло</span>
        </div>

        <div className="rooms-list">
          {LAYOUT.rooms.map((r) => (
            <div className="r" key={r.key}>
              <b>{r.areaText ?? r.area} м²</b>
              <div>
                <span className="nm">{r.name}</span> — <span className="tx">{r.text}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-2" style={{ marginTop: 14 }}>
          <div className="card">
            <h3>Правки, уже сделанные братом</h3>
            <ol style={{ margin: 0, paddingLeft: '1.2em' }}>
              {LAYOUT.brotherEdits.map((e) => (
                <li key={e} className="small" style={{ marginBottom: 4 }}>
                  {e}
                </li>
              ))}
            </ol>
          </div>
          <div className="card">
            <h3>Не меняем</h3>
            <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
              {LAYOUT.fixed.map((e) => (
                <li key={e} className="small" style={{ marginBottom: 4 }}>
                  {e}
                </li>
              ))}
            </ul>
            <p className="small muted" style={{ margin: '8px 0 0' }}>
              Площади по плану: {estimate.layout.filter((l) => l.room !== 'Итого без лоджии').map((l) => `${l.room} ${l.after}`).join(' · ')} м².
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
