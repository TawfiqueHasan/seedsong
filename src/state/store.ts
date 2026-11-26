// App state (Zustand). Components read and call actions; the pure core does the work.

import { create } from 'zustand';
import { seedName } from '../core/random';
import { getWorld } from '../core/worlds/registry';
import type { RecursionTrace, WorldId, WorldParams } from '../core/worlds/types';
import { enterableAncestor, focusTraceChecked } from '../core/worlds/subtree';
import { composeScore } from '../core/music/compose';
import { getMood, type AmbienceId, type MoodId } from '../core/music/moods';
import type { Mode, Score } from '../core/music/score';
import { decodeSong, encodeSong, type SongState } from '../core/url';

export type Tab = 'world' | 'sound' | 'atmosphere' | 'session';
export type MotionPref = 'system' | 'reduce' | 'full';

export interface GardenEntry {
  id: string;
  name: string;
  song: SongState;
  savedAt: number;
}

export interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

interface Settings {
  volume: number;
  muted: boolean;
  mono: boolean;
  motion: MotionPref;
  shortcuts: boolean;
  breathing: boolean;
  endless: boolean;
  ambience: Partial<Record<AmbienceId, number>>;
  onboarded: boolean;
}

export interface AppState {
  phase: 'landing' | 'garden';
  world: WorldId;
  params: Record<WorldId, WorldParams>;
  mood: MoodId;
  mode: Mode;
  seed: string;
  /** undefined = the mood's own tempo */
  bpm: number | undefined;
  transpose: number;
  trace: RecursionTrace | null;
  /** the whole tree, even while you are inside one of its calls */
  fullTrace: RecursionTrace | null;
  /** the calls you stepped into, outermost first, as node ids of the whole tree */
  focus: number[];
  score: Score | null;
  version: number;
  playback: 'idle' | 'playing' | 'paused';
  ended: boolean;
  settings: Settings;
  drawerOpen: boolean;
  tab: Tab;
  lensOpen: boolean;
  zen: boolean;
  helpOpen: boolean;
  keepOpen: boolean;
  exporting: boolean;
  sleepEndsAt: number | null;
  garden: GardenEntry[];
  toasts: Toast[];
  setPhase(p: AppState['phase']): void;
  setWorld(w: WorldId): void;
  setParam(key: string, value: number): void;
  resetParams(): void;
  setMood(m: MoodId): void;
  setMode(m: Mode): void;
  setSeed(s: string): void;
  newSeed(): void;
  setBpm(b: number | undefined): void;
  setTranspose(t: number): void;
  grow(): void;
  /** step inside the call of a branch of the current tree (its subtree becomes the song) */
  enterBranch(localId: number): boolean;
  /** step back out to the calling branch (or `toRoot` all the way out) */
  stepOut(toRoot?: boolean): void;
  setPlayback(p: AppState['playback']): void;
  setEnded(e: boolean): void;
  updateSettings(s: Partial<Settings>): void;
  setAmbience(layer: AmbienceId, v: number): void;
  ui(p: Partial<Pick<AppState, 'drawerOpen' | 'tab' | 'lensOpen' | 'zen' | 'helpOpen' | 'keepOpen' | 'exporting' | 'sleepEndsAt'>>): void;
  toast(text: string, action?: Toast['action']): void;
  dismissToast(id: number): void;
  saveToGarden(): void;
  removeFromGarden(id: string): void;
  loadSong(song: Partial<SongState>): void;
  shareUrl(): string;
  song(): SongState;
}

const STORAGE = 'seedsong:v1';

interface Persisted {
  world: WorldId;
  params: Record<WorldId, WorldParams>;
  mood: MoodId;
  mode: Mode;
  bpm?: number;
  transpose: number;
  settings: Settings;
  garden: GardenEntry[];
}

function loadPersisted(): Partial<Persisted> {
  try {
    const raw = localStorage.getItem(STORAGE);
    return raw ? (JSON.parse(raw) as Partial<Persisted>) : {};
  } catch {
    return {};
  }
}

const entropy = () => {
  try {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  } catch {
    return Date.now();
  }
};

const persisted = loadPersisted();
const defaultSettings: Settings = {
  volume: 0.8,
  muted: false,
  mono: false,
  motion: 'system',
  shortcuts: true,
  breathing: false,
  endless: false,
  ambience: { ...getMood(persisted.mood ?? 'dawn').ambience },
  onboarded: false,
};

let toastId = 1;
let growTimer: number | undefined;

