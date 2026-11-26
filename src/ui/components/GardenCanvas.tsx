import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { engine } from '../../audio/engine';
import { getMood } from '../../core/music/moods';
import { SCALE_NAMES } from '../../core/music/theory';
import { enterableAncestor } from '../../core/worlds/subtree';
import { getWorld } from '../../core/worlds/registry';
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
  const [tip, setTip] = useState<{ x: number; y: number; title: string; detail: string } | null>(null);
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

  // hover a branch: its whole sub-call glows; click: step inside that call
  const targetAt = (e: MouseEvent<HTMLCanvasElement>) => {
    const s = useApp.getState();
    const r = renderer.current;
    if (!r || !s.trace || s.phase !== 'garden' || s.zen) return null;
    const hit = r.pick(e.clientX, e.clientY, engine.position());
    return hit === null ? null : enterableAncestor(s.trace, hit);
  };
  const onMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const target = targetAt(e);
    const r = renderer.current;
    if (r) r.hover = target;
    const s = useApp.getState();
    if (target === null || !s.trace) {
      if (tip) setTip(null);
      e.currentTarget.style.cursor = '';
      return;
    }
    const n = s.trace.nodes[target];
    e.currentTarget.style.cursor = 'pointer';
    const calls = (n.order.ret - n.order.call + 1) / 2;
    const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    // keep the label on screen and clear of the playback bar
    const x = Math.min(e.clientX + 16, window.innerWidth - 316);
    const y = Math.min(e.clientY + 18, window.innerHeight - 260);
    setTip({ x, y, title: getWorld(s.trace.worldId).frameLabel(n), detail: `${calls} calls inside · ${coarse ? 'tap again' : 'click'} to step in and hear its own song` });
  };
  const onLeave = () => {
    if (renderer.current) renderer.current.hover = null;
    setTip(null);
  };
  // on touch screens the first tap only previews a branch (glow + label); a second tap enters,
  // so a stray tap can never restart the music
  const armed = useRef<number | null>(null);
  const onClick = (e: MouseEvent<HTMLCanvasElement>) => {
    const target = targetAt(e);
    if (target === null) {
      armed.current = null;
      onLeave();
      return;
    }
    const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    if (coarse && armed.current !== target) {
      armed.current = target;
      onMove(e);
      return;
    }
    armed.current = null;
    onLeave();
    useApp.getState().enterBranch(target);
  };

  return (
    <>
      <canvas ref={ref} role="img" aria-label={description} onPointerMove={onMove} onPointerLeave={onLeave} onClick={onClick} />
      {tip && (
        <div className="branch-tip glass" style={{ left: tip.x, top: tip.y }} aria-hidden="true">
          <strong>{tip.title}</strong>
          <span>{tip.detail}</span>
        </div>
      )}
    </>
  );
}
