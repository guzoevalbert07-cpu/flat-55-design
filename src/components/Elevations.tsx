import type { Option, OptionKey } from '../data/options';

/**
 * Развёртки комнат (ТЗ §4.4): кухня, зона зала, спальня, детская, душевая.
 * Масштаб 1 м = 100 px, высота потолка 2.7 м (Параметры сметы). Координаты в метрах,
 * y отсчитывается от потолка (0) к полу (2.7).
 */
const S = 100;
const H = 2.7;
const PAD = 26;
const INK = '#1d1d1b';
const GLASS = 'rgba(120, 180, 225, 0.45)';
const GLASS_EDGE = '#6aa9d8';

const X = (m: number) => PAD + m * S;
const Y = (m: number) => 14 + m * S;

type T = Option['tokens'];

function Rect({
  x, y, w, h, fill, stroke = 'rgba(0,0,0,0.3)', rx = 2, sw = 1, op = 1,
}: { x: number; y: number; w: number; h: number; fill: string; stroke?: string; rx?: number; sw?: number; op?: number }) {
  return <rect x={X(x)} y={Y(y)} width={w * S} height={h * S} fill={fill} stroke={stroke} strokeWidth={sw} rx={rx} opacity={op} />;
}
function Label({ x, y, text, fs = 9, anchor = 'middle', color = INK, bold = false, op = 1 }: { x: number; y: number; text: string; fs?: number; anchor?: 'start' | 'middle' | 'end'; color?: string; bold?: boolean; op?: number }) {
  return (
    <text x={X(x)} y={Y(y)} fontSize={fs} textAnchor={anchor} fill={color} fontWeight={bold ? 700 : 500} opacity={op}>
      {text}
    </text>
  );
}
function Dim({ x1, x2, y, text }: { x1: number; x2: number; y: number; text: string }) {
  return (
    <g stroke={INK} strokeWidth={1}>
      <line x1={X(x1)} y1={Y(y)} x2={X(x2)} y2={Y(y)} />
      <line x1={X(x1)} y1={Y(y) - 4} x2={X(x1)} y2={Y(y) + 4} />
      <line x1={X(x2)} y1={Y(y) - 4} x2={X(x2)} y2={Y(y) + 4} />
      <text x={X((x1 + x2) / 2)} y={Y(y) - 4} fontSize={9} textAnchor="middle" fill={INK} stroke="none" fontWeight={700}>
        {text}
      </text>
    </g>
  );
}

/** Потолок и свет по опции: Эконом — GX53 точки; Стандарт — теневой профиль + трек; Премиум — световые линии + магнитный трек. */
function Ceiling({ w, k, t, track = true }: { w: number; k: OptionKey; t: T; track?: boolean }) {
  const spots = Math.max(2, Math.round(w / 0.9));
  return (
    <g>
      <rect x={X(0)} y={Y(-0.06)} width={w * S} height={0.06 * S} fill="#f7f6f3" stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
      {k === 'eco' &&
        Array.from({ length: spots }).map((_, i) => (
          <circle key={i} cx={X(((i + 0.5) * w) / spots)} cy={Y(0)} r={4} fill="#fff8d6" stroke="#b8b09a" strokeWidth={1} />
        ))}
      {k === 'std' && (
        <g>
          <rect x={X(0)} y={Y(0)} width={w * S} height={2.5} fill="#333" />
          {track && (
            <g>
              <rect x={X(w * 0.15)} y={Y(0)} width={w * 0.7 * S} height={4} fill={t.hardware} />
              {[0.28, 0.5, 0.72].map((p) => (
                <g key={p}>
                  <rect x={X(w * p) - 5} y={Y(0.02)} width={10} height={12} fill={t.hardware} rx={2} />
                  <path d={`M ${X(w * p) - 14} ${Y(0.55)} L ${X(w * p)} ${Y(0.14)} L ${X(w * p) + 14} ${Y(0.55)} Z`} fill="#fff4c8" opacity={0.6} />
                </g>
              ))}
            </g>
          )}
        </g>
      )}
      {k === 'prem' && (
        <g>
          <rect x={X(0)} y={Y(0)} width={w * S} height={2.5} fill="#333" />
          <rect x={X(w * 0.12)} y={Y(0.01)} width={w * 0.76 * S} height={3} fill="#fff1bf" opacity={0.95} />
          <rect x={X(w * 0.12)} y={Y(0.03)} width={w * 0.76 * S} height={14} fill="#fff1bf" opacity={0.2} />
          {track && (
            <g>
              <rect x={X(w * 0.3)} y={Y(0)} width={w * 0.4 * S} height={4} fill={t.hardware} />
              {[0.38, 0.5, 0.62].map((p) => (
                <rect key={p} x={X(w * p) - 4} y={Y(0.02)} width={8} height={10} fill={t.hardware} rx={2} />
              ))}
            </g>
          )}
        </g>
      )}
    </g>
  );
}

