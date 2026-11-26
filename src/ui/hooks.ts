import { useEffect, useState } from 'react';
import { engine } from '../audio/engine';
import { useApp } from '../state/store';
import { MOOD_LIST } from '../core/music/moods';
import { seekBy, setVolume, stepIntoPlaying, toggleMute, togglePlay } from '../app/controller';

/** the audible playback position, sampled a few times a second (React does not need 60 fps) */
export function usePosition(hz = 6): number {
  const [pos, setPos] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setPos(engine.position()), 1000 / hz);
    return () => window.clearInterval(id);
  }, [hz]);
  return pos;
}

export function useSystemReducedMotion(): boolean {
  const [rm, setRm] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setRm(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return rm;
}

export function useReducedMotion(): boolean {
  const pref = useApp((s) => s.settings.motion);
  const system = useSystemReducedMotion();
  return pref === 'reduce' || (pref === 'system' && system);
}

export function useMediaQuery(q: string): boolean {
  const [m, setM] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => {
    const mq = matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
};

/** single-key shortcuts (WCAG 2.1.4: they can be turned off, and never fire inside inputs) */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useApp.getState();
      if (s.phase !== 'garden') return;
      if (s.zen) {
        s.ui({ zen: false });
        if (e.key !== 'Escape') e.preventDefault();
        return;
      }
      if (e.key === 'Escape') {
        if (s.drawerOpen) s.ui({ drawerOpen: false });
        else if (s.lensOpen) s.ui({ lensOpen: false });
        return;
      }
      if (!s.settings.shortcuts || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTyping(e.target) || s.keepOpen || s.helpOpen) return;
      const onButton = (e.target as HTMLElement | null)?.tagName === 'BUTTON';
      const k = e.key;
      const handled = () => e.preventDefault();
      if (k === ' ' && !onButton) {
        handled();
        void togglePlay();
      } else if (k === 'n' || k === 'N') {
        s.newSeed();
      } else if (k === 'w' || k === 'W') {
        s.setMode(s.mode === 'wander' ? 'bloom' : 'wander');
      } else if (k === 'l' || k === 'L') {
        s.ui({ lensOpen: !s.lensOpen });
      } else if (k === 'z' || k === 'Z') {
        s.ui({ zen: true, drawerOpen: false });
      } else if (k === 'e' || k === 'E') {
        s.ui({ keepOpen: true });
      } else if (k === 'm' || k === 'M') {
        toggleMute();
      } else if (k === 'ArrowLeft') {
        handled();
        seekBy(-10);
      } else if (k === 'ArrowRight') {
        handled();
        seekBy(10);
      } else if (k === 'ArrowUp') {
        handled();
        setVolume(Math.min(1, s.settings.volume + 0.05));
      } else if (k === 'ArrowDown') {
        handled();
        setVolume(Math.max(0, s.settings.volume - 0.05));
      } else if (k >= '1' && k <= '5') {
        s.setMood(MOOD_LIST[Number(k) - 1].id);
      } else if (k === 'i' || k === 'I') {
        if (!stepIntoPlaying()) s.toast('This branch is too small to step into. Try a bigger one.');
      } else if (k === 'o' || k === 'O') {
        s.stepOut();
      } else if (k === '?') {
        s.ui({ helpOpen: true });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export const fmtTime = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};
