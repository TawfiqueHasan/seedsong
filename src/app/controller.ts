// Glue between the store and the audio engine. Components call these actions; the engine is
// only ever touched from here.

import { engine } from '../audio/engine';
import { getMood, type AmbienceId } from '../core/music/moods';
import { totalLength } from '../core/music/score';
import { useApp } from '../state/store';

let sleepTimer: number | undefined;
let endTimer: number | undefined;

export async function begin(): Promise<void> {
  const s = useApp.getState();
  try {
    await engine.unlock();
  } catch {
    s.toast('Your browser could not start audio. Try another browser, or check that sound is allowed for this page.');
    return;
  }
  applySettings();
  s.setPhase('garden');
  if (!s.score) s.grow();
  // a gentle, one-time pointer to the signature idea
  if (!s.settings.onboarded) {
    window.setTimeout(() => {
      const now = useApp.getState();
      if (now.phase !== 'garden' || now.settings.onboarded) return;
      const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
      now.toast(`Every branch is a song of its own. ${coarse ? 'Tap a branch twice' : 'Click any branch'} to step inside its call.`);
      now.updateSettings({ onboarded: true });
    }, 9000);
  }
  // the version subscription below starts playback for the first score
}

export async function togglePlay(): Promise<void> {
  const s = useApp.getState();
  if (!engine.unlocked) return begin();
  if (s.playback === 'playing') {
    s.setPlayback('paused');
    await engine.pause();
  } else {
    if (s.ended) {
      s.setEnded(false);
      await engine.seek(0);
    }
    s.setPlayback('playing');
    await engine.play();
  }
}

export function seek(seconds: number): void {
  const s = useApp.getState();
  s.setEnded(false);
  void engine.seek(seconds);
}

export function seekBy(delta: number): void {
  seek(engine.position() + delta);
}

export function setVolume(v: number): void {
  useApp.getState().updateSettings({ volume: v, muted: false });
  engine.setMuted(false);
  engine.setVolume(v);
}

export function toggleMute(): void {
  const s = useApp.getState();
  const muted = !s.settings.muted;
  s.updateSettings({ muted });
  engine.setMuted(muted);
}

export function setAmbience(layer: AmbienceId, v: number): void {
  useApp.getState().setAmbience(layer, v);
  engine.setAmbience(layer, v);
}

export function setSleepTimer(minutes: number | null): void {
  const s = useApp.getState();
  window.clearTimeout(sleepTimer);
  if (!minutes) {
    s.ui({ sleepEndsAt: null });
    return;
  }
  const endsAt = Date.now() + minutes * 60_000;
  s.ui({ sleepEndsAt: endsAt });
  sleepTimer = window.setTimeout(async () => {
    await engine.sleepFade(60);
    useApp.getState().setPlayback('paused');
    useApp.getState().ui({ sleepEndsAt: null });
  }, Math.max(0, minutes * 60_000 - 60_000));
  s.toast(`The music will fade out in ${minutes} minutes.`);
}

function applySettings() {
  const { settings } = useApp.getState();
  engine.setVolume(settings.volume);
  engine.setMuted(settings.muted);
  engine.setMono(settings.mono);
  engine.setAllAmbience(settings.ambience);
}

/** watch for the end of a piece: show "Keep this song", or plant the next seed in endless mode */
function watchEnd() {
  window.clearInterval(endTimer);
  endTimer = window.setInterval(() => {
    const s = useApp.getState();
    if (!s.score || s.playback !== 'playing') return;
    const pos = engine.position();
    if (!s.ended && pos >= s.score.duration + 2) {
      s.setEnded(true);
      if (!s.settings.endless) s.toast('Your song is ready. Keep it, or plant a new seed.');
    }
    if (s.ended && s.settings.endless && pos >= totalLength(s.score) - 1 && !s.exporting) {
      s.newSeed();
    }
  }, 500);
}

let lastVersion = 0;
useApp.subscribe((s, prev) => {
  if (s.version !== lastVersion && s.score && engine.unlocked) {
    lastVersion = s.version;
    const score = s.score;
    const autoplay = s.playback !== 'paused';
    engine.setAllAmbience(s.settings.ambience);
    void engine.crossfadeTo(score, s.seed, autoplay).then(() => {
      if (autoplay) useApp.getState().setPlayback('playing');
    });
    watchEnd();
  }
  if (s.settings.mono !== prev.settings.mono) engine.setMono(s.settings.mono);
});

export const moodDescription = (id: Parameters<typeof getMood>[0]) => getMood(id).description;

/** step inside the call that is playing right now: the bough on its path, one level in */
export function stepIntoPlaying(): boolean {
  const s = useApp.getState();
  if (!s.trace || !s.score) return false;
  const pos = engine.position();
  let current = -1;
  for (const e of s.score.events) {
    if (e.time > pos) break;
    if (e.kind === 'call') current = e.nodeId;
  }
  if (current <= 0) current = s.trace.nodes.find((n) => n.depth === 1)?.id ?? -1;
  if (current <= 0) return false;
  // climb to the child of the current root that leads to the playing branch
  let n = s.trace.nodes[current];
  while (n.parentId !== null && s.trace.nodes[n.parentId].depth > 0) n = s.trace.nodes[n.parentId];
  return s.enterBranch(n.id) || s.enterBranch(current);
}
