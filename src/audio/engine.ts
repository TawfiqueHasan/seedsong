// Live playback. Schedules a Score on the Tone transport through the shared rack, and exposes a
// calm transport API: every start, stop, seek and change is ramped so nothing clicks or startles.

import * as Tone from 'tone';
import { createRack, type Rack } from './rack';
import { scheduleScore } from './schedule';
import type { AmbienceId, MoodId } from '../core/music/moods';
import { totalLength, type Score } from '../core/music/score';

export type EngineState = 'idle' | 'playing' | 'paused';

export interface EngineSettings {
  volume: number; // 0..1
  muted: boolean;
  mono: boolean;
  ambience: Partial<Record<AmbienceId, number>>;
}

const FADE_IN = 1.2;
const FADE_OUT = 0.7;
const DIP = 1.1;

type Ctx = ReturnType<typeof Tone.getContext>;
type Transport = ReturnType<typeof Tone.getTransport>;

export class AudioEngine {
  // captured once: Tone.Offline swaps the global context while an export is being set up
  private ctx: Ctx | null = null;
  private transport: Transport | null = null;
  private rack: Rack | null = null;
  private score: Score | null = null;
  private master: Tone.Gain | null = null;
  private fade: Tone.Gain | null = null;
  private widener: Tone.StereoWidener | null = null;
  private recorderTap: Tone.Gain | null = null;
  private settings: EngineSettings = { volume: 0.8, muted: false, mono: false, ambience: {} };
  private busy: Promise<void> = Promise.resolve();
  private gen = 0;
  state: EngineState = 'idle';
  unlocked = false;

  /** must run inside a user gesture (the Begin button) */
  async unlock(): Promise<void> {
    if (this.unlocked) return;
    // Tone.start() resumes the AudioContext. Some browsers (background tabs, some phones) keep it
    // suspended until a later gesture, so never wait on it forever: retry on the next tap instead.
    // A 'playback' context gets a larger audio buffer (fewer crackles under load), and a 0.2 s
    // look-ahead with a short update interval keeps notes on time when the page is busy drawing.
    if (!this.ctx) Tone.setContext(new Tone.Context({ latencyHint: 'playback', lookAhead: 0.2, updateInterval: 0.03 }), true);
    await Promise.race([Tone.start(), wait(1200)]);
    if (Tone.getContext().state !== 'running') {
      const retry = () => {
        void Tone.start();
        if (Tone.getContext().state === 'running') {
          window.removeEventListener('pointerdown', retry);
          window.removeEventListener('keydown', retry);
        }
      };
      window.addEventListener('pointerdown', retry);
      window.addEventListener('keydown', retry);
    }
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    try {
      if (nav.audioSession) nav.audioSession.type = 'playback'; // iOS: play even with the silent switch on
    } catch {
      /* not supported */
    }
    const ctx = Tone.getContext();
    this.ctx = ctx;
    this.transport = Tone.getTransport();
    this.widener = new Tone.StereoWidener(0.5);
    this.master = new Tone.Gain(this.volumeGain());
    this.fade = new Tone.Gain(0);
    this.recorderTap = new Tone.Gain(1);
    this.widener.chain(this.master, this.fade, this.recorderTap, Tone.getDestination());
    this.unlocked = true;
  }

  get context(): Ctx {
    return this.ctx ?? Tone.getContext();
  }

  private get tr(): Transport {
    return this.transport ?? Tone.getTransport();
  }

  private now() {
    return this.context.now();
  }

  /** the audible position in seconds (the transport runs a little ahead by the look-ahead) */
  position(): number {
    if (!this.score) return 0;
    const t = this.tr;
    if (t.state === 'stopped') return 0;
    const raw = this.context.rawContext as AudioContext;
    return Math.max(0, t.seconds - this.context.lookAhead - (raw.outputLatency || raw.baseLatency || 0));
  }

  get loaded(): Score | null {
    return this.score;
  }

  /** tap for live session recording */
  get tap(): Tone.Gain | null {
    return this.recorderTap;
  }

  /** resume the context, but never hang if the browser refuses (hidden tab): it resumes on the next tap */
  private async resume() {
    const raw = this.context.rawContext as AudioContext;
    if (raw.state === 'running') return;
    await Promise.race([raw.resume(), wait(1200)]);
  }