function Frame({ w, walls, k, t, children, track = true }: { w: number; walls: { w: number; fill: string; title?: string }[]; k: OptionKey; t: T; children: React.ReactNode; track?: boolean }) {
  const W = X(w) + PAD;
  const Hh = Y(H) + 34;
  let acc = 0;
  return (
    <svg viewBox={`0 0 ${W} ${Hh}`} role="img">
      {walls.map((wl, i) => {
        const x0 = acc;
        acc += wl.w;
        return (
          <g key={i}>
            <rect x={X(x0)} y={Y(0)} width={wl.w * S} height={H * S} fill={wl.fill} />
            {i > 0 && <line x1={X(x0)} y1={Y(0)} x2={X(x0)} y2={Y(H)} stroke="rgba(0,0,0,0.35)" strokeWidth={2} strokeDasharray="4 3" />}
            {wl.title && <Label x={x0 + wl.w / 2} y={H + 0.3} text={wl.title} fs={9} bold />}
          </g>
        );
      })}
      {/* пол */}
      <rect x={X(0)} y={Y(H)} width={w * S} height={10} fill={t.floor} stroke="rgba(0,0,0,0.25)" />
      {/* плинтус */}
      <rect x={X(0)} y={Y(H) - 6} width={w * S} height={6} fill={k === 'prem' ? '#9a9a96' : k === 'std' ? t.walls : '#fff'} stroke="rgba(0,0,0,0.25)" />
      <Ceiling w={w} k={k} t={t} track={track} />
      {children}
      {/* высота */}
      <g stroke={INK} strokeWidth={1}>
        <line x1={X(w) + 10} y1={Y(0)} x2={X(w) + 10} y2={Y(H)} />
        <line x1={X(w) + 6} y1={Y(0)} x2={X(w) + 14} y2={Y(0)} />
        <line x1={X(w) + 6} y1={Y(H)} x2={X(w) + 14} y2={Y(H)} />
      </g>
      <text x={X(w) + 12} y={Y(H / 2)} fontSize={8} fill={INK} transform={`rotate(90 ${X(w) + 12} ${Y(H / 2)})`} textAnchor="middle">
        h ≈ 2.7 м (уточнить)
      </text>
    </svg>
  );
}

