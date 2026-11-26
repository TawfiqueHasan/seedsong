import { useEffect, useMemo, useRef } from 'react';
import { engine } from '../../audio/engine';
import { getMood } from '../../core/music/moods';
import { SCALE_NAMES } from '../../core/music/theory';
import { GardenRenderer } from '../../viz/renderer';
import { useApp } from '../../state/store';
import { useMediaQuery, useReducedMotion } from '../hooks';

export function GardenCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<GardenRenderer | null>(null);
  const version = useApp((s) => s.version);
  const mood = useApp((s) => s.mood);
  const phase = useApp((s) => s.phase);
  const drawerOpen = useApp((s) => s.drawerOpen);
  const lensOpen = useApp((s) => s.lensOpen);
  const zen = useApp((s) => s.zen);
  const score = useApp((s) => s.score);
  const trace = useApp((s) => s.trace);
  const reduced = useReducedMotion();
  const narrow = useMediaQuery('(max-width: 760px)');
  const compact = useMediaQuery('(max-width: 920px)');

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const r = new GardenRenderer(canvas, getMood(useApp.getState().mood).palette, { maxDpr: narrow ? 1.5 : 2 });
    renderer.current = r;
    const resize = () => r.resize(window.innerWidth, window.innerHeight);
    resize();
    window.addEventListener('resize', resize);
    let raf = 0;
    const loop = () => {
      const s = useApp.getState();
      r.frame(engine.position(), performance.now() / 1000, s.playback === 'playing');
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
    // the renderer lives for the whole session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const s = useApp.getState();
    if (s.trace && s.score && s.phase === 'garden') renderer.current?.setScene(s.trace, s.score);
  }, [version, phase]);

  useEffect(() => {
    renderer.current?.setPalette(getMood(mood).palette);
  }, [mood]);

  useEffect(() => {
    if (renderer.current) renderer.current.reducedMotion = reduced;
  }, [reduced]);

  useEffect(() => {
    const top = zen ? 24 : 76;
    const bottom = zen ? 24 : compact ? 215 : 170;
    const right = !zen && drawerOpen && !narrow ? 404 : 24;
    const left = !zen && lensOpen && !narrow ? 392 : 24;
    renderer.current?.setInsets({ top, right, bottom: narrow && drawerOpen ? Math.round(window.innerHeight * 0.7) : bottom, left });
  }, [drawerOpen, lensOpen, zen, narrow, compact]);

  const description = useMemo(() => {
    if (!trace || !score) return 'A quiet night sky with drifting fireflies. Press Begin to plant a seed.';
    const m = getMood(score.moodId);
    const kind = trace.worldId === 'grove' ? 'A fractal tree' : 'An L-system plant';
    return `${kind}, ${trace.nodes.length} branches, ${trace.maxDepth} levels deep, playing in ${score.key} ${SCALE_NAMES[score.scale]} at ${Math.round(score.bpm)} BPM, mood ${m.name}.`;
  }, [trace, score]);

  return <canvas ref={ref} role="img" aria-label={description} />;
}
