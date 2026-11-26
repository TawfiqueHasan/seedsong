// The instrument rack. ONE factory serves both live playback and Tone.Offline export, so the
// downloaded file sounds exactly like what the listener heard. Every node is created with the
// current Tone context (inside Tone.Offline that is the offline context).

import * as Tone from 'tone';
import { createRng } from '../core/random';
import { getMood, type AmbienceId, type LeadId, type MoodId } from '../core/music/moods';
import { degreeToMidi, midiToFreq, SCALES } from '../core/music/theory';
import type { ScoreChord, ScoreNote } from '../core/music/score';

type Transport = ReturnType<typeof Tone.getTransport>;

export interface RackOptions {
  bpm: number;
  ambience: Partial<Record<AmbienceId, number>>;
  /** include ambience at all (export toggle) */
  withAmbience: boolean;
  seed: string;
}

export interface Rack {
  readonly moodId: MoodId;
  readonly ready: Promise<void>;
  readonly output: Tone.Gain;
  play(note: ScoreNote, time: number, durationOverride?: number): void;
  playChord(chord: ScoreChord, time: number, durationOverride?: number): void;
  /** soften every sounding voice (used before seeking and on stop) */
  releaseAll(time?: number): void;
  setAmbience(layer: AmbienceId, level: number, ramp?: number): void;
  /** schedule the occasional ambience events (birds, chimes, crackles) on a transport */
  scheduleAmbience(transport: Transport, from?: number): void;
  setTempo(bpm: number): void;
  dispose(): void;
}

const db = (x: number) => Tone.dbToGain(x);
const hz = (midi: number) => midiToFreq(midi);

interface Voice {
  trigger(midi: number, dur: number, time: number, vel: number): void;
  release(time: number): void;
  output: Tone.ToneAudioNode;
  dispose(): void;
}

function polyVoice(synth: Tone.PolySynth): Voice {
  return {
    trigger: (m, d, t, v) => synth.triggerAttackRelease(hz(m), d, t, v),
    release: (t) => synth.releaseAll(t),
    output: synth,
    dispose: () => synth.dispose(),
  };
}

/** a small pool of Karplus–Strong plucks (PluckSynth is monophonic): a feedback loop, so even the sound is recursive */
function pluckVoice(opts: { dampening: number; resonance: number; attackNoise: number; size?: number }): Voice {
  const out = new Tone.Gain(1);
  const pool = Array.from({ length: opts.size ?? 6 }, () => {
    const synth = new Tone.PluckSynth({ attackNoise: opts.attackNoise, dampening: opts.dampening, resonance: opts.resonance, release: 1.2 });
    const gain = new Tone.Gain(0.5);
    synth.connect(gain);
    gain.connect(out);
    return { synth, gain };
  });
  let i = 0;
  return {
    trigger: (m, d, t, v) => {
      const p = pool[i++ % pool.length];
      p.gain.gain.setValueAtTime(v, t);
      p.synth.triggerAttackRelease(hz(m), Math.max(0.2, d), t);
    },
    release: (t) => pool.forEach((p) => p.gain.gain.setTargetAtTime(0, t, 0.08)),
    output: out,
    dispose: () => {
      pool.forEach((p) => {
        p.synth.dispose();
        p.gain.dispose();
      });
      out.dispose();
    },
  };
}

function leadVoice(lead: LeadId): Voice {
  switch (lead) {
    case 'epiano':
      return polyVoice(
        new Tone.PolySynth({
          voice: Tone.FMSynth,
          maxPolyphony: 16,
          options: {
            harmonicity: 3,
            modulationIndex: 2.2,
            oscillator: { type: 'sine' },
            modulation: { type: 'sine' },
            envelope: { attack: 0.012, decay: 1.6, sustain: 0.15, release: 2.4 },
            modulationEnvelope: { attack: 0.01, decay: 0.6, sustain: 0.1, release: 1.2 },
          },
        }),
      );
    case 'kalimba':
      return polyVoice(
        new Tone.PolySynth({
          voice: Tone.FMSynth,
          maxPolyphony: 16,
          options: {
            harmonicity: 8,
            modulationIndex: 1.6,
            oscillator: { type: 'sine' },
            modulation: { type: 'sine' },
            envelope: { attack: 0.004, decay: 1.1, sustain: 0, release: 1.4 },
            modulationEnvelope: { attack: 0.002, decay: 0.25, sustain: 0, release: 0.4 },
          },
        }),
      );
    case 'glass':
      return polyVoice(
        new Tone.PolySynth({
          voice: Tone.FMSynth,
          maxPolyphony: 16,
          options: {
            harmonicity: 3.5,
            modulationIndex: 3,
            oscillator: { type: 'sine' },
            modulation: { type: 'sine' },
            envelope: { attack: 0.02, decay: 2.8, sustain: 0.05, release: 3.2 },
            modulationEnvelope: { attack: 0.01, decay: 0.9, sustain: 0.05, release: 1.5 },
          },
        }),
      );
    case 'harp':
      return pluckVoice({ attackNoise: 0.6, dampening: 3200, resonance: 0.93 });
    case 'koto':
      return pluckVoice({ attackNoise: 0.9, dampening: 2600, resonance: 0.95 });
  }
}