/* -------------------------------- КУХНЯ -------------------------------- */
function Kitchen({ k, t }: { k: OptionKey; t: T }) {
  const lowerFill = k === 'std' ? t.facade2 : t.facade;
  const upperFill = t.facade;
  const woodFill = k === 'prem' ? t.facade2 : upperFill;
  const counterH = 0.85;
  const cTop = H - counterH; // 1.85
  const upBottom = 1.35;
  return (
    <Frame w={5.3} k={k} t={t} walls={[{ w: 2.9, fill: t.walls, title: 'стена у окна · 2.9 м' }, { w: 2.4, fill: t.walls, title: 'правая стена · 2.4 м' }]}>
      {/* окно */}
      <Rect x={0.75} y={0.4} w={1.4} h={1.4} fill="#dbe9f3" stroke="#8a8a86" sw={2} rx={1} />
      <line x1={X(1.45)} y1={Y(0.4)} x2={X(1.45)} y2={Y(1.8)} stroke="#8a8a86" strokeWidth={2} />
      {/* фартук */}
      <Rect x={0} y={upBottom} w={2.9} h={cTop - upBottom} fill={k === 'eco' ? '#f3f3f0' : t.counter} stroke="none" />
      {k === 'eco' && (
        <g stroke="rgba(0,0,0,0.12)" strokeWidth={1}>
          {[0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7].map((x) => (
            <line key={x} x1={X(x)} y1={Y(upBottom)} x2={X(x)} y2={Y(cTop)} />
          ))}
          {[1.45, 1.6, 1.75].map((y) => (
            <line key={y} x1={X(0)} y1={Y(y)} x2={X(2.9)} y2={Y(y)} />
          ))}
        </g>
      )}
      <Rect x={2.9} y={upBottom} w={1.8} h={cTop - upBottom} fill={k === 'eco' ? '#f3f3f0' : t.counter} stroke="none" />
      {/* нижние шкафы — стена A */}
      <Rect x={0} y={cTop} w={2.9} h={counterH} fill={lowerFill} />
      {[0.6, 1.2, 1.8, 2.4].map((x) => (
        <line key={x} x1={X(x)} y1={Y(cTop)} x2={X(x)} y2={Y(H)} stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
      ))}
      {/* духовка под варочной (Эконом) */}
      {k === 'eco' && <Rect x={2.05} y={cTop + 0.1} w={0.6} h={0.6} fill="#3a3a3a" rx={2} />}
      {/* столешница */}
      <Rect x={0} y={cTop - 0.04} w={2.9} h={0.04} fill={t.counter} stroke="rgba(0,0,0,0.4)" rx={0} />
      <Rect x={2.9} y={cTop - 0.04} w={1.8} h={0.04} fill={t.counter} stroke="rgba(0,0,0,0.4)" rx={0} />
      {/* мойка под окном, варочная по центру */}
      <Rect x={0.8} y={cTop - 0.06} w={0.5} h={0.05} fill="#c9c9c5" stroke="#7a7a76" rx={3} />
      <line x1={X(1.05)} y1={Y(cTop - 0.06)} x2={X(1.05)} y2={Y(cTop - 0.28)} stroke={t.hardware} strokeWidth={3} strokeLinecap="round" />
      <Rect x={2.05} y={cTop - 0.05} w={0.6} h={0.04} fill="#1e1e1e" rx={1} />
      <Label x={2.35} y={cTop + 0.22} text="индукция" fs={7} color={k === 'std' ? '#fff' : INK} />
      {/* вытяжка */}
      <Rect x={2.05} y={1.0} w={0.6} h={0.3} fill={k === 'eco' ? '#dcdcd8' : '#4a4a4a'} rx={2} />
      {/* верхние шкафы до потолка — стена A */}
      <Rect x={0} y={0.06} w={0.75} h={upBottom - 0.06} fill={upperFill} />
      <Rect x={2.15} y={0.06} w={0.75} h={0.94} fill={upperFill} />
      {k === 'eco' && <Rect x={0.75} y={0.06} w={1.4} h={0.34} fill={upperFill} />}
      {/* стена B: колонна духовки / пенал, шкафы, холодильник */}
      <Rect x={2.9} y={0.06} w={0.6} h={H - 0.06} fill={woodFill} />
      {k !== 'eco' ? (
        <g>
          <Rect x={2.95} y={0.95} w={0.5} h={0.6} fill="#2a2a2a" rx={2} />
          <Rect x={2.98} y={1.02} w={0.44} h={0.4} fill="#4d4d4d" rx={1} />
          <Label x={3.2} y={1.7} text="духовка" fs={7} color={k === 'prem' ? '#fff' : INK} />
        </g>
      ) : (
        <Label x={3.2} y={1.4} text="пенал" fs={7} />
      )}
      <Rect x={3.5} y={0.06} w={1.2} h={upBottom - 0.06} fill={upperFill} />
      <line x1={X(4.1)} y1={Y(0.06)} x2={X(4.1)} y2={Y(upBottom)} stroke="rgba(0,0,0,0.25)" />
      <Rect x={3.5} y={cTop} w={1.2} h={counterH} fill={lowerFill} />
      <line x1={X(4.1)} y1={Y(cTop)} x2={X(4.1)} y2={Y(H)} stroke="rgba(0,0,0,0.25)" />
      {k !== 'eco' && <Label x={3.8} y={cTop + 0.45} text="ПММ" fs={7} color={k === 'std' ? '#fff' : INK} />}
      {/* холодильник крайний у входа */}
      <Rect x={4.7} y={k === 'prem' ? 0.06 : 0.25} w={0.6} h={k === 'prem' ? H - 0.06 : H - 0.25} fill={k === 'prem' ? woodFill : '#f4f4f2'} stroke="rgba(0,0,0,0.4)" rx={3} />
      <line x1={X(4.7)} y1={Y(1.15)} x2={X(5.3)} y2={Y(1.15)} stroke="rgba(0,0,0,0.3)" />
      <Label x={5.0} y={1.5} text={k === 'prem' ? 'встроенный' : 'холод.'} fs={7} color={k === 'prem' ? '#fff' : INK} />
      {k === 'prem' && <Label x={5.0} y={1.62} text="холод." fs={7} color="#fff" />}
      {/* ручки */}
      {k !== 'prem' &&
        [0.3, 0.9, 1.5, 2.1, 2.7, 3.8, 4.4].map((x) => <rect key={x} x={X(x) - 6} y={Y(cTop + 0.08)} width={12} height={3} fill={t.hardware} rx={1} />)}
      {k === 'prem' && <Rect x={0} y={cTop - 0.01} w={4.7} h={0.02} fill={t.hardware} stroke="none" />}
      {/* подписи */}
      <Label x={0.375} y={0.7} text="верх до" fs={7} />
      <Label x={0.375} y={0.82} text="потолка" fs={7} />
      <Label x={1.45} y={2.35} text={k === 'eco' ? 'модули Hoff / Лемана' : k === 'std' ? 'Hoff на заказ · кашемир + графит' : 'фабрика «Мария» · эмаль + орех'} fs={7} color={k === 'std' ? '#fff' : INK} />
      <Label x={1.45} y={1.63} text={k === 'eco' ? 'фартук «кабанчик»' : k === 'prem' ? 'фартук — кварц' : 'фартук из столешницы'} fs={7} op={0.8} />
      <Dim x1={0} x2={2.9} y={H + 0.18} text="2.9 м" />
      <Dim x1={2.9} x2={5.3} y={H + 0.18} text="2.4 м" />
    </Frame>
  );
}

