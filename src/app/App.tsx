import { useEffect, useState } from 'react';
import { getMood } from '../core/music/moods';
import { useApp } from '../state/store';
import { GardenCanvas } from '../ui/components/GardenCanvas';
import { Landing } from '../ui/components/Landing';
import { TopBar } from '../ui/components/TopBar';
import { Dock } from '../ui/components/Dock';
import { Drawer } from '../ui/components/Drawer';
import { Lens } from '../ui/components/Lens';
import { KeepDialog } from '../ui/components/KeepDialog';
import { HelpDialog } from '../ui/components/HelpDialog';
import { Breathing } from '../ui/components/Breathing';
import { Toasts } from '../ui/components/Toasts';
import { useReducedMotion, useShortcuts } from '../ui/hooks';
import './controller';

export function App() {
  const phase = useApp((s) => s.phase);
  const zen = useApp((s) => s.zen);
  const mood = useApp((s) => s.mood);
  const drawerOpen = useApp((s) => s.drawerOpen);
  const lensOpen = useApp((s) => s.lensOpen);
  const breathing = useApp((s) => s.settings.breathing);
  const reduced = useReducedMotion();
  const [showLanding, setShowLanding] = useState(true);
  useShortcuts();

  // mood colours flow into the CSS tokens (registered custom properties crossfade over 3 s)
  useEffect(() => {
    const p = getMood(mood).palette;
    const root = document.documentElement;
    root.style.setProperty('--accent', p.accent);
    root.style.setProperty('--accent-2', p.accent2);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.bg0);
  }, [mood]);

  useEffect(() => {
    if (phase !== 'garden') return;
    const t = window.setTimeout(() => setShowLanding(false), 1200);
    return () => window.clearTimeout(t);
  }, [phase]);

  // zen: any click brings the controls back; the cursor hides after 3 s of stillness
  useEffect(() => {
    if (!zen) return;
    const wake = () => useApp.getState().ui({ zen: false });
    let idle = window.setTimeout(() => document.body.style.setProperty('cursor', 'none'), 3000);
    const move = () => {
      document.body.style.removeProperty('cursor');
      window.clearTimeout(idle);
      idle = window.setTimeout(() => document.body.style.setProperty('cursor', 'none'), 3000);
    };
    window.addEventListener('pointerdown', wake);
    window.addEventListener('pointermove', move);
    return () => {
      window.clearTimeout(idle);
      document.body.style.removeProperty('cursor');
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('pointermove', move);
    };
  }, [zen]);

  return (
    <div className={`stage ${reduced ? 'reduce-motion' : ''}`}>
      <GardenCanvas />
      {phase === 'garden' && (
        <div className={`ui-layer ${zen ? 'is-zen' : ''} ${drawerOpen ? 'has-drawer' : ''}`} inert={zen || undefined}>
          <TopBar />
          {lensOpen && <Lens />}
          {drawerOpen && <Drawer />}
          {breathing && <Breathing />}
          <main aria-label="Seedsong garden">
            <h1 className="sr-only">Seedsong</h1>
            <Dock />
          </main>
        </div>
      )}
      {showLanding && <Landing leaving={phase === 'garden'} />}
      <KeepDialog />
      <HelpDialog />
      <Toasts />
      {zen && (
        <p className="sr-only" role="status">
          Zen mode. Press any key to show the controls.
        </p>
      )}
    </div>
  );
}
