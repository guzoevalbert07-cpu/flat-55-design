import { useCallback, useEffect, useState } from 'react';
import { OPTIONS, OPTION_KEYS, type OptionKey } from './data/options';
import estimate from './data/estimate.json';
import Hero from './components/Hero';
import OptionBar from './components/OptionBar';
import Concept from './components/Concept';
import Plan from './components/Plan';
import Elevations from './components/Elevations';
import Renders from './components/Renders';
import Budget from './components/Budget';
import Shopping from './components/Shopping';
import WorkOrder from './components/WorkOrder';
import Footer from './components/Footer';
import Mix, { LETTER, majority, mixSections, parseMix } from './components/Mix';
import { LightboxProvider } from './components/Lightbox';

const SECTION_COUNT = mixSections(estimate).length;

function readHash(): { key: OptionKey; mix: OptionKey[] | null } {
  const h = window.location.hash;
  const mix = parseMix(h, SECTION_COUNT);
  if (mix) return { key: majority(mix), mix };
  const k = h.replace('#', '') as OptionKey;
  return { key: OPTION_KEYS.includes(k) ? k : 'std', mix: null };
}

export default function App() {
  const [state, setState] = useState<{ key: OptionKey; mix: OptionKey[] | null }>(() => (typeof window === 'undefined' ? { key: 'std', mix: null } : readHash()));
  const key = state.key;

  useEffect(() => {
    const onHash = () => setState(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const select = useCallback((k: OptionKey) => {
    setState({ key: k, mix: null });
    if (window.location.hash !== `#${k}`) history.replaceState(null, '', `#${k}`);
  }, []);

  const setMix = useCallback((m: OptionKey[] | null) => {
    if (!m) return select('std');
    const uniform = m.every((x) => x === m[0]);
    if (uniform) return select(m[0]);
    setState({ key: majority(m), mix: m });
    history.replaceState(null, '', `#mix=${m.map((x) => LETTER[x]).join('')}`);
  }, [select]);

  const opt = OPTIONS[key];
  const t = opt.tokens;
  const style = {
    '--walls': t.walls,
    '--accent': t.accent,
    '--floor': t.floor,
    '--facade': t.facade,
    '--facade2': t.facade2,
    '--counter': t.counter,
    '--textile': t.textile,
    '--hardware': t.hardware,
    '--wood': t.wood,
  } as React.CSSProperties;

  return (
    <LightboxProvider>
    <div data-option={key} style={style}>
      <Hero current={key} onSelect={select} estimate={estimate} />
      <OptionBar current={key} onSelect={select} estimate={estimate} />
      <main>
        <Concept opt={opt} />
        <Plan opt={opt} estimate={estimate} />
        <Elevations opt={opt} />
        <Renders opt={opt} />
        <Budget opt={opt} estimate={estimate} />
        <Mix estimate={estimate} current={key} mix={state.mix} onMix={setMix} />
        <Shopping opt={opt} estimate={estimate} />
        <WorkOrder estimate={estimate} />
      </main>
      <Footer estimate={estimate} />
    </div>
    </LightboxProvider>
  );
}
