import { useEffect, useState } from 'react';
import { CircleQuestionMark, CodeXml, EyeOff, Maximize, Minimize, SlidersHorizontal } from 'lucide-react';
import { getMood } from '../../core/music/moods';
import { getWorld } from '../../core/worlds/registry';
import { useApp } from '../../state/store';
import { Glyph } from './Glyph';

export function TopBar() {
  const world = useApp((s) => s.world);
  const mood = useApp((s) => s.mood);
  const seed = useApp((s) => s.seed);
  const drawerOpen = useApp((s) => s.drawerOpen);
  const lensOpen = useApp((s) => s.lensOpen);
  const ui = useApp((s) => s.ui);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const on = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <header className="topbar">
      <div className="brand">
        <Glyph />
        <span className="brand-name">Seedsong</span>
        <span className="brand-sub">
          {getWorld(world).name} · {getMood(mood).name} · <span translate="no">{seed}</span>
        </span>
      </div>
      <nav className="top-actions glass" aria-label="View">
        <button className="icon-btn" aria-pressed={lensOpen} onClick={() => ui({ lensOpen: !lensOpen })} aria-label="Recursion lens (L)" title="Recursion lens (L)">
          <CodeXml aria-hidden="true" />
        </button>
        <button className="icon-btn" onClick={() => ui({ helpOpen: true })} aria-label="Help and shortcuts (?)" title="Help and shortcuts (?)">
          <CircleQuestionMark aria-hidden="true" />
        </button>
        <button className="icon-btn hide-xs" onClick={() => ui({ zen: true, drawerOpen: false })} aria-label="Zen mode: hide everything (Z)" title="Zen mode (Z)">
          <EyeOff aria-hidden="true" />
        </button>
        <button className="icon-btn hide-xs" onClick={toggleFull} aria-label={full ? 'Exit full screen' : 'Full screen'} title={full ? 'Exit full screen' : 'Full screen'}>
          {full ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
        </button>
        <button className="icon-btn" aria-expanded={drawerOpen} aria-controls="drawer" onClick={() => ui({ drawerOpen: !drawerOpen })} aria-label="Shape your garden" title="Shape your garden">
          <SlidersHorizontal aria-hidden="true" />
        </button>
      </nav>
    </header>
  );
}