/* ---------------------------------- ЗАЛ ---------------------------------- */
function Living({ k, t }: { k: OptionKey; t: T }) {
  const tvW = k === 'eco' ? 1.1 : k === 'std' ? 1.23 : 1.45;
  const tvH = tvW * 0.5625;
  const tvX = 1.85 - tvW / 2;
  const tvY = 1.55 - tvH / 2;
  return (
    <Frame w={3.7} k={k} t={t} walls={[{ w: 3.7, fill: t.accent, title: k === 'prem' ? 'стена с ТВ напротив дивана · 3.7 м (микроцемент / панели)' : 'стена с ТВ напротив дивана · 3.7 м (акцентные обои)' }]} track={false}>
      {/* ниша с подсветкой (Премиум) */}
      {k === 'prem' && <Rect x={tvX - 0.04} y={tvY - 0.2} w={tvW + 0.08} h={tvH + 0.72} fill="rgba(255,241,191,0.35)" stroke="rgba(0,0,0,0.25)" rx={3} />}
      {/* ТВ */}
      <Rect x={tvX} y={tvY} w={tvW} h={tvH} fill="#111" stroke="#333" rx={2} />
      <Label x={1.85} y={tvY + tvH / 2 + 0.03} text={k === 'eco' ? 'ТВ 50"' : k === 'std' ? 'ТВ 55"' : 'ТВ 65" OLED'} fs={9} color="#fff" bold />
      {/* тумба / панель / консоль */}
      {k === 'eco' && (
        <g>
          <Rect x={tvX - 0.1} y={2.25} w={tvW + 0.2} h={0.45} fill="#fff" />
          {[0.33, 0.66].map((p) => (
            <line key={p} x1={X(tvX - 0.1 + (tvW + 0.2) * p)} y1={Y(2.25)} x2={X(tvX - 0.1 + (tvW + 0.2) * p)} y2={Y(H)} stroke="rgba(0,0,0,0.3)" />
          ))}
          <Label x={1.85} y={2.5} text="стеллаж Hoff" fs={7} />
        </g>
      )}
      {k === 'std' && (
        <g>
          <Rect x={tvX - 0.25} y={2.2} w={tvW + 0.5} h={0.4} fill={t.facade} />
          <line x1={X(1.85)} y1={Y(2.2)} x2={X(1.85)} y2={Y(2.6)} stroke="rgba(0,0,0,0.3)" />
          <Label x={1.85} y={2.45} text="ТВ-панель с закрытым хранением" fs={7} />
        </g>
      )}
      {k === 'prem' && (
        <g>
          <Rect x={tvX - 0.15} y={2.25} w={tvW + 0.3} h={0.3} fill={t.facade2} />
          <Rect x={tvX - 0.15} y={2.55} w={tvW + 0.3} h={0.03} fill="rgba(255,241,191,0.9)" stroke="none" />
          <Label x={1.85} y={2.45} text="консоль на заказ, орех" fs={7} color="#fff" />
        </g>
      )}
      {/* стеллаж у окна (слева) */}
      <Rect x={0.15} y={0.06} w={0.6} h={H - 0.06} fill={k === 'eco' ? '#fff' : t.facade} />
      {[0.7, 1.35, 2.0].map((y) => (
        <line key={y} x1={X(0.15)} y1={Y(y)} x2={X(0.75)} y2={Y(y)} stroke="rgba(0,0,0,0.3)" />
      ))}
      <Label x={0.45} y={0.45} text="стеллаж" fs={7} />
      {/* торшер / бра */}
      {k !== 'prem' ? (
        <g>
          <line x1={X(3.3)} y1={Y(1.1)} x2={X(3.3)} y2={Y(H)} stroke={t.hardware} strokeWidth={2} />
          <path d={`M ${X(3.2)} ${Y(1.1)} L ${X(3.4)} ${Y(1.1)} L ${X(3.36)} ${Y(0.9)} L ${X(3.24)} ${Y(0.9)} Z`} fill="#f3ecd9" stroke={t.hardware} />
        </g>
      ) : (
        <g>
          <line x1={X(3.3)} y1={Y(1.05)} x2={X(3.3)} y2={Y(H)} stroke={t.hardware} strokeWidth={2} />
          <circle cx={X(3.3)} cy={Y(0.95)} r={9} fill="#fff1bf" stroke={t.hardware} />
        </g>
      )}
      <Label x={3.3} y={0.8} text="торшер" fs={6} />
      {/* диван спиной к зрителю и ковёр */}
      <rect x={X(0.75)} y={Y(2.62)} width={2.2 * S} height={22} fill={t.accent} opacity={0.55} rx={3} />
      <Rect x={0.8} y={1.95} w={2.1} h={0.75} fill={t.textile} stroke="rgba(0,0,0,0.35)" rx={8} op={0.95} />
      <Rect x={0.8} y={1.95} w={2.1} h={0.12} fill="rgba(0,0,0,0.15)" stroke="none" rx={6} />
      <Label x={1.85} y={2.4} text={k === 'eco' ? 'диван 220 см, рогожка' : k === 'std' ? 'диван 220 см, велюр горчица' : 'модульный диван, лён'} fs={8} color="#fff" bold />
      <Label x={1.85} y={2.55} text="дистанция до ТВ ≈ 2.3 м" fs={7} color="#fff" />
      <Dim x1={0} x2={3.7} y={H + 0.18} text="3.7 м" />
    </Frame>
  );
}

