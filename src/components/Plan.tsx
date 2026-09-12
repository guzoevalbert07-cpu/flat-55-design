import type { Option } from '../data/options';
import { LAYOUT } from '../data/options';
import type { Estimate } from '../types';
import { OpenLarge, useLightbox } from './Lightbox';

/**
 * План с расстановкой (ТЗ §4.3). Геометрия помещений — по плану БТИ кв. 312 (фото из переписки с братом, правки 1–3 отмечены на нём):
 * спальня слева с окном на улицу и лоджией над ней, зал (бывшая гостиная) и кухня в верхнем ряду, коридор под ними, душевая и с/у под коридором,
 * прихожая у входа внизу справа, вход — на правой стене. Масштаб условный: 1 м = 60 px. Координаты в метрах, начало — левый верхний угол.
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
const MOVED = '#8a8a86';

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

/**
 * Геометрия — по плану БТИ кв. 312 (фото с правками брата), север вверху, метры:
 * зал (бывш. гостиная) x 3.77–6.70 · y 0–4.13; кухня x 6.70–10.36 · y 1.01–4.13; спальня x 0–3.77 · y 2.32–5.33 с окном на левой стене;
 * лоджия над спальней x 1.09–3.77 · y 1.27–2.32; коридор y 4.13–5.33 вдоль зала и кухни; душевая и с/у под коридором; прихожая у входа x 8.6–10.36 · y 5.33–7.75; вход — на правой стене.
 */