  /**
   * Notes already handed to the audio graph (inside the look-ahead window) can still start a moment
   * from now. Anything new must be scheduled after them, or a voice would get an earlier start than
   * one it already has. This is the earliest safe time.
   */
  private settled(extra = 0.05) {
    return this.now() + this.context.lookAhead + extra;
  }

  private get startOffset() {
    return `+${(this.context.lookAhead + 0.12).toFixed(3)}`;
  }

  private volumeGain() {
    return this.settings.muted ? 0 : this.settings.volume * this.settings.volume;
  }

  private queue(task: () => Promise<void>): Promise<void> {
    this.busy = this.busy.then(task, task);
    return this.busy;
  }

  /** load a score (and the rack for its mood) without starting it */
  load(score: Score, seed: string): Promise<void> {
    return this.queue(async () => {
      await this.swap(score, seed, 0);
    });
  }

  private async swap(score: Score, seed: string, at: number) {
    if (!this.widener) throw new Error('Audio is locked. Press Begin first.');
    const transport = this.tr;
    transport.cancel(0);
    if (!this.rack || this.rack.moodId !== score.moodId) {
      const old = this.rack;
      this.rack = createRack(score.moodId as MoodId, { bpm: score.bpm, ambience: this.settings.ambience, withAmbience: true, seed });
      this.rack.output.connect(this.widener);
      await this.rack.ready;
      if (old) {
        old.releaseAll(this.settled());
        const o = old;
        window.setTimeout(() => o.dispose(), 9000); // let reverb tails finish before freeing nodes
        o.output.disconnect();
      }
    } else {
      this.rack.releaseAll(this.settled());
      this.rack.setTempo(score.bpm);
      for (const [id, v] of Object.entries(this.settings.ambience)) this.rack.setAmbience(id as AmbienceId, v ?? 0, 1);
    }
    this.score = score;
    transport.bpm.value = score.bpm;
    scheduleScore(transport, this.rack, score, at);
    this.rack.scheduleAmbience(transport, 0);
    transport.seconds = at;
  }

  play(): Promise<void> {
    return this.queue(async () => {
      if (!this.score || !this.rack || !this.fade) return;
      const transport = this.tr;
      if (this.state === 'paused' && this.context.rawContext.state === 'suspended') {
        await this.resume();
      }
      if (transport.state !== 'started') {
        const at = transport.seconds >= totalLength(this.score) ? 0 : transport.seconds;
        if (at === 0 && transport.seconds !== 0) {
          transport.cancel(0);
          scheduleScore(transport, this.rack, this.score, 0);
          this.rack.scheduleAmbience(transport, 0);
        }
        transport.seconds = at;
        if (at > 0) this.resumeSustained(at);
        transport.start(this.startOffset);
      }
      const now = this.now();
      this.fade.gain.cancelScheduledValues(now);
      this.fade.gain.setValueAtTime(this.fade.gain.value, now);
      this.fade.gain.linearRampToValueAtTime(1, now + FADE_IN);
      this.state = 'playing';
    });
  }

  pause(): Promise<void> {
    return this.queue(async () => {
      if (this.state !== 'playing' || !this.fade) return;
      const now = this.now();
      this.fade.gain.cancelScheduledValues(now);
      this.fade.gain.setValueAtTime(this.fade.gain.value, now);
      this.fade.gain.linearRampToValueAtTime(0, now + FADE_OUT);
      this.state = 'paused';
      await wait(FADE_OUT * 1000 + 60);
      if (this.state !== 'paused') return;
      // suspending the context freezes every envelope and the transport exactly where they are
      await (this.context.rawContext as AudioContext).suspend();
    });
  }