/* ------------------------------- СПАЛЬНЯ ------------------------------- */
function Bedroom({ k, t }: { k: OptionKey; t: T }) {
  return (
    <Frame w={3.0} k={k} t={t} walls={[{ w: 3.0, fill: t.walls, title: 'стена изголовья · 3.0 м' }]} track={false}>
      {/* изголовье */}
      {k === 'eco' && <Rect x={0.7} y={1.85} w={1.6} h={0.4} fill={t.wood} rx={2} />}
      {k === 'std' && <Rect x={0.65} y={1.6} w={1.7} h={0.65} fill={t.textile} rx={10} />}
      {k === 'prem' && (
        <g>
          <Rect x={0.2} y={1.2} w={2.6} h={1.05} fill={t.facade2} rx={3} />
          <rect x={X(0.2)} y={Y(1.2) - 3} width={2.6 * S} height={3} fill="#fff1bf" opacity={0.95} />
          <rect x={X(0.2)} y={Y(1.2) - 16} width={2.6 * S} height={13} fill="#fff1bf" opacity={0.25} />
          <Label x={1.5} y={1.4} text="изголовье во всю стену + парящая подсветка" fs={7} color="#fff" />
        </g>
      )}
      {/* кровать */}
      <Rect x={0.7} y={2.25} w={1.6} h={0.45} fill={k === 'eco' ? '#fff' : t.textile} rx={4} />
      <Rect x={0.72} y={2.2} w={1.56} h={0.16} fill="#faf8f3" stroke="rgba(0,0,0,0.25)" rx={4} />
      <Label x={1.5} y={2.55} text="кровать 160×200" fs={9} color={k === 'eco' ? INK : '#fff'} bold />
      {/* тумбы */}
      <Rect x={0.15} y={2.25} w={0.5} h={0.45} fill={t.wood} rx={2} />
      <Rect x={2.35} y={2.25} w={0.5} h={0.45} fill={t.wood} rx={2} />
      <Label x={0.4} y={2.5} text="тумба" fs={7} color="#fff" />
      <Label x={2.6} y={2.5} text="тумба" fs={7} color="#fff" />
      {/* бра на 120–140 см */}
      {[0.4, 2.6].map((x) => (
        <g key={x}>
          <rect x={X(x) - 3} y={Y(1.35)} width={6} height={18} fill={t.hardware} rx={1} />
          <path d={`M ${X(x) - 12} ${Y(1.35)} L ${X(x) + 12} ${Y(1.35)} L ${X(x) + 8} ${Y(1.2)} L ${X(x) - 8} ${Y(1.2)} Z`} fill="#f3ecd9" stroke={t.hardware} />
        </g>
      ))}
      <Label x={0.4} y={1.1} text="бра" fs={7} />
      <Label x={2.6} y={1.1} text="бра" fs={7} />
      {/* потолочный свет */}
      {k === 'std' && (
        <g>
          <rect x={X(1.2)} y={Y(0)} width={0.6 * S} height={3} fill={t.hardware} />
          <Label x={1.5} y={0.2} text="скрытый карниз / диммер" fs={7} op={0.8} />
        </g>
      )}
      {k === 'prem' && <Label x={1.5} y={0.28} text="парящий потолок, световая линия" fs={7} op={0.8} />}
      {k === 'eco' && <Label x={1.5} y={0.28} text="точечные GX53" fs={7} op={0.8} />}
      <Dim x1={0.7} x2={2.3} y={2.05 + (k === 'eco' ? -0.35 : k === 'std' ? -0.6 : -1.0)} text="160" />
      <Dim x1={0} x2={3.0} y={H + 0.18} text="3.0 м" />
    </Frame>
  );
}

