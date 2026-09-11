import { useCallback, useEffect, useState } from 'react';
import { OPTIONS, OPTION_KEYS, type OptionKey } from './data/options';
import estimate from './data/estimate.json';
import Hero from './components/Hero';
import OptionBar from './components/OptionBar';
import Concept from './components/Concept';
import Plan from './components/Plan';
import Elevations from './components/Elevations';
import Photos from './components/Photos';
import Budget from './components/Budget';
import Shopping from './components/Shopping';
import WorkOrder from './components/WorkOrder';
import Footer from './components/Footer';

function readHash(): OptionKey {
  const h = window.location.hash.replace('#', '') as OptionKey;
  return OPTION_KEYS.includes(h) ? h : 'std';
}

export default function App() {
  const [key, setKey] = useState<OptionKey>(() => (typeof window === 'undefined' ? 'std' : readHash()));

  useEffect(() => {
    const onHash = () => setKey(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const select = useCallback((k: OptionKey) => {
    setKey(k);
    if (window.location.hash !== `#${k}`) history.replaceState(null, '', `#${k}`);
  }, []);

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
    <div data-option={key} style={style}>
      <Hero current={key} onSelect={select} estimate={estimate} />
      <OptionBar current={key} onSelect={select} estimate={estimate} />
      <main>
        <Concept opt={opt} />
        <Plan opt={opt} estimate={estimate} />
        <Elevations opt={opt} />
        <Photos opt={opt} />
        <Budget opt={opt} estimate={estimate} />
        <Shopping opt={opt} estimate={estimate} />
        <WorkOrder estimate={estimate} />
      </main>
      <Footer estimate={estimate} />
    </div>
  );
}
