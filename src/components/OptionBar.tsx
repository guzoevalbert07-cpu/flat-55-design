import { OPTIONS, OPTION_KEYS, type OptionKey } from '../data/options';
import { pick, rubShort } from '../lib/format';
import type { Estimate } from '../types';

type Props = { current: OptionKey; onSelect: (k: OptionKey) => void; estimate: Estimate };

export default function OptionBar({ current, onSelect, estimate }: Props) {
  const grand = estimate.totalsByBlock.grand;
  return (
    <nav className="switch" aria-label="Переключатель опций">
      <div className="wrap">
        <span className="title">55 м² · 3 опции</span>
        <div className="seg" role="group">
          {OPTION_KEYS.map((k) => (
            <button key={k} aria-pressed={current === k} onClick={() => onSelect(k)}>
              {OPTIONS[k].name}
              <span className="p">{rubShort(pick(grand, k))}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