/* ------------------------------- ДЕТСКАЯ ------------------------------- */
function Kids({ k, t }: { k: OptionKey; t: T }) {
  const accentFill = k === 'eco' ? t.walls : k === 'std' ? t.accent : '#3b3b3b';
  return (
    <Frame
      w={7.0}
      k={k}
      t={t}
      walls={[
        { w: 3.7, fill: accentFill, title: k === 'prem' ? 'стена кровати · 3.7 м · магнитно-маркерная' : k === 'std' ? 'стена кровати · 3.7 м · рейки, краска «шалфей»' : 'стена кровати · 3.7 м · светлые обои (акцент краской — не в смете Эконом)' },
        { w: 3.3, fill: t.walls, title: 'стена окна · 3.3 м' },
      ]}
    >
      {/* рейки (Стандарт) */}
      {k === 'std' &&
        Array.from({ length: 24 }).map((_, i) => <rect key={i} x={X(0.1 + i * 0.15)} y={Y(0.06)} width={5} height={(H - 0.06) * S} fill={t.wood} opacity={0.9} />)}
      {/* раздвижная кровать 80×130→190 */}
      <Rect x={0.5} y={2.3} w={1.3} h={0.4} fill={t.wood} rx={3} />
      <Rect x={1.8} y={2.35} w={0.6} h={0.35} fill={t.wood} rx={3} op={0.55} />
      <rect x={X(1.8)} y={Y(2.35)} width={0.6 * S} height={0.35 * S} fill="none" stroke={INK} strokeDasharray="4 3" />
      <Rect x={0.52} y={2.25} w={1.26} h={0.14} fill="#faf8f3" stroke="rgba(0,0,0,0.25)" rx={3} />
      <Rect x={0.35} y={1.85} w={0.2} h={0.85} fill={t.wood} rx={2} />
      <Label x={1.15} y={2.55} text="кровать 130" fs={8} color="#fff" bold />
      <Label x={2.1} y={2.58} text="→190" fs={8} bold />
      <Label x={1.15} y={1.75} text={k === 'std' ? 'с ящиками, мягкое изголовье' : k === 'prem' ? 'на заказ, трансформер' : 'растущая, Hoff'} fs={7} color={k === 'prem' ? '#fff' : INK} />
      {/* ночник */}
      <rect x={X(0.25)} y={Y(1.35)} width={6} height={14} fill={t.hardware} rx={1} />
      <Label x={0.28} y={1.28} text="ночник" fs={7} color={k === 'prem' ? '#fff' : INK} />
      {/* окно и стол у окна */}
      <Rect x={4.35} y={0.4} w={1.5} h={1.4} fill="#dbe9f3" stroke="#8a8a86" sw={2} rx={1} />
      <line x1={X(5.1)} y1={Y(0.4)} x2={X(5.1)} y2={Y(1.8)} stroke="#8a8a86" strokeWidth={2} />
      <Rect x={4.5} y={1.95} w={1.2} h={0.05} fill={t.wood} rx={1} />
      <line x1={X(4.55)} y1={Y(2.0)} x2={X(4.55)} y2={Y(H)} stroke={t.hardware} strokeWidth={3} />
      <line x1={X(5.65)} y1={Y(2.0)} x2={X(5.65)} y2={Y(H)} stroke={t.hardware} strokeWidth={3} />
      <Label x={5.1} y={2.35} text="стол 120×60 у окна" fs={8} bold />
      <Label x={5.1} y={2.5} text={k === 'eco' ? 'стул регулируемый' : 'растущий стол, ортопедический стул'} fs={7} op={0.8} />
      {/* лампа настольная */}
      <line x1={X(5.6)} y1={Y(1.95)} x2={X(5.6)} y2={Y(1.7)} stroke={t.hardware} strokeWidth={2} />
      <path d={`M ${X(5.5)} ${Y(1.7)} L ${X(5.7)} ${Y(1.7)} L ${X(5.66)} ${Y(1.58)} L ${X(5.54)} ${Y(1.58)} Z`} fill="#f3ecd9" stroke={t.hardware} />
      {/* стеллаж 50×140 */}
      <Rect x={6.35} y={1.3} w={0.5} h={1.4} fill={k === 'eco' ? '#fff' : t.facade} />
      {[1.65, 2.0, 2.35].map((y) => (
        <line key={y} x1={X(6.35)} y1={Y(y)} x2={X(6.85)} y2={Y(y)} stroke="rgba(0,0,0,0.3)" />
      ))}
      <Label x={6.6} y={1.2} text="полки 50×140" fs={7} />
      {/* шкаф 160×60 — обозначение на стене окна слева */}
      <Rect x={3.75} y={0.06} w={0.55} h={H - 0.06} fill={t.facade} />
      <Label x={4.02} y={1.3} text="шкаф" fs={7} />
      <Label x={4.02} y={1.42} text="160×60" fs={6} />
      <Label x={4.02} y={1.54} text="(торец)" fs={6} op={0.7} />
      {k === 'prem' && <Label x={1.85} y={0.5} text="магнитно-маркерная стена, трек-свет с диммером" fs={7} color="#fff" />}
      {k === 'std' && <Label x={1.85} y={0.5} text="пробковая доска над столом" fs={7} color="#fff" />}
      <Dim x1={0} x2={3.7} y={H + 0.18} text="3.7 м" />
      <Dim x1={3.7} x2={7.0} y={H + 0.18} text="3.3 м" />
    </Frame>
  );
}