export function createRack(moodId: MoodId, opts: RackOptions): Rack {
  const mood = getMood(moodId);
  const context = Tone.getContext(); // live or offline; every node below binds to it
  const nodes: Array<{ dispose(): unknown }> = [];
  const keep = <T extends { dispose(): unknown }>(n: T): T => {
    nodes.push(n);
    return n;
  };

  // ── master chain: sum → EQ → compressor → makeup → limiter(−1 dB) → output
  const sum = keep(new Tone.Gain(1));
  const eq = keep(new Tone.EQ3({ low: 0, mid: -1, high: -3 }));
  const comp = keep(new Tone.Compressor({ threshold: -20, ratio: 2.5, attack: 0.03, release: 0.3 }));
  // makeup gain into the limiter: measured raw mix ≈ −25 dB RMS, so +6 dB lands live playback near −19
  const makeup = keep(new Tone.Gain(db(6)));
  const limiter = keep(new Tone.Limiter(-1));
  const output = keep(new Tone.Gain(1));
  sum.chain(eq, comp, makeup, limiter, output);

  // ── sends: one long reverb (low-cut return) and a dotted-eighth delay
  const reverb = keep(new Tone.Reverb({ decay: 7, preDelay: 0.04, wet: 1 }));
  const reverbLowCut = keep(new Tone.Filter(220, 'highpass'));
  const reverbIn = keep(new Tone.Gain(1));
  reverbIn.chain(reverb, reverbLowCut, sum);
  const delay = keep(new Tone.FeedbackDelay({ delayTime: (60 / opts.bpm) * 0.75, feedback: 0.3, wet: 1 }));
  const delayTone = keep(new Tone.Filter(2600, 'lowpass'));
  const delayIn = keep(new Tone.Gain(1));
  delayIn.chain(delay, delayTone);
  delayTone.connect(sum);
  delayTone.connect(reverbIn);

  const send = (node: Tone.ToneAudioNode, reverbAmt: number, delayAmt = 0) => {
    const r = keep(new Tone.Gain(reverbAmt));
    node.connect(r);
    r.connect(reverbIn);
    if (delayAmt > 0) {
      const d = keep(new Tone.Gain(delayAmt));
      node.connect(d);
      d.connect(delayIn);
    }
  };

  // ── pad: fat triangles, slow filter LFO, chorus
  const padSynth = keep(
    new Tone.PolySynth({
      voice: Tone.Synth,
      maxPolyphony: 14,
      options: {
        oscillator: { type: 'fattriangle', count: 2, spread: 16 },
        envelope: { attack: 2.5, decay: 1, sustain: 0.8, release: 6 },
      },
    }),
  );
  const padHp = keep(new Tone.Filter(150, 'highpass'));
  const padLp = keep(new Tone.Filter({ frequency: 1200, type: 'lowpass', rolloff: -24 }));
  const padLfo = keep(new Tone.LFO({ frequency: 0.05, min: 700, max: 1600 }));
  padLfo.connect(padLp.frequency);
  padLfo.start();
  const chorus = keep(new Tone.Chorus({ frequency: 0.3, delayTime: 3.5, depth: 0.4, wet: 0.5 }));
  chorus.start();
  const padOut = keep(new Tone.Gain(db(-18)));
  padSynth.chain(padHp, padLp, chorus, padOut, sum);
  send(padOut, 0.45);
  const pad = polyVoice(padSynth);

  // ── drone: root + fifth, slow swell and a gentle amplitude LFO
  const droneSynth = keep(
    new Tone.PolySynth({
      voice: Tone.Synth,
      maxPolyphony: 6,
      options: { oscillator: { type: mood.id === 'temple' ? 'fatsine' : 'sine', count: 2, spread: 6 } as never, envelope: { attack: 6, decay: 0, sustain: 1, release: 8 } },
    }),
  );
  const droneTrem = keep(new Tone.Gain(1));
  const droneLfo = keep(new Tone.LFO({ frequency: 0.07, min: 0.75, max: 1 }));
  droneLfo.connect(droneTrem.gain);
  droneLfo.start();
  const droneOut = keep(new Tone.Gain(db(-22)));
  droneSynth.chain(droneTrem, droneOut, sum);
  send(droneOut, 0.25);
  const drone = polyVoice(droneSynth);

  // ── bass: soft sine on chord roots
  const bassSynth = keep(
    new Tone.PolySynth({ voice: Tone.Synth, maxPolyphony: 4, options: { oscillator: { type: 'sine' }, envelope: { attack: 1.2, decay: 0.5, sustain: 0.8, release: 4 } } }),
  );
  const bassLp = keep(new Tone.Filter(320, 'lowpass'));
  const bassOut = keep(new Tone.Gain(db(-21)));
  bassSynth.chain(bassLp, bassOut, sum);
  const bass = polyVoice(bassSynth);

  // ── lead (per mood), shared by ornaments; panned per note
  const lead = leadVoice(mood.lead);
  keep(lead);
  const leadHp = keep(new Tone.Filter(180, 'highpass'));
  const leadLp = keep(new Tone.Filter(mood.lead === 'glass' ? 3800 : 4500, 'lowpass'));
  const leadPan = keep(new Tone.Panner(0));
  const leadLevel = mood.lead === 'harp' || mood.lead === 'koto' ? -9 : mood.lead === 'glass' ? -17 : -14;
  const leadOut = keep(new Tone.Gain(db(leadLevel)));
  lead.output.chain(leadHp, leadLp, leadPan, leadOut, sum);
  send(leadOut, mood.lead === 'glass' ? 0.6 : 0.4, 0.2);

  // ── bells: FM bell, high-passed, heavy reverb
  const bellSynth = keep(
    new Tone.PolySynth({
      voice: Tone.FMSynth,
      maxPolyphony: 24,
      options: {
        harmonicity: 5.07,
        modulationIndex: 6,
        oscillator: { type: 'sine' },
        modulation: { type: 'sine' },
        envelope: { attack: 0.004, decay: 3.5, sustain: 0, release: 3 },
        modulationEnvelope: { attack: 0.002, decay: 0.7, sustain: 0.15, release: 2 },
      },
    }),
  );
  const bellHp = keep(new Tone.Filter(400, 'highpass'));
  const bellLp = keep(new Tone.Filter(6000, 'lowpass'));
  const bellPan = keep(new Tone.Panner(0));
  const bellOut = keep(new Tone.Gain(db(-22)));
  bellSynth.chain(bellHp, bellLp, bellPan, bellOut, sum);
  send(bellOut, 0.75, 0.22);
  const bell = polyVoice(bellSynth);

  // ── ambience: procedural layers, created on demand
  const ambBus = keep(new Tone.Gain(opts.withAmbience ? 1 : 0));
  ambBus.connect(sum);
  const layers = new Map<AmbienceId, { gain: Tone.Gain; max: number; parts: Array<{ dispose(): unknown }>; sources: Array<Tone.Noise | Tone.Oscillator> }>();
  const levels: Partial<Record<AmbienceId, number>> = { ...opts.ambience };

  function buildLayer(id: AmbienceId) {
    const parts: Array<{ dispose(): unknown }> = [];
    const sources: Array<Tone.Noise | Tone.Oscillator> = [];
    const p = <T extends { dispose(): unknown }>(n: T) => {
      parts.push(n);
      return n;
    };
    const gain = p(new Tone.Gain(0));
    gain.connect(ambBus);
    let max = db(-28);
    const lfo = (frequency: number, min: number, max: number, target: Tone.Param<'frequency'> | Tone.Param<'gain'> | Tone.Signal<'frequency'>, type: 'sine' | 'square' = 'sine') => {
      const l = p(new Tone.LFO({ frequency, min, max, type }));
      l.connect(target as never);
      l.start();
      return l;
    };
    switch (id) {
      case 'rain': {
        const n = p(new Tone.Noise('pink'));
        const hp = p(new Tone.Filter(400, 'highpass'));
        const lp = p(new Tone.Filter(3500, 'lowpass'));
        n.chain(hp, lp, gain);
        const patter = p(new Tone.Noise('white'));
        const php = p(new Tone.Filter(5200, 'highpass'));
        const pg = p(new Tone.Gain(0.25));
        lfo(0.23, 0.12, 0.35, pg.gain);
        patter.chain(php, pg, gain);
        sources.push(n, patter);
        max = db(-27);
        break;
      }
      case 'ocean': {
        const n = p(new Tone.Noise('brown'));
        const af = p(new Tone.AutoFilter({ frequency: 0.08, baseFrequency: 200, octaves: 3, wet: 1 }));
        af.start();
        const swell = p(new Tone.Gain(0.6));
        lfo(1 / 12, 0.25, 1, swell.gain);
        n.chain(af, swell, gain);
        sources.push(n);
        max = db(-22);
        break;
      }
      case 'wind': {
        const n = p(new Tone.Noise('pink'));
        const bp = p(new Tone.Filter({ frequency: 600, type: 'bandpass', Q: 1.4 }));
        lfo(0.05, 250, 1100, bp.frequency);
        const g = p(new Tone.Gain(0.7));
        lfo(0.09, 0.35, 1, g.gain);
        n.chain(bp, g, gain);
        sources.push(n);
        max = db(-26);
        break;
      }
      case 'stream': {
        const n = p(new Tone.Noise('white'));
        const bp = p(new Tone.Filter({ frequency: 2000, type: 'bandpass', Q: 0.8 }));
        lfo(3.3, 1500, 3000, bp.frequency);
        const lp = p(new Tone.Filter(4500, 'lowpass'));
        n.chain(bp, lp, gain);
        sources.push(n);
        max = db(-31);
        break;
      }
      case 'crickets': {
        const mk = (f: number, trill: number, pulse: number, pan: number) => {
          const o = p(new Tone.Oscillator(f, 'sine'));
          const t = p(new Tone.Gain(0));
          lfo(trill, 0, 1, t.gain, 'square');
          const pg = p(new Tone.Gain(0));
          lfo(pulse, 0, 1, pg.gain, 'square');
          const pn = p(new Tone.Panner(pan));
          o.chain(t, pg, pn, gain);
          sources.push(o);
        };
        mk(4300, 28, 0.62, -0.5);
        mk(4720, 31, 0.47, 0.45);
        max = db(-36);
        break;
      }
      case 'fire': {
        const n = p(new Tone.Noise('brown'));
        const lp = p(new Tone.Filter(480, 'lowpass'));
        const g = p(new Tone.Gain(0.8));
        lfo(0.31, 0.6, 1, g.gain);
        n.chain(lp, g, gain);
        sources.push(n);
        max = db(-28);
        break;
      }
      case 'birds':
      case 'chimes':
        max = db(-26);
        break;
    }
    return { gain, max, parts, sources };
  }

  function ensureLayer(id: AmbienceId) {
    let l = layers.get(id);
    if (!l) {
      l = buildLayer(id);
      layers.set(id, l);
      for (const s of l.sources) s.start();
    }
    return l;
  }
  function setAmbience(id: AmbienceId, level: number, ramp = 1.5) {
    levels[id] = level;
    const ev = eventGains[id];
    if (ev) ev.gain.gain.rampTo(level * level * ev.max * 1.6, ramp);
    if (id === 'birds' || id === 'chimes') return;
    if (level <= 0 && !layers.has(id)) return;
    const l = ensureLayer(id);
    l.gain.gain.rampTo(level * level * l.max * 1.6, ramp);
  }

  // occasional ambience events (created up front: callbacks may run while another context is global)
  const birdSynth = keep(new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.05 } }));
  const birdHp = keep(new Tone.Filter(1800, 'highpass'));
  const birdPan = keep(new Tone.Panner(0));
  const birdGain = keep(new Tone.Gain(0));
  birdSynth.chain(birdHp, birdPan, birdGain, ambBus);
  send(birdPan, 0.5);
  const chimeSynth = keep(
    new Tone.PolySynth({
      voice: Tone.FMSynth,
      maxPolyphony: 8,
      options: { harmonicity: 5.07, modulationIndex: 4, envelope: { attack: 0.004, decay: 4, sustain: 0, release: 4 }, modulationEnvelope: { attack: 0.002, decay: 0.5, sustain: 0, release: 1 } },
    }),
  );
  const chimeHp = keep(new Tone.Filter(700, 'highpass'));
  const chimeGain = keep(new Tone.Gain(0));
  chimeSynth.chain(chimeHp, chimeGain, ambBus);
  send(chimeGain, 0.9);
  const crackle = keep(new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.01 } }));
  const crackleHp = keep(new Tone.Filter(1900, 'highpass'));
  const crackleGain = keep(new Tone.Gain(0));
  crackle.chain(crackleHp, crackleGain, ambBus);
  const eventGains: Partial<Record<AmbienceId, { gain: Tone.Gain; max: number }>> = {
    birds: { gain: birdGain, max: db(-24) },
    chimes: { gain: chimeGain, max: db(-22) },
    fire: { gain: crackleGain, max: db(-30) },
  };
  if (opts.withAmbience) for (const [id, v] of Object.entries(levels)) if ((v ?? 0) > 0) setAmbience(id as AmbienceId, v ?? 0, 3);

  function scheduleAmbience(transport: Transport, from = 0) {
    if (!opts.withAmbience) return;
    const rng = createRng(`ambience:${opts.seed}:${from.toFixed(2)}`);
    // birds: short rising chirps in little groups
    transport.scheduleRepeat(
      (time) => {
        const lvl = levels.birds ?? 0;
        if (lvl <= 0 || !rng.chance(0.4)) return;
        const count = rng.int(2, 4);
        const base = rng.range(2600, 3900);
        birdPan.pan.setValueAtTime(rng.range(-0.7, 0.7), time);
        for (let i = 0; i < count; i++) {
          const t = time + i * rng.range(0.11, 0.2);
          const f0 = base * rng.range(0.9, 1.1);
          birdSynth.triggerAttackRelease(f0, 0.07, t, 0.35 + rng() * 0.3);
          birdSynth.frequency.setValueAtTime(f0, t);
          birdSynth.frequency.exponentialRampToValueAtTime(f0 * rng.range(1.15, 1.45), t + 0.07);
        }
      },
      2.7,
      from,
    );
    // chimes: distant bells on pentatonic scale notes
    transport.scheduleRepeat(
      (time) => {
        const lvl = levels.chimes ?? 0;
        if (lvl <= 0 || !rng.chance(0.45)) return;
        const scale = SCALES[mood.scale];
        const m = degreeToMidi(rng.int(10, 15), scale, 60 + mood.keyPc - 12);
        chimeSynth.triggerAttackRelease(hz(m), 2, time, 0.25 + rng() * 0.2);
      },
      3.9,
      from + 1.3,
    );
    // fire: little crackles
    transport.scheduleRepeat(
      (time) => {
        const lvl = levels.fire ?? 0;
        if (lvl <= 0 || !rng.chance(0.18)) return;
        crackle.triggerAttackRelease(0.02, time + rng.range(0, 0.1), 0.3 + rng() * 0.6);
      },
      0.13,
      from + 0.5,
    );
  }

  return {
    moodId,
    ready: reverb.ready,
    output,
    play(note, time, durationOverride) {
      const dur = durationOverride ?? note.duration;
      switch (note.voice) {
        case 'lead':
        case 'ornament':
          leadPan.pan.setTargetAtTime(note.pan, time, 0.05);
          lead.trigger(note.midi, dur, time, note.voice === 'ornament' ? note.velocity * 0.75 : note.velocity);
          break;
        case 'bell':
          bellPan.pan.setTargetAtTime(note.pan, time, 0.05);
          bell.trigger(note.midi, dur, time, note.velocity);
          break;
        case 'drone':
          drone.trigger(note.midi, dur, time, note.velocity);
          break;
        case 'bass':
          bass.trigger(note.midi, dur, time, note.velocity);
          break;
        case 'pad':
          pad.trigger(note.midi, dur, time, note.velocity);
          break;
      }
    },
    playChord(chord, time, durationOverride) {
      const dur = durationOverride ?? chord.duration;
      padSynth.triggerAttackRelease(chord.midis.map(hz), dur, time, 0.55);
    },
    releaseAll(time = context.now()) {
      for (const v of [pad, drone, bass, lead, bell]) v.release(time);
    },
    setAmbience,
    scheduleAmbience,
    setTempo(bpm) {
      delay.delayTime.rampTo((60 / bpm) * 0.75, 0.5);
    },
    dispose() {
      for (const l of layers.values()) {
        for (const s of l.sources) s.stop();
        l.parts.forEach((x) => x.dispose());
      }
      layers.clear();
      for (const n of nodes.reverse()) n.dispose();
      nodes.length = 0;
    },
  };
}