  /** jump to a time; sustained voices (drone, pad, bass) are re-voiced so the harmony continues */
  seek(seconds: number): Promise<void> {
    return this.queue(async () => {
      if (!this.score || !this.rack || !this.fade) return;
      const s = Math.max(0, Math.min(seconds, totalLength(this.score) - 0.5));
      const transport = this.tr;
      const playing = this.state === 'playing';
      if (playing) {
        const now = this.now();
        this.fade.gain.cancelScheduledValues(now);
        this.fade.gain.setValueAtTime(this.fade.gain.value, now);
        this.fade.gain.linearRampToValueAtTime(0, now + 0.25);
        await wait(280);
      }
      transport.stop();
      this.rack.releaseAll(this.settled());
      transport.cancel(0);
      scheduleScore(transport, this.rack, this.score, s);
      this.rack.scheduleAmbience(transport, 0);
      transport.seconds = s;
      if (playing) {
        this.resumeSustained(s);
        transport.start(this.startOffset);
        const now = this.now();
        this.fade.gain.cancelScheduledValues(now);
        this.fade.gain.setValueAtTime(0, now);
        this.fade.gain.linearRampToValueAtTime(1, now + 0.8);
      }
    });
  }

  private resumeSustained(at: number) {
    if (!this.score || !this.rack) return;
    const now = this.now() + this.context.lookAhead + 0.12;
    for (const n of this.score.notes) {
      if ((n.voice === 'drone' || n.voice === 'bass') && n.time < at && n.time + n.duration > at + 0.5) this.rack.play(n, now, n.time + n.duration - at);
    }
    for (const c of this.score.chords) {
      if (c.time < at && c.time + c.duration > at + 0.5) this.rack.playChord(c, now, c.time + c.duration - at);
    }
  }

  /** dip-crossfade into a new score: fade out, swap, fade in. Calm, never abrupt. */
  crossfadeTo(score: Score, seed: string, autoplay = true): Promise<void> {
    // quick successive changes (mood, then seed) merge into one crossfade to the latest score
    const gen = ++this.gen;
    return this.queue(async () => {
      if (gen !== this.gen) return;
      if (!this.fade) return;
      const wasPlaying = this.state === 'playing';
      if (wasPlaying) {
        const now = this.now();
        this.fade.gain.cancelScheduledValues(now);
        this.fade.gain.setValueAtTime(this.fade.gain.value, now);
        this.fade.gain.linearRampToValueAtTime(0, now + DIP);
        await wait(DIP * 1000 + 50);
      }
      const transport = this.tr;
      transport.stop();
      await this.swap(score, seed, 0);
      if (wasPlaying || autoplay) {
        if (this.context.rawContext.state === 'suspended') await this.resume();
        transport.start(this.startOffset);
        const now = this.now();
        this.fade.gain.cancelScheduledValues(now);
        this.fade.gain.setValueAtTime(0, now);
        this.fade.gain.linearRampToValueAtTime(1, now + FADE_IN);
        this.state = 'playing';
      }
    });
  }

  setVolume(v: number) {
    this.settings.volume = Math.max(0, Math.min(1, v));
    this.master?.gain.rampTo(this.volumeGain(), 0.15);
  }

  setMuted(m: boolean) {
    this.settings.muted = m;
    this.master?.gain.rampTo(this.volumeGain(), 0.3);
  }

  setMono(on: boolean) {
    this.settings.mono = on;
    this.widener?.width.rampTo(on ? 0 : 0.5, 0.3);
  }

  setAmbience(layer: AmbienceId, level: number) {
    this.settings.ambience = { ...this.settings.ambience, [layer]: level };
    this.rack?.setAmbience(layer, level, 1.2);
  }

  setAllAmbience(levels: Partial<Record<AmbienceId, number>>) {
    this.settings.ambience = { ...levels };
  }

  /** a long, gentle fade (sleep timer), then pause */
  async sleepFade(seconds: number) {
    if (!this.fade || this.state !== 'playing') return;
    const now = this.now();
    this.fade.gain.cancelScheduledValues(now);
    this.fade.gain.setValueAtTime(this.fade.gain.value, now);
    this.fade.gain.linearRampToValueAtTime(0, now + seconds);
    await wait(seconds * 1000);
    if (this.state === 'playing') {
      this.state = 'paused';
      await (this.context.rawContext as AudioContext).suspend();
    }
  }

  dispose() {
    this.tr.cancel(0);
    this.tr.stop();
    this.rack?.dispose();
    this.rack = null;
    this.score = null;
    this.state = 'idle';
  }
}

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export const engine = new AudioEngine();