export function PlanSvg({ opt }: { opt: Option }) {
  const t = opt.tokens;
  const floor = t.floor;
  const wood = t.wood;
  const W = px(10.36) + 50;
  const H = py(7.75) + 22;
  const facade2Text = t.facade2 === '#4a4a4a' || t.facade2 === '#6b4a34' ? '#fff' : INK;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="План квартиры 55 м² с расстановкой мебели по плану БТИ">
      <title>План квартиры с расстановкой мебели — опция {opt.name}</title>
      <defs>
        <pattern id="tilep" width={0.3 * S} height={0.3 * S} patternUnits="userSpaceOnUse">
          <rect width={0.3 * S} height={0.3 * S} fill={TILE} />
          <path d={`M ${0.3 * S} 0 V ${0.3 * S} H 0`} fill="none" stroke="rgba(0,0,0,0.09)" strokeWidth={1} />
        </pattern>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={INK} />
        </marker>
        <marker id="arrS" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 10 0 L 0 5 L 10 10 z" fill={INK} />
        </marker>
      </defs>

      {/* --- полы помещений --- */}
      <rect x={px(1.09)} y={py(1.27)} width={2.68 * S} height={1.05 * S} fill="#eef2e6" />
      <rect x={px(0)} y={py(2.32)} width={3.77 * S} height={3.01 * S} fill={floor} opacity={0.55} />
      <rect x={px(3.77)} y={py(0)} width={2.93 * S} height={4.13 * S} fill={floor} opacity={0.55} />
      <rect x={px(6.7)} y={py(1.01)} width={3.66 * S} height={3.12 * S} fill={floor} opacity={0.55} />
      <rect x={px(3.77)} y={py(4.13)} width={2.13 * S} height={1.2 * S} fill={floor} opacity={0.55} />
      <rect x={px(5.9)} y={py(4.13)} width={4.46 * S} height={1.2 * S} fill="url(#tilep)" />
      <rect x={px(8.6)} y={py(5.33)} width={1.76 * S} height={2.42 * S} fill="url(#tilep)" />
      <rect x={px(5.9)} y={py(5.33)} width={1.5 * S} height={1.87 * S} fill="url(#tilep)" />
      <rect x={px(7.4)} y={py(5.33)} width={1.2 * S} height={1.87 * S} fill="url(#tilep)" />

      {/* --- зал (бывшая гостиная 12.2): диван у стены спальни, ТВ на стене кухни --- */}
      <rect x={px(6.62)} y={py(1.01)} width={0.08 * S} height={3.12 * S} fill={t.accent} />
      <Box x={4.85} y={0.95} w={1.6} h={2.3} fill={t.accent} opacity={0.35} stroke="none" rx={3} />
      <text x={px(5.65)} y={py(3.15)} textAnchor="middle" fontSize={7} fill={INK} opacity={0.8}>
        ковёр 160×230
      </text>
      <Box x={3.82} y={1.0} w={0.9} h={2.2} fill={t.textile} label="диван" sub="220×90" fs={9} color="#fff" rx={5} />
      <rect x={px(3.82)} y={py(1.0)} width={0.2 * S} height={2.2 * S} fill="rgba(0,0,0,0.12)" rx={4} />
      <Box x={5.15} y={1.85} w={0.8} h={0.5} fill={wood} label="столик" fs={7} rx={4} />
      <rect x={px(6.52)} y={py(1.5)} width={0.1 * S} height={1.2 * S} fill={INK} rx={1} />
      <text x={px(6.48)} y={py(1.42)} textAnchor="end" fontSize={8} fontWeight={700} fill={INK}>
        {TV_SIZE[opt.key]}
      </text>
      <line x1={px(4.75)} y1={py(1.62)} x2={px(6.5)} y2={py(1.62)} stroke={INK} strokeWidth={1} markerEnd="url(#arr)" markerStart="url(#arrS)" />
      <text x={px(5.62)} y={py(1.55)} textAnchor="middle" fontSize={8} fontWeight={700} fill={INK}>
        ≈ 1.9 м
      </text>
      <Box x={3.85} y={0.1} w={0.4} h={0.9} fill={t.facade} fs={7} rx={2} />
      <text x={px(4.05)} y={py(0.55)} textAnchor="middle" fontSize={6} fontWeight={700} fill={INK} transform={`rotate(-90 ${px(4.05)} ${py(0.55)})`}>
        стеллаж
      </text>

      {/* --- кухня: линия 2.9 м вдоль окна + 2.4 м по правой стене, холодильник крайний у выхода --- */}
      <Box x={7.0} y={1.06} w={2.9} h={0.6} fill={t.facade} rx={2} />
      <text x={px(7.18)} y={py(1.32)} fontSize={7} fontWeight={700} fill={INK}>
        гарнитур
      </text>
      <text x={px(7.18)} y={py(1.32) + 9} fontSize={7} fontWeight={700} fill={INK}>
        2.9 м
      </text>
      <Box x={7.9} y={1.13} w={0.5} h={0.46} fill="#d8d8d4" label="мойка" fs={6} rx={6} />
      <Box x={9.05} y={1.13} w={0.6} h={0.46} fill="#2b2b2b" label="индукция" fs={6} color="#fff" rx={2} />
      <Box x={9.76} y={1.66} w={0.55} h={1.7} fill={t.facade2} label="2.4 м" fs={8} color={facade2Text} rx={2} />
      <Box x={9.76} y={3.36} w={0.55} h={0.7} fill="#f4f4f2" label="холод." fs={7} rx={2} />
      <rect x={px(6.73)} y={py(2.0)} width={0.1 * S} height={0.75 * S} fill={INK} rx={1} />
      <text x={px(7.22)} y={py(2.3)} fontSize={7} fontWeight={700} fill={INK}>
        ТВ 32–43"
      </text>
      <text x={px(7.22)} y={py(2.43)} fontSize={6} fill={INK} opacity={0.75}>
        кухни
      </text>
      {/* обеденная зона у снесённой стены */}
      <text x={px(7.9)} y={py(2.58)} textAnchor="middle" fontSize={7} fontWeight={700} fill={INK} opacity={0.8}>
        обеденная зона
      </text>
      <Box x={7.3} y={3.0} w={1.2} h={0.8} fill={wood} label="стол 120×80" fs={8} color="#fff" rx={3} />
      {[7.45, 7.95].map((x) => (
        <rect key={`t${x}`} x={px(x)} y={py(2.65)} width={0.35 * S} height={0.3 * S} fill={wood} opacity={0.6} rx={3} />
      ))}
      {[7.45, 7.95].map((x) => (
        <rect key={`b${x}`} x={px(x)} y={py(3.85)} width={0.35 * S} height={0.3 * S} fill={wood} opacity={0.6} rx={3} />
      ))}

      {/* --- спальня: окно на левой стене, изголовье к правой (напротив окна), шкаф у глухой стены рядом с дверью --- */}
      <Box x={1.6} y={2.7} w={2.0} h={1.6} fill={t.textile} label="кровать" sub="160×200" fs={9} color="#fff" rx={5} />
      <rect x={px(3.4)} y={py(2.7)} width={0.2 * S} height={1.6 * S} fill="rgba(0,0,0,0.18)" rx={3} />
      <Box x={3.15} y={2.37} w={0.42} h={0.3} fill={wood} label="тумба" fs={6} color="#fff" rx={3} />
      <Box x={3.15} y={4.33} w={0.42} h={0.27} fill={wood} label="тумба" fs={6} color="#fff" rx={3} />
      <Box x={0.5} y={4.7} w={2.0} h={0.6} fill={t.facade} label="шкаф 200×60" fs={8} rx={2} />
      <text x={px(2.0)} y={py(2.55)} textAnchor="middle" fontSize={6} fill={GLASS_TXT} fontWeight={700}>
        окно + выход на лоджию
      </text>

      {/* --- лоджия над спальней: стол-кабинет у остекления, полки --- */}
      <Box x={1.2} y={1.32} w={1.2} h={0.5} fill={wood} label="стол 120×50" fs={6} color="#fff" rx={3} />
      <Box x={2.55} y={1.32} w={1.1} h={0.4} fill={t.facade} label="полки / хранение" fs={5.5} rx={2} />

      {/* --- прихожая у входа: шкаф 190×45 вдоль левой стены, обувница у двери, зеркало --- */}
      <Box x={8.65} y={5.5} w={0.45} h={1.9} fill={t.facade} fs={7} rx={2} />
      <text x={px(8.875)} y={py(6.45)} textAnchor="middle" fontSize={6.5} fontWeight={700} fill={INK} transform={`rotate(-90 ${px(8.875)} ${py(6.45)})`}>
        шкаф 190×45
      </text>
      <rect x={px(9.1)} y={py(5.8)} width={0.05 * S} height={1.0 * S} fill={GLASS} />
      <text x={px(9.22)} y={py(6.3)} textAnchor="middle" fontSize={6} fill={INK} opacity={0.75} transform={`rotate(-90 ${px(9.22)} ${py(6.3)})`}>
        зеркало
      </text>
      <Box x={9.95} y={5.6} w={0.36} h={0.9} fill={wood} fs={6} color="#fff" rx={2} />
      <text x={px(10.13)} y={py(6.05)} textAnchor="middle" fontSize={6} fontWeight={700} fill="#fff" transform={`rotate(-90 ${px(10.13)} ${py(6.05)})`}>
        обувница 90×35
      </text>

      {/* --- душевая 2.8: подиум 90×90 в углу, стекло, тумба 60 --- */}
      <Box x={5.95} y={6.25} w={0.9} h={0.9} fill="#dbe9f3" label="подиум" sub="90×90" fs={7} rx={2} />
      <line x1={px(6.85)} y1={py(6.25)} x2={px(6.85)} y2={py(7.15)} stroke={GLASS} strokeWidth={3} />
      <line x1={px(6.3)} y1={py(6.25)} x2={px(6.85)} y2={py(6.25)} stroke={GLASS} strokeWidth={3} />
      <Box x={6.95} y={6.5} w={0.4} h={0.6} fill="#f4f4f2" rx={2} />
      <text x={px(7.15)} y={py(6.8)} textAnchor="middle" fontSize={5.5} fontWeight={700} fill={INK} transform={`rotate(-90 ${px(7.15)} ${py(6.8)})`}>
        тумба 60
      </text>
      <circle cx={px(7.15)} cy={py(6.68)} r={4} fill="#fff" stroke="rgba(0,0,0,0.35)" />

      {/* --- с/у 2.1: унитаз, раковина 40–45, люк к колонке --- */}
      <Box x={7.78} y={6.5} w={0.45} h={0.65} fill="#f4f4f2" label="унитаз" fs={6} rx={6} />
      <Box x={7.44} y={6.05} w={0.36} h={0.32} fill="#f4f4f2" label="рак." fs={5.5} rx={4} />
      <rect x={px(8.45)} y={py(5.8)} width={0.13 * S} height={0.55 * S} fill="#cfd4d8" rx={1} />
      <text x={px(8.4)} y={py(6.07)} textAnchor="end" fontSize={5.5} fill={INK} opacity={0.75}>
        колонка
      </text>

      {/* --- стены --- */}
      <path
        d={`M ${px(3.77)} ${py(0)} H ${px(6.3)} V ${py(1.01)} H ${px(10.36)} V ${py(7.75)} H ${px(8.6)} V ${py(7.2)} H ${px(5.9)} V ${py(5.33)} H ${px(0)} V ${py(2.32)} H ${px(1.09)} V ${py(1.27)} H ${px(3.77)} Z`}
        fill="none"
        stroke={INK}
        strokeWidth={7}
        strokeLinejoin="miter"
      />
      <Wall x1={1.09} y1={2.32} x2={3.77} y2={2.32} />
      <Wall x1={3.77} y1={1.27} x2={3.77} y2={5.33} />
      <Wall x1={6.7} y1={1.01} x2={6.7} y2={4.13} />
      <Wall x1={3.77} y1={4.13} x2={6.7} y2={4.13} />
      <Wall x1={5.9} y1={5.33} x2={8.6} y2={5.33} />
      <Wall x1={7.4} y1={5.33} x2={7.4} y2={7.2} />
      <Wall x1={8.6} y1={5.33} x2={8.6} y2={7.2} />
      {/* стена зал–кухня: было (до сдвига на ≈ 0.4 м) */}
      <line x1={px(7.1)} y1={py(1.01)} x2={px(7.1)} y2={py(4.13)} stroke={MOVED} strokeWidth={2} strokeDasharray="5 4" />
      <text x={px(7.17)} y={py(4.0)} fontSize={6} fill={MOVED} fontWeight={700} transform={`rotate(-90 ${px(7.17)} ${py(4.0)})`}>
        стена до сдвига
      </text>
      {/* снесённая стена кухня–прихожая */}
      <line x1={px(6.7)} y1={py(4.13)} x2={px(10.36)} y2={py(4.13)} stroke={REMOVED} strokeWidth={4} strokeDasharray="9 6" />
      <text x={px(8.55)} y={py(4.32)} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={REMOVED}>
        стена снесена → кухня + прихожая ≈ 23.6 м²
      </text>

      {/* --- окна --- */}
      <Window x1={4.3} y1={0} x2={6.1} y2={0} />
      <Window x1={7.6} y1={1.01} x2={9.2} y2={1.01} />
      <line x1={px(0)} y1={py(3.2)} x2={px(0)} y2={py(4.6)} stroke={GLASS} strokeWidth={6} />
      <line x1={px(1.2)} y1={py(1.27)} x2={px(3.6)} y2={py(1.27)} stroke={GLASS} strokeWidth={6} />
      <Window x1={1.3} y1={2.32} x2={2.7} y2={2.32} />

      {/* --- двери и проёмы --- */}
      <Door x={2.85} y={2.32} w={0.7} vertical={false} dir="u" />
      <Door x={3.77} y={4.6} w={0.7} vertical dir="l" />
      {/* широкий проём в зал 1.4 м — двустворчатая дверь */}
      <line x1={px(5.0)} y1={py(4.13)} x2={px(6.4)} y2={py(4.13)} stroke="#fff" strokeWidth={7} />
      <line x1={px(5.0)} y1={py(4.13)} x2={px(5.0)} y2={py(3.43)} stroke={INK} strokeWidth={2} />
      <line x1={px(6.4)} y1={py(4.13)} x2={px(6.4)} y2={py(3.43)} stroke={INK} strokeWidth={2} />
      <path d={`M ${px(5.0)} ${py(3.43)} A ${0.7 * S} ${0.7 * S} 0 0 1 ${px(5.7)} ${py(4.13)}`} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="2 2" />
      <path d={`M ${px(6.4)} ${py(3.43)} A ${0.7 * S} ${0.7 * S} 0 0 0 ${px(5.7)} ${py(4.13)}`} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="2 2" />
      <text x={px(5.7)} y={py(4.55)} textAnchor="middle" fontSize={7} fontWeight={700} fill={INK}>
        проём 1.4 м
      </text>
      <Door x={6.05} y={5.33} w={0.8} vertical={false} dir="d" />
      <Door x={7.75} y={5.33} w={0.7} vertical={false} dir="d" />
      {/* входная дверь (стоит, не трогаем) — на правой стене прихожей у входа */}
      <line x1={px(10.36)} y1={py(6.75)} x2={px(10.36)} y2={py(7.6)} stroke="#fff" strokeWidth={7} />
      <line x1={px(10.36)} y1={py(6.75)} x2={px(10.36)} y2={py(7.6)} stroke="#2f7d4f" strokeWidth={5} />
      <line x1={px(10.36)} y1={py(7.6)} x2={px(9.51)} y2={py(7.6)} stroke="#2f7d4f" strokeWidth={2} />
      <path d={`M ${px(9.51)} ${py(7.6)} A ${0.85 * S} ${0.85 * S} 0 0 1 ${px(10.36)} ${py(6.75)}`} fill="none" stroke="#2f7d4f" strokeWidth={1} strokeDasharray="2 2" />
      <text x={px(10.45)} y={py(7.22)} fontSize={8} fontWeight={800} fill="#2f7d4f">
        ВХОД
      </text>

      {/* --- подписи помещений --- */}
      <RoomLabel x={0.8} y={3.3} name="Спальня" area="11.7 м²" fs={11} />
      <text x={px(2.4)} y={py(2.12)} textAnchor="middle" fontSize={7} fontWeight={700} fill={INK}>
        Лоджия 2.7 м²
      </text>
      <RoomLabel x={5.3} y={0.42} name="Зал" area="12.2 м² · бывш. гостиная" sub2="сейчас зал, потом — детская" fs={10} />
      <RoomLabel x={8.6} y={1.95} name="Кухня" area="11.8 м²" />
      <RoomLabel x={4.85} y={4.68} name="Прихожая" area="11.8 м² · коридор + у входа" fs={9} />
      <text x={px(9.5)} y={py(5.47)} textAnchor="middle" fontSize={6} fill={INK} opacity={0.8}>
        у входа ≈ 4 м²
      </text>
      <RoomLabel x={6.65} y={5.62} name="Душевая" area="2.8 м²" fs={8} />
      <RoomLabel x={8.15} y={6.28} name="С/у" area="2.1 м²" fs={8} />
      <text x={px(5.2)} y={py(0) - 8} fontSize={7} fill={GLASS_TXT} textAnchor="middle" fontWeight={700}>
        окно
      </text>
      <text x={px(8.4)} y={py(1.01) - 8} fontSize={7} fill={GLASS_TXT} textAnchor="middle" fontWeight={700}>
        окно
      </text>
      <text x={px(0) - 8} y={py(3.9)} fontSize={7} fill={GLASS_TXT} textAnchor="middle" fontWeight={700} transform={`rotate(-90 ${px(0) - 8} ${py(3.9)})`}>
        окно
      </text>
      <text x={px(2.4)} y={py(1.27) - 6} fontSize={6.5} fill={GLASS_TXT} textAnchor="middle" fontWeight={700}>
        остекление лоджии
      </text>
    </svg>
  );
}