/* ------------------------------- ДУШЕВАЯ ------------------------------- */
function Bath({ k, t }: { k: OptionKey; t: T }) {
  const tile = '#ecebe7';
  const wood = '#c9a27a';
  const hw = t.hardware;
  const vanityW = k === 'eco' ? 0.5 : 0.6;
  return (
    <Frame w={3.35} k={k} t={t} walls={[{ w: 1.6, fill: tile, title: 'стена подиума · 1.6 м' }, { w: 1.75, fill: tile, title: 'стена раковины · 1.75 м' }]} track={false}>
      {/* плитка (уже уложена) */}
      <g stroke="rgba(0,0,0,0.08)" strokeWidth={1}>
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`v${i}`} x1={X(i * 0.3 + 0.1)} y1={Y(0)} x2={X(i * 0.3 + 0.1)} y2={Y(H)} />
        ))}
        {Array.from({ length: 4 }).map((_, i) => (
          <line key={`h${i}`} x1={X(0)} y1={Y(0.6 * (i + 1))} x2={X(3.35)} y2={Y(0.6 * (i + 1))} />
        ))}
      </g>
      {/* ниша душа «под дерево», подиум 90×90 с трапом */}
      <Rect x={0.1} y={0.06} w={0.9} h={2.49} fill={wood} stroke="none" op={0.8} />
      {[0.6, 1.1, 1.6, 2.1].map((y) => (
        <line key={y} x1={X(0.1)} y1={Y(y)} x2={X(1.0)} y2={Y(y)} stroke="rgba(0,0,0,0.15)" />
      ))}
      <Rect x={0.1} y={2.55} w={0.9} h={0.15} fill="#d9d4cb" />
      <rect x={X(0.2)} y={Y(2.63)} width={0.7 * S} height={3} fill="#8a8a86" />
      <Label x={0.55} y={2.5} text="подиум 90×90, трап" fs={7} />
      {/* смеситель + стойка с верхним душем (выводы готовы) */}
      <line x1={X(0.55)} y1={Y(0.45)} x2={X(0.55)} y2={Y(1.6)} stroke={hw} strokeWidth={3} />
      <line x1={X(0.55)} y1={Y(0.45)} x2={X(0.8)} y2={Y(0.45)} stroke={hw} strokeWidth={3} />
      <rect x={X(0.68)} y={Y(0.42)} width={24} height={5} fill={hw} rx={2} />
      <rect x={X(0.45)} y={Y(1.55)} width={20} height={9} fill={hw} rx={2} />
      <rect x={X(0.66)} y={Y(1.1)} width={5} height={22} fill={hw} rx={2} />
      <Label x={0.55} y={1.85} text={k === 'eco' ? 'Iddis' : k === 'std' ? 'Lemark / Grohe' : 'Hansgrohe'} fs={7} />
      {/* ограждение: шторка (Эконом) / стекло 8 мм (Стандарт) / стекло 10 мм в латуни (Премиум) */}
      {k === 'eco' ? (
        <g>
          <line x1={X(0.05)} y1={Y(0.35)} x2={X(1.05)} y2={Y(0.35)} stroke={hw} strokeWidth={3} />
          <path d={`M ${X(1.0)} ${Y(0.36)} ${Array.from({ length: 8 }).map((_, i) => `Q ${X(1.06)} ${Y(0.36 + i * 0.27 + 0.13)} ${X(1.0)} ${Y(0.36 + (i + 1) * 0.27)}`).join(' ')}`} fill="none" stroke="#8fb0c8" strokeWidth={3} />
          <Label x={1.2} y={1.3} text="шторка" fs={7} anchor="start" />
        </g>
      ) : (
        <g>
          <rect x={X(1.0) - 2} y={Y(0.55)} width={5} height={2.0 * S} fill={GLASS} stroke={GLASS_EDGE} />
          {k === 'prem' && <rect x={X(1.0) - 4} y={Y(0.55)} width={9} height={2.0 * S} fill="none" stroke={hw} strokeWidth={2} />}
          <line x1={X(0.85)} y1={Y(0.55)} x2={X(1.0)} y2={Y(0.55)} stroke={hw} strokeWidth={3} />
          <Label x={1.1} y={1.3} text={k === 'std' ? 'стекло 8 мм' : 'стекло 10 мм'} fs={7} anchor="start" />
          <Label x={1.1} y={1.42} text={k === 'std' ? 'Walk-In' : 'латунный профиль'} fs={7} anchor="start" />
        </g>
      )}
      {/* тумба с раковиной, зеркало */}
      {k === 'eco' ? (
        <Rect x={1.75} y={1.95} w={vanityW} h={0.75} fill="#fff" rx={2} />
      ) : (
        <Rect x={1.75} y={1.95} w={vanityW} h={0.5} fill={k === 'std' ? t.facade : t.facade2} rx={2} />
      )}
      <Rect x={1.72} y={1.9} w={vanityW + 0.06} h={0.08} fill="#f7f7f5" stroke="rgba(0,0,0,0.4)" rx={4} />
      <line x1={X(1.75 + vanityW / 2)} y1={Y(1.9)} x2={X(1.75 + vanityW / 2)} y2={Y(1.7)} stroke={hw} strokeWidth={3} strokeLinecap="round" />
      <Label x={1.75 + vanityW / 2} y={2.25} text={`тумба ${Math.round(vanityW * 100)}`} fs={7} color={k === 'eco' || k === 'std' ? INK : '#fff'} />
      {k !== 'eco' && <Label x={1.75 + vanityW / 2} y={2.37} text="подвесная" fs={6} color={k === 'std' ? INK : '#fff'} />}
      <Rect x={1.78} y={0.7} w={vanityW - 0.06} h={0.9} fill="#e6eef3" stroke={k === 'eco' ? hw : 'rgba(0,0,0,0.25)'} rx={k === 'prem' ? 30 : 3} />
      {k !== 'eco' && <rect x={X(1.78) - 4} y={Y(0.7) - 4} width={(vanityW - 0.06) * S + 8} height={0.9 * S + 8} fill="none" stroke="#fff1bf" strokeWidth={4} rx={k === 'prem' ? 34 : 6} opacity={0.9} />}
      <Label x={1.75 + vanityW / 2} y={1.2} text="зеркало" fs={7} />
      {k !== 'eco' && <Label x={1.75 + vanityW / 2} y={1.32} text="с подсветкой" fs={6} op={0.8} />}
      {/* полотенцесушитель электрический */}
      <g stroke={hw} strokeWidth={3}>
        <line x1={X(2.7)} y1={Y(0.9)} x2={X(2.7)} y2={Y(1.8)} />
        <line x1={X(3.15)} y1={Y(0.9)} x2={X(3.15)} y2={Y(1.8)} />
        {[1.0, 1.2, 1.4, 1.6, 1.75].map((y) => (
          <line key={y} x1={X(2.7)} y1={Y(y)} x2={X(3.15)} y2={Y(y)} />
        ))}
      </g>
      <Label x={2.92} y={1.95} text="полотенцесушитель" fs={6} />
      <Label x={2.92} y={2.06} text="электрический" fs={6} op={0.8} />
      <Dim x1={0} x2={1.6} y={H + 0.18} text="1.6 м" />
      <Dim x1={1.6} x2={3.35} y={H + 0.18} text="1.75 м" />
    </Frame>
  );
}

