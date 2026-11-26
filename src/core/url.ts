// Share links: world, params, mood, mode, tempo and seed travel in the URL hash, so any song
// can be regrown from its link (and from the comment written into the exported WAV).

import type { WorldId, WorldParams } from './worlds/types';
import type { MoodId } from './music/moods';
import type { Mode } from './music/score';

export interface SongState {
  world: WorldId;
  params: WorldParams;
  mood: MoodId;
  mode: Mode;
  seed: string;
  bpm?: number;
  transpose?: number;
}

const WORLD_IDS: WorldId[] = ['grove', 'lsystem'];
const MOOD_IDS: MoodId[] = ['dawn', 'rain', 'ocean', 'forest', 'temple'];

export function encodeSong(s: SongState): string {
  const q = new URLSearchParams();
  q.set('w', s.world);
  q.set('m', s.mood);
  q.set('o', s.mode === 'bloom' ? 'b' : 'w');
  q.set('s', s.seed);
  if (s.bpm !== undefined) q.set('t', String(Math.round(s.bpm)));
  if (s.transpose) q.set('k', String(s.transpose));
  for (const [k, v] of Object.entries(s.params)) q.set(`p.${k}`, String(Math.round(v * 1000) / 1000));
  return q.toString();
}

export function decodeSong(hash: string): Partial<SongState> | null {
  const raw = hash.replace(/^#/, '');
  if (!raw) return null;
  const q = new URLSearchParams(raw);
  const out: Partial<SongState> = {};
  const w = q.get('w') as WorldId | null;
  if (w && WORLD_IDS.includes(w)) out.world = w;
  const m = q.get('m') as MoodId | null;
  if (m && MOOD_IDS.includes(m)) out.mood = m;
  const o = q.get('o');
  if (o) out.mode = o === 'b' ? 'bloom' : 'wander';
  const s = q.get('s');
  if (s && /^[\w-]{1,48}$/.test(s)) out.seed = s;
  const t = Number(q.get('t'));
  if (q.has('t') && Number.isFinite(t) && t >= 30 && t <= 120) out.bpm = t;
  const k = Number(q.get('k'));
  if (q.has('k') && Number.isFinite(k) && k >= -6 && k <= 6) out.transpose = Math.round(k);
  const params: WorldParams = {};
  for (const [key, value] of q.entries()) {
    if (!key.startsWith('p.')) continue;
    const v = Number(value);
    if (Number.isFinite(v)) params[key.slice(2)] = v;
  }
  if (Object.keys(params).length) out.params = params;
  return Object.keys(out).length ? out : null;
}
