import { useEffect, useState } from 'react';

/** inhale 4 s, exhale 6 s: about six calm breaths a minute */
export function Breathing() {
  const [phase, setPhase] = useState<'in' | 'out'>('out');
  useEffect(() => {
    let t: number;
    const step = (p: 'in' | 'out') => {
      setPhase(p);
      t = window.setTimeout(() => step(p === 'in' ? 'out' : 'in'), p === 'in' ? 4000 : 6000);
    };
    t = window.setTimeout(() => step('in'), 400);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className={`breath ${phase}`} aria-hidden="true">
      <div className="breath-ring" />
      <span className="breath-label">{phase === 'in' ? 'Breathe in' : 'Breathe out'}</span>
    </div>
  );
}
