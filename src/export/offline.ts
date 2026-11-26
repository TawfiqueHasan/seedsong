// Offline render: the same createRack() used live, inside an OfflineContext, faster than real time.
// This mirrors Tone.Offline() but keeps a handle on the context so the export shows real progress.

import * as Tone from 'tone';
import { createRack } from '../audio/rack';
import { scheduleScore } from '../audio/schedule';
import type { AmbienceId } from '../core/music/moods';
import { totalLength, type Score } from '../core/music/score';

export interface RenderOptions {
  ambience: Partial<Record<AmbienceId, number>>;
  withAmbience: boolean;
  sampleRate?: number;
  /** extra tail seconds after the score's own tail */
  extraTail?: number;
  mono?: boolean;
  /** 0..1 */
  onProgress?: (p: number) => void;
}

/** yield to the browser without timers: setTimeout is clamped to ~1 s in background tabs */
const yieldNow = () =>
  new Promise<void>((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => resolve();
    ch.port2.postMessage(0);
  });

interface OfflineInternals {
  _duration: number;
  _currentTime: number;
  _context: OfflineAudioContext;
  sampleRate: number;
  emit(event: 'tick'): void;
  workletsAreReady(): Promise<void>;
}

/**
 * Same as OfflineContext.render(), but the clock loop yields with a MessageChannel every ~30 ms
 * of work instead of setTimeout every second of audio, so a background tab does not stall export.
 * Falls back to Tone's own render() if its internals ever change.
 */
async function renderFast(context: Tone.OfflineContext, onProgress?: (p: number) => void): Promise<Tone.ToneAudioBuffer> {
  const c = context as unknown as OfflineInternals;
  if (typeof c._duration !== 'number' || typeof c._currentTime !== 'number' || !c._context) return context.render(true);
  await c.workletsAreReady();
  const step = 128 / c.sampleRate;
  let last = performance.now();
  while (c._duration - c._currentTime >= 0) {
    c.emit('tick');
    c._currentTime += step;
    if (performance.now() - last > 30) {
      onProgress?.(0.1 * (c._currentTime / c._duration));
      await yieldNow();
      last = performance.now();
    }
  }
  // the browser renders the audio itself; suspend checkpoints let us report real progress
  const raw = c._context;
  const total = raw.length / raw.sampleRate;
  if (onProgress && typeof raw.suspend === 'function') {
    for (let frame = 128 * 512; frame < raw.length - 128; frame += 128 * 512) {
      const t = frame / raw.sampleRate;
      raw
        .suspend(t)
        .then(() => {
          onProgress(0.1 + 0.9 * (t / total));
          return raw.resume();
        })
        .catch(() => undefined);
    }
  }
  const buffer = await raw.startRendering();
  return new Tone.ToneAudioBuffer(buffer);
}

export async function renderScore(score: Score, seed: string, opts: RenderOptions): Promise<AudioBuffer> {
  const seconds = totalLength(score) + (opts.extraTail ?? 0);
  const original = Tone.getContext();
  const context = new Tone.OfflineContext(2, seconds, opts.sampleRate ?? 44100);
  Tone.setContext(context);
  let rendering: Promise<Tone.ToneAudioBuffer>;
  try {
    const transport = context.transport;
    transport.bpm.value = score.bpm;
    const rack = createRack(score.moodId, { bpm: score.bpm, ambience: opts.ambience, withAmbience: opts.withAmbience, seed });
    if (opts.mono) {
      const w = new Tone.StereoWidener(0);
      rack.output.connect(w);
      w.toDestination();
    } else rack.output.toDestination();
    // Give the live app its context back before any await. Every offline node now exists and holds
    // its own context; if the global stayed offline while we wait for the reverb, a live rack built in
    // that gap (a regrow or seek during export) would bind to the offline context and fail to connect.
    Tone.setContext(original);
    // the classic cause of silent or dry exports is starting before the reverb impulse exists
    await rack.ready;
    scheduleScore(transport, rack, score, 0);
    rack.scheduleAmbience(transport, 0);
    transport.start(0);
    rendering = renderFast(context, opts.onProgress);
  } finally {
    if (Tone.getContext() !== original) Tone.setContext(original);
  }
  const buffer = await rendering;
  opts.onProgress?.(1);
  const ab = buffer.get();
  if (!ab) throw new Error('The render came back empty.');
  return ab;
}