export default function Elevations({ opt }: { opt: Option }) {
  const k = opt.key;
  const t = opt.tokens;
  const items: { key: string; title: string; desc: string; el: React.ReactNode; wide?: boolean }[] = [
    { key: 'kitchen', title: 'Кухня 11.8 м² — Г-образный гарнитур 2.9 + 2.4 м (+ ТВ 32–43" на стене у обеденной зоны)', desc: opt.rooms.kitchen, el: <Kitchen k={k} t={t} />, wide: true },
    { key: 'living', title: 'Зал 12.2 м² (бывшая гостиная) — стена с ТВ напротив дивана', desc: opt.rooms.living, el: <Living k={k} t={t} /> },
    { key: 'bedroom', title: 'Спальня 11.7 м² — стена изголовья', desc: opt.rooms.bedroom, el: <Bedroom k={k} t={t} /> },
    { key: 'bath', title: 'Душевая 2.8 м² — подиум и раковина', desc: opt.rooms.bath, el: <Bath k={k} t={t} /> },
    { key: 'kids', title: 'Зал 12.2 м² — вариант «потом детская»: стена кровати и стена окна', desc: `На вырост, когда зал станет детской: ${opt.rooms.kids}`, el: <Kids k={k} t={t} />, wide: true },
  ];
  return (
    <section className="section" id="rooms" aria-labelledby="rooms-h">
      <div className="wrap">
        <div className="kicker">Развёртки комнат · {opt.name}</div>
        <h2 id="rooms-h">Пять комнат в цветах опции</h2>
        <p className="lead">
          Схематичные развёртки стен: пропорции по размерам планировочного решения; высота потолка принята 2.7 м — по плану не видна, уточнить
          замером. Цвета — стены, пол, фасады, текстиль и фурнитура выбранной опции.
        </p>
        <div className="elev-grid">
          {items.map((it) => (
            <figure className={it.wide ? 'figure wide' : 'figure'} key={it.key} style={{ margin: 0 }}>
              <h3>{it.title}</h3>
              <p className="desc">{it.desc}</p>
              {it.el}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
