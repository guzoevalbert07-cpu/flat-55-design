import type { Option } from '../data/options';
import { LAYOUT } from '../data/options';
import type { Estimate } from '../types';

/**
 * План с расстановкой (ТЗ §4.3). Расположение помещений — по схеме планировки из дизайн-концепции
 * (input/plan.png): Спальня+лоджия · Детская · Кухня в верхнем ряду, прихожая с зоной зала под ними,
 * санузлы внизу слева, вход справа. Масштаб условный: 1 м = 60 px. Координаты в метрах, начало — левый верхний угол.
 */
const S = 60;
const OX = 22;
const OY = 22;
const px = (m: number) => OX + m * S;
const py = (m: number) => OY + m * S;

const INK = '#1d1d1b';
const TILE = '#e9e7e2';
const GLASS = '#6aa9d8';
const GLASS_TXT = '#3f7fae';
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

const TV_SIZE: Record<Option['key'], string> = { eco: 'ТВ 50"', std: 'ТВ 55"', prem: 'ТВ 65"' };

export default function Plan({ opt, estimate }: { opt: Option; estimate: Estimate }) {
  const t = opt.tokens;
  const floor = t.floor;
  const wood = t.wood;
  const W = px(9.5) + 22;
  const H = py(7.4) + 22;
  const facade2Text = t.facade2 === '#4a4a4a' || t.facade2 === '#6b4a34' ? '#fff' : INK;

  return (
    <section className="section" id="plan" aria-labelledby="plan-h">
      <div className="wrap">
        <div className="kicker">План с расстановкой · {opt.name}</div>
        <h2 id="plan-h">План с расстановкой — после правок брата</h2>
        <p className="lead">
          Детская — в бывшей гостиной, кухня-гостиная ≈ 23.6 м² после сноса стены кухня–прихожая, зона зала в прихожей: диван спиной к стене
          санузлов, ТВ на торцевой стене на дистанции ≈ 2.3 м. Расположение помещений — по схеме дизайн-концепции; пол и мебель — в цветах опции.
        </p>
        <figure className="figure plan" style={{ margin: 0 }}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="План квартиры 55 м² с расстановкой мебели">
            <title>План квартиры с расстановкой мебели — опция {opt.name}</title>
            {/* --- полы помещений --- */}
            <rect x={px(0)} y={py(0)} width={3.0 * S} height={0.9 * S} fill="#eef2e6" />
            <rect x={px(0)} y={py(0.9)} width={3.0 * S} height={3.9 * S} fill={floor} opacity={0.55} />
            <rect x={px(3.0)} y={py(0)} width={3.3 * S} height={3.7 * S} fill={floor} opacity={0.55} />
            <rect x={px(6.3)} y={py(0)} width={3.2 * S} height={3.7 * S} fill={floor} opacity={0.55} />
            <rect x={px(6.3)} y={py(3.7)} width={3.2 * S} height={2.4 * S} fill={floor} opacity={0.55} />
            <rect x={px(3.0)} y={py(3.7)} width={3.3 * S} height={1.3 * S} fill={TILE} />
            <rect x={px(6.3)} y={py(6.1)} width={3.2 * S} height={1.3 * S} fill={TILE} />
            <rect x={px(3.0)} y={py(5.0)} width={1.9 * S} height={1.6 * S} fill={TILE} />
            <rect x={px(4.9)} y={py(5.0)} width={1.4 * S} height={1.6 * S} fill={TILE} />
            {/* керамогранит у входа и в проходе — сетка */}
            <g stroke="rgba(0,0,0,0.08)" strokeWidth={1}>
              {[3.3, 3.6, 3.9, 4.2, 4.5, 4.8, 5.1, 5.4, 5.7, 6.0].map((x) => (
                <line key={`c${x}`} x1={px(x)} y1={py(3.7)} x2={px(x)} y2={py(5.0)} />
              ))}
              {[4.0, 4.3, 4.6, 4.9].map((y) => (
                <line key={`ch${y}`} x1={px(3.0)} y1={py(y)} x2={px(6.3)} y2={py(y)} />
              ))}
              {[6.6, 6.9, 7.2, 7.5, 7.8, 8.1, 8.4, 8.7, 9.0, 9.3].map((x) => (
                <line key={`e${x}`} x1={px(x)} y1={py(6.1)} x2={px(x)} y2={py(7.4)} />
              ))}
              {[6.4, 6.7, 7.0, 7.3].map((y) => (
                <line key={`eh${y}`} x1={px(6.3)} y1={py(y)} x2={px(9.5)} y2={py(y)} />
              ))}
            </g>
            {/* акцентная торцевая стена за ТВ */}
            <rect x={px(9.42)} y={py(3.7)} width={0.08 * S} height={2.4 * S} fill={t.accent} />

            {/* --- зона зала: ковёр, диван спиной к стене санузлов, ТВ на торцевой стене --- */}
            <Box x={7.4} y={3.8} w={1.6} h={2.3} fill={t.accent} opacity={0.35} stroke="none" rx={3} />
            <text x={px(8.2)} y={py(6.02)} textAnchor="middle" fontSize={7} fill={INK} opacity={0.8}>
              ковёр 160×230
            </text>
            <Box x={6.35} y={3.9} w={0.9} h={2.2} fill={t.textile} label="диван" sub="220×90" fs={9} color="#fff" rx={5} />
            <rect x={px(6.35)} y={py(3.9)} width={0.2 * S} height={2.2 * S} fill="rgba(0,0,0,0.12)" rx={4} />
            <Box x={7.6} y={4.75} w={0.8} h={0.5} fill={wood} label="столик" fs={7} rx={4} />
            <rect x={px(9.32)} y={py(4.3)} width={0.1 * S} height={1.2 * S} fill={INK} rx={1} />
            <text x={px(9.28)} y={py(4.12)} textAnchor="end" fontSize={8} fontWeight={700} fill={INK}>
              {TV_SIZE[opt.key]}
            </text>
            <text x={px(9.28)} y={py(4.25)} textAnchor="end" fontSize={7} fill={INK} opacity={0.75}>
              на кронштейне
            </text>
            <line x1={px(7.27)} y1={py(4.45)} x2={px(9.3)} y2={py(4.45)} stroke={INK} strokeWidth={1} markerEnd="url(#arr)" markerStart="url(#arrS)" />
            <text x={px(8.3)} y={py(4.62)} textAnchor="middle" fontSize={8} fontWeight={700} fill={INK}>
              ≈ 2.3 м
            </text>

            {/* --- кухня --- */}
            <Box x={6.6} y={0.05} w={2.9} h={0.6} fill={t.facade} rx={2} />
            <text x={px(6.66)} y={py(0.31)} fontSize={7} fontWeight={700} fill={INK}>
              гарнитур
            </text>
            <text x={px(6.66)} y={py(0.31) + 9} fontSize={7} fontWeight={700} fill={INK}>
              2.9 м
            </text>
            <Box x={8.9} y={0.65} w={0.6} h={1.7} fill={t.facade2} label="2.4 м" fs={8} color={facade2Text} rx={2} />
            <Box x={8.9} y={2.35} w={0.6} h={0.7} fill="#f4f4f2" label="холод." fs={7} rx={2} />
            <Box x={8.4} y={0.12} w={0.6} h={0.46} fill="#2b2b2b" label="индукция" fs={6} color="#fff" rx={2} />
            <Box x={7.35} y={0.12} w={0.5} h={0.46} fill="#d8d8d4" label="мойка" fs={6} rx={6} />
            <Box x={6.5} y={2.55} w={1.2} h={0.8} fill={wood} label="стол 120×80" fs={8} color="#fff" rx={3} />
            {[6.65, 7.15].map((x) => (
              <rect key={x} x={px(x)} y={py(2.2)} width={0.35 * S} height={0.3 * S} fill={wood} opacity={0.6} rx={3} />
            ))}
            {[6.65, 7.15].map((x) => (
              <rect key={`b${x}`} x={px(x)} y={py(3.4)} width={0.35 * S} height={0.28 * S} fill={wood} opacity={0.6} rx={3} />
            ))}

            {/* --- детская --- */}
            <Box x={3.1} y={1.4} w={0.8} h={1.9} fill={t.accent} label="кровать" sub="80×130→190" fs={8} color="#fff" rx={4} />
            <rect x={px(3.1)} y={py(3.1)} width={0.8 * S} height={0.2 * S} fill="rgba(0,0,0,0.15)" rx={3} />
            <Box x={4.3} y={0.08} w={1.2} h={0.6} fill={wood} label="стол 120×60" fs={8} color="#fff" rx={3} />
            <rect x={px(4.75)} y={py(0.78)} width={0.4 * S} height={0.4 * S} fill={wood} opacity={0.6} rx={6} />
            <Box x={5.7} y={1.7} w={0.6} h={1.6} fill={t.facade} label="шкаф" sub="160×60" fs={8} rx={2} />
            <Box x={5.75} y={0.1} w={0.5} h={1.4} fill={t.facade} label="полки" sub="50×140" fs={7} rx={2} />

            {/* --- спальня и лоджия --- */}
            <Box x={0.5} y={2.75} w={1.6} h={2.0} fill={t.textile} label="кровать" sub="160×200" fs={9} color="#fff" rx={5} />
            <rect x={px(0.5)} y={py(4.55)} width={1.6 * S} height={0.2 * S} fill="rgba(0,0,0,0.18)" rx={3} />
            <Box x={0.05} y={4.3} w={0.42} h={0.42} fill={wood} label="тумба" fs={6} color="#fff" rx={3} />
            <Box x={2.15} y={4.3} w={0.42} h={0.42} fill={wood} label="тумба" fs={6} color="#fff" rx={3} />
            <Box x={2.4} y={1.0} w={0.6} h={2.0} fill={t.facade} label="шкаф" sub="200×60" fs={8} rx={2} />
            <Box x={0.1} y={0.15} w={1.2} h={0.5} fill={wood} label="стол-кабинет" fs={7} color="#fff" rx={3} />
            <Box x={1.5} y={0.15} w={1.4} h={0.35} fill={t.facade} label="полки / хранение" fs={7} rx={2} />

            {/* --- прихожая у входа --- */}
            <Box x={6.9} y={6.95} w={1.9} h={0.45} fill={t.facade} label="шкаф 190×45" fs={7} rx={2} />
            <Box x={6.35} y={6.2} w={0.35} h={0.9} fill={wood} fs={6} color="#fff" rx={2} />
            <text x={px(6.75)} y={py(6.55)} fontSize={6} fill={INK} opacity={0.8}>
              обувница
            </text>
            <text x={px(6.75)} y={py(6.65)} fontSize={6} fill={INK} opacity={0.8}>
              90×35
            </text>
            <rect x={px(7.0)} y={py(6.9)} width={0.9 * S} height={0.05 * S} fill={GLASS} />
            <text x={px(7.45)} y={py(6.85)} textAnchor="middle" fontSize={6} fill={INK} opacity={0.75}>
              зеркало
            </text>

            {/* --- душевая --- */}
            <Box x={3.05} y={5.65} w={0.9} h={0.9} fill="#dbe9f3" label="подиум" sub="90×90" fs={7} rx={2} />
            <line x1={px(3.95)} y1={py(5.65)} x2={px(3.95)} y2={py(6.55)} stroke={GLASS} strokeWidth={3} />
            <line x1={px(3.4)} y1={py(5.65)} x2={px(3.95)} y2={py(5.65)} stroke={GLASS} strokeWidth={3} />
            <Box x={4.25} y={6.1} w={0.6} h={0.42} fill="#f4f4f2" rx={2} />
            <text x={px(4.28)} y={py(6.36)} fontSize={6} fontWeight={700} fill={INK}>
              тумба 60
            </text>
            <circle cx={px(4.72)} cy={py(6.31)} r={5} fill="#fff" stroke="rgba(0,0,0,0.35)" />

            {/* --- с/у --- */}
            <Box x={5.8} y={5.9} w={0.45} h={0.65} fill="#f4f4f2" label="унитаз" fs={6} rx={6} />
            <Box x={4.95} y={6.2} w={0.45} h={0.36} fill="#f4f4f2" label="раков." fs={6} rx={4} />
            <Box x={5.5} y={6.46} w={0.5} h={0.14} fill="#cfd4d8" rx={1} />
            <text x={px(5.75)} y={py(6.42)} textAnchor="middle" fontSize={6} fill={INK} opacity={0.75}>
              колонка
            </text>

            {/* --- стены --- */}
            <path
              d={`M ${px(0)} ${py(0)} H ${px(9.5)} V ${py(7.4)} H ${px(6.3)} V ${py(6.6)} H ${px(3.0)} V ${py(4.8)} H ${px(0)} Z`}
              fill="none"
              stroke={INK}
              strokeWidth={7}
              strokeLinejoin="miter"
            />
            <Wall x1={0} y1={0.9} x2={3.0} y2={0.9} />
            <Wall x1={3.0} y1={0} x2={3.0} y2={4.8} />
            <Wall x1={6.3} y1={0} x2={6.3} y2={3.7} />
            <Wall x1={3.0} y1={3.7} x2={6.3} y2={3.7} />
            <Wall x1={3.0} y1={5.0} x2={6.3} y2={5.0} />
            <Wall x1={4.9} y1={5.0} x2={4.9} y2={6.6} />
            <Wall x1={6.3} y1={5.0} x2={6.3} y2={6.6} />
            {/* снесённая стена кухня–прихожая */}
            <line x1={px(6.3)} y1={py(3.7)} x2={px(9.5)} y2={py(3.7)} stroke={REMOVED} strokeWidth={4} strokeDasharray="9 6" />
            <text x={px(7.9)} y={py(3.62)} textAnchor="middle" fontSize={8} fontWeight={700} fill={REMOVED}>
              стена снесена → единое пространство ≈ 23.6 м²
            </text>

            {/* --- окна --- */}
            <Window x1={0.6} y1={0} x2={2.4} y2={0} />
            <Window x1={0.5} y1={0.9} x2={2.5} y2={0.9} />
            <Window x1={3.9} y1={0} x2={5.4} y2={0} />
            <Window x1={7.2} y1={0} x2={8.6} y2={0} />

            {/* --- двери и проёмы --- */}
            <Door x={3.0} y={3.8} w={0.8} vertical dir="r" />
            {/* широкий проём в детскую 1.4 м — двустворчатая дверь */}
            <line x1={px(4.2)} y1={py(3.7)} x2={px(5.6)} y2={py(3.7)} stroke="#fff" strokeWidth={7} />
            <line x1={px(4.2)} y1={py(3.7)} x2={px(4.2)} y2={py(3.0)} stroke={INK} strokeWidth={2} />
            <line x1={px(5.6)} y1={py(3.7)} x2={px(5.6)} y2={py(3.0)} stroke={INK} strokeWidth={2} />
            <path d={`M ${px(4.2)} ${py(3.0)} A ${0.7 * S} ${0.7 * S} 0 0 1 ${px(4.9)} ${py(3.7)}`} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="2 2" />
            <path d={`M ${px(5.6)} ${py(3.0)} A ${0.7 * S} ${0.7 * S} 0 0 0 ${px(4.9)} ${py(3.7)}`} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="2 2" />
            <text x={px(4.9)} y={py(3.9)} textAnchor="middle" fontSize={7} fontWeight={700} fill={INK}>
              проём 1.4 м
            </text>
            <Door x={3.55} y={5.0} w={0.8} vertical={false} dir="d" />
            <Door x={5.05} y={5.0} w={0.7} vertical={false} dir="d" />
            {/* входная дверь (стоит, не трогаем) */}
            <line x1={px(9.5)} y1={py(6.45)} x2={px(9.5)} y2={py(7.3)} stroke="#fff" strokeWidth={7} />
            <line x1={px(9.5)} y1={py(6.45)} x2={px(9.5)} y2={py(7.3)} stroke="#2f7d4f" strokeWidth={5} />
            <path d={`M ${px(9.5)} ${py(7.3)} A ${0.85 * S} ${0.85 * S} 0 0 1 ${px(8.65)} ${py(6.45)}`} fill="none" stroke="#2f7d4f" strokeWidth={1} strokeDasharray="2 2" />
            <text x={px(9.1)} y={py(7.25)} textAnchor="middle" fontSize={8} fontWeight={800} fill="#2f7d4f">
              ВХОД
            </text>

            {/* --- подписи помещений --- */}
            <RoomLabel x={1.5} y={1.55} name="Спальня" area="11.7 м²" />
            <text x={px(1.5)} y={py(0.83)} textAnchor="middle" fontSize={8} fontWeight={700} fill={INK}>
              Лоджия 2.7 м²
            </text>
            <RoomLabel x={4.8} y={2.05} name="Детская" area="12.2 м²" sub2="бывш. гостиная" fs={11} />
            <RoomLabel x={7.5} y={1.4} name="Кухня" area="11.8 м²" />
            <RoomLabel x={8.15} y={5.45} name="Зона зала" area="≈ 7–8 м² в прихожей" fs={10} />
            <text x={px(4.65)} y={py(4.3)} textAnchor="middle" fontSize={7} fill={INK} opacity={0.8}>
              прихожая 11.8 м² — проход к спальне,
            </text>
            <text x={px(4.65)} y={py(4.45)} textAnchor="middle" fontSize={7} fill={INK} opacity={0.8}>
              детской и санузлам (керамогранит)
            </text>
            <RoomLabel x={4.45} y={5.35} name="Душевая" area="2.8 м²" fs={8} />
            <RoomLabel x={5.9} y={5.4} name="С/у" area="2.1 м²" fs={8} />
            <text x={px(7.9)} y={py(6.4)} fontSize={7} fill={INK} opacity={0.8}>
              прихожая у входа ≈ 4 м²
            </text>
            <text x={px(4.65)} y={py(0) - 8} fontSize={7} fill={GLASS_TXT} textAnchor="middle" fontWeight={700}>
              окно
            </text>
            <text x={px(7.9)} y={py(0) - 8} fontSize={7} fill={GLASS_TXT} textAnchor="middle" fontWeight={700}>
              окно
            </text>
            <text x={px(1.5)} y={py(0) - 8} fontSize={7} fill={GLASS_TXT} textAnchor="middle" fontWeight={700}>
              окно лоджии
            </text>
            <text x={px(1.5)} y={py(0.9) + 13} fontSize={7} fill={GLASS_TXT} textAnchor="middle" fontWeight={700}>
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
            Масштаб условный: 1 м = 60 px, размеры мебели — из планировочного решения, площади — по плану и листу «Планировка» сметы. ТВ на торцевой
            стене зоны зала со стороны входа, чтобы диван стоял спиной к стене санузлов (в схеме концепции ТВ нарисован на противоположном торце).
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
              Площади после правок (лист «Планировка»): {estimate.layout.filter((l) => l.room !== 'Итого без лоджии').map((l) => `${l.room} ${l.after}`).join(' · ')} м².
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