export const useApp = create<AppState>((set, get) => ({
  phase: 'landing',
  world: persisted.world ?? 'grove',
  params: { grove: getWorld('grove').defaults, lsystem: getWorld('lsystem').defaults, ...persisted.params },
  mood: persisted.mood ?? 'dawn',
  mode: persisted.mode ?? 'wander',
  seed: seedName(entropy()),
  bpm: persisted.bpm,
  transpose: persisted.transpose ?? 0,
  trace: null,
  fullTrace: null,
  focus: [],
  score: null,
  version: 0,
  playback: 'idle',
  ended: false,
  settings: { ...defaultSettings, ...persisted.settings },
  drawerOpen: false,
  tab: 'world',
  lensOpen: false,
  zen: false,
  helpOpen: false,
  keepOpen: false,
  exporting: false,
  sleepEndsAt: null,
  garden: persisted.garden ?? [],
  toasts: [],

  setPhase: (phase) => set({ phase }),

  setWorld: (world) => {
    set({ world, focus: [] });
    get().grow();
  },

  setParam: (key, value) => {
    const { world, params } = get();
    const def = getWorld(world);
    set({ params: { ...params, [world]: def.normalize({ ...params[world], [key]: value }) }, focus: [] });
    // regrow after a short pause so dragging a slider does not restart the song on every step
    window.clearTimeout(growTimer);
    growTimer = window.setTimeout(() => get().grow(), 400);
  },

  resetParams: () => {
    const { world, params } = get();
    set({ params: { ...params, [world]: getWorld(world).defaults }, focus: [] });
    get().grow();
  },

  setMood: (mood) => {
    set((s) => ({ mood, bpm: undefined, settings: { ...s.settings, ambience: { ...getMood(mood).ambience } } }));
    get().grow();
  },

  setMode: (mode) => {
    set({ mode });
    get().grow();
  },

  setSeed: (seed) => {
    const clean = seed.trim().toLowerCase().replace(/[^\w-]+/g, '-').slice(0, 48) || seedName(entropy());
    set({ seed: clean, focus: [] });
    window.clearTimeout(growTimer);
    growTimer = window.setTimeout(() => get().grow(), 400);
  },

  newSeed: () => {
    set({ seed: seedName(entropy()), focus: [] });
    get().grow();
  },

  setBpm: (bpm) => {
    set({ bpm });
    window.clearTimeout(growTimer);
    growTimer = window.setTimeout(() => get().grow(), 400);
  },

  setTranspose: (transpose) => {
    set({ transpose });
    window.clearTimeout(growTimer);
    growTimer = window.setTimeout(() => get().grow(), 400);
  },

  grow: () => {
    window.clearTimeout(growTimer);
    const { world, params, seed, mood, mode, bpm, transpose } = get();
    const def = getWorld(world);
    const fullTrace = def.generate(def.normalize(params[world]), seed);
    const focus = get().focus;
    const checked = focus.length ? focusTraceChecked(fullTrace, focus) : { trace: fullTrace, steps: 0 };
    const trace = checked.trace;
    // a stale share link (different params) keeps only the steps that still exist
    if (checked.steps < focus.length) set({ focus: focus.slice(0, checked.steps) });
    const score = composeScore(trace, { moodId: mood, mode, bpm, transpose });
    set((s) => ({ trace, fullTrace, score, version: s.version + 1, ended: false }));
  },

  enterBranch: (localId) => {
    const { trace } = get();
    if (!trace) return false;
    const target = enterableAncestor(trace, localId);
    if (target === null) return false;
    const originId = trace.originIds ? trace.originIds[target] : target;
    set((s) => ({ focus: [...s.focus, originId] }));
    get().grow();
    return true;
  },

  stepOut: (toRoot = false) => {
    if (!get().focus.length) return;
    set((s) => ({ focus: toRoot ? [] : s.focus.slice(0, -1) }));
    get().grow();
  },

  setPlayback: (playback) => set({ playback }),
  setEnded: (ended) => set({ ended }),

  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

  setAmbience: (layer, v) => set((s) => ({ settings: { ...s.settings, ambience: { ...s.settings.ambience, [layer]: v } } })),

  ui: (patch) => set(patch),

  toast: (text, action) => {
    const id = toastId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, action }] }));
    window.setTimeout(() => get().dismissToast(id), action ? 7000 : 4200);
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  saveToGarden: () => {
    const song = get().song();
    const name = `${getMood(song.mood).name} · ${song.seed}`;
    set((s) => ({ garden: [{ id: `${Date.now()}`, name, song, savedAt: Date.now() }, ...s.garden.filter((g) => encodeSong(g.song) !== encodeSong(song))].slice(0, 24) }));
    get().toast('Saved to your garden.');
  },

  removeFromGarden: (id) => set((s) => ({ garden: s.garden.filter((g) => g.id !== id) })),

  loadSong: (song) => {
    set((s) => {
      const world = song.world ?? s.world;
      const def = getWorld(world);
      return {
        world,
        focus: song.focus ?? [],
        params: song.params ? { ...s.params, [world]: def.normalize({ ...def.defaults, ...song.params }) } : s.params,
        mood: song.mood ?? s.mood,
        mode: song.mode ?? s.mode,
        seed: song.seed ?? s.seed,
        bpm: song.bpm,
        transpose: song.transpose ?? 0,
        settings: song.mood && song.mood !== s.mood ? { ...s.settings, ambience: { ...getMood(song.mood).ambience } } : s.settings,
      };
    });
  },

  song: () => {
    const { world, params, mood, mode, seed, bpm, transpose, focus } = get();
    return { world, params: params[world], mood, mode, seed, bpm, transpose, focus: focus.length ? focus : undefined };
  },

  shareUrl: () => {
    const base = `${location.origin}${location.pathname}`;
    return `${base}#${encodeSong(get().song())}`;
  },
}));

// read a shared song from the URL once, before anything grows
const fromUrl = typeof location !== 'undefined' ? decodeSong(location.hash) : null;
if (fromUrl) useApp.getState().loadSong(fromUrl);
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    const song = decodeSong(location.hash);
    if (!song) return;
    useApp.getState().loadSong(song);
    if (useApp.getState().phase === 'garden') useApp.getState().grow();
  });
}

// persist preferences, parameters and the garden (never the transient UI state)
useApp.subscribe((s) => {
  try {
    const data: Persisted = { world: s.world, params: s.params, mood: s.mood, mode: s.mode, bpm: s.bpm, transpose: s.transpose, settings: s.settings, garden: s.garden };
    localStorage.setItem(STORAGE, JSON.stringify(data));
  } catch {
    /* storage may be unavailable (private mode) */
  }
});