export default function Plan({ opt, estimate }: { opt: Option; estimate: Estimate }) {
  const { open } = useLightbox();
  const title = `План с расстановкой — ${opt.name}`;
  return (
    <section className="section" id="plan" aria-labelledby="plan-h">
      <div className="wrap">
        <div className="kicker">План с расстановкой · {opt.name}</div>
        <h2 id="plan-h">План с расстановкой — после правок брата</h2>
        <p className="lead">
          Расположение помещений — по плану БТИ с правками брата (исходник ниже): спальня слева с окном на улицу и лоджией, зал (бывшая гостиная
          12.2 м², сейчас зал, потом может стать детской) и кухня в верхнем ряду, коридор под ними, душевая и с/у под коридором, вход — справа внизу.
          Кухня и зал разделены сдвинутой стеной с широким проёмом 1.4 м; стена кухня–прихожая снесена — кухня, коридор и прихожая у входа образуют
          одно пространство ≈ 23.6 м² с обеденной зоной. ТВ — и в зале (напротив дивана, дистанция ≈ 1.9 м), и в кухне у обеденной зоны. Пол и мебель —
          в цветах опции.
        </p>
        <figure className="figure plan" style={{ margin: 0 }}>
          <div onClick={() => open({ title, node: <PlanSvg opt={opt} />, base: 1100 })} role="button" tabIndex={0} aria-label="Открыть план крупно" onKeyDown={(e) => e.key === 'Enter' && open({ title, node: <PlanSvg opt={opt} />, base: 1100 })}>
            <PlanSvg opt={opt} />
          </div>
          <OpenLarge title={title} node={<PlanSvg opt={opt} />} base={1100} label="Открыть план крупно" />
          <figcaption>
            Масштаб условный: 1 м = 60 px; пропорции и взаимное расположение — по плану БТИ (фото ниже), площади — по листу «Планировка» сметы, размеры
            мебели — из планировочного решения. Керамогранит — у входа и в проходе к санузлам (уже уложен, видно на видео). По уточнению владельца: бывшая
            гостиная сейчас — зал (диван и ТВ), кухня и зал разделены, второй ТВ — в кухне; «зона зала в прихожей» из концепции не делается.
          </figcaption>
        </figure>
        <div className="legend" aria-hidden="true">
          <span>снесённая стена кухня–прихожая</span>
          <span className="solid">стены</span>
          <span className="win">окна / стекло</span>
        </div>

        <details style={{ marginTop: 12 }}>
          <summary>Исходный план БТИ с правками брата (1 — стены не будет, 2 — стена сдвинута к гостиной, 3 — проём расширен)</summary>
          <figure className="figure" style={{ margin: '10px 0 0' }}>
            <img
              src={`${import.meta.env.BASE_URL}plan-bti.jpg`}
              alt="План БТИ квартиры 312 с пометками брата: 1 — стена кухня–прихожая убирается, 2 — стена гостиной сдвигается, 3 — проём расширяется"
              loading="lazy"
              role="button"
              tabIndex={0}
              onClick={() => open({ title: 'План БТИ с правками брата', node: <img src={`${import.meta.env.BASE_URL}plan-bti.jpg`} alt="План БТИ" />, base: 0 })}
              onKeyDown={(e) => e.key === 'Enter' && open({ title: 'План БТИ с правками брата', node: <img src={`${import.meta.env.BASE_URL}plan-bti.jpg`} alt="План БТИ" />, base: 0 })}
              style={{ maxWidth: 520, width: '100%', cursor: 'zoom-in' }}
            />
            <figcaption>Кв. 312: жилая 25.4, общая 52.4, с лоджией 55.1 м². Гостиная 13.7 · Спальня 11.7 · Кухня 10.3 · Прихожая 11.8 · Ванная 2.8 · С/у 2.1 · Лоджия 2.7.</figcaption>
          </figure>
        </details>

        <div className="rooms-list">
          {LAYOUT.rooms.map((r) => (
            <div className="r" key={r.key}>
              <b>{r.area} м²</b>
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
            <p className="small muted" style={{ margin: '8px 0 0' }}>
              {LAYOUT.oral}
            </p>
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
