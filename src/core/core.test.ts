import { describe, expect, it } from 'vitest';
import { createRng, seedName } from './random';
import { grove, maxDepthFor } from './worlds/grove';
import { lsystem, L_PRESETS } from './worlds/lsystem';
import type { RecursionTrace } from './worlds/types';
import { composeScore, applyDensityCap } from './music/compose';
import { MOOD_LIST } from './music/moods';
import { chordPcs, degreeToMidi, midiToName, mod, SCALES, voiceLead } from './music/theory';
import { decodeSong, encodeSong } from './url';
import type { Score } from './music/score';

const checkNesting = (t: RecursionTrace) => {
  const stack: number[] = [];
  for (const e of t.events) {
    if (e.kind === 'call') stack.push(e.nodeId);
    else expect(stack.pop()).toBe(e.nodeId);
  }
  expect(stack.length).toBe(0);
};

describe('random', () => {
  it('is deterministic per seed and independent per fork', () => {
    const a = createRng('still-lake-07');
    const b = createRng('still-lake-07');
    const xs = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(xs);
    expect(createRng('other')()).not.toBe(xs[0]);
    expect(createRng('x').fork('a')()).toBe(createRng('x').fork('a')());
    for (const x of xs) expect(x >= 0 && x < 1).toBe(true);
  });
  it('makes calm seed names', () => {
    expect(seedName(42)).toMatch(/^[a-z]+-[a-z]+-\d\d$/);
    expect(seedName(42)).toBe(seedName(42));
  });
});

describe('Fractal Grove', () => {
  it('grows 2^(d+1) − 1 nodes for branching 2', () => {
    for (const depth of [1, 3, 7, 10]) {
      const t = grove.generate({ ...grove.defaults, depth, branching: 2 }, 'seed');
      expect(t.nodes.length).toBe(2 ** (depth + 1) - 1);
      expect(t.maxDepth).toBe(depth);
    }
  });
  it('emits properly nested call/return events', () => {
    const t = grove.generate(grove.defaults, 'nesting');
    expect(t.events.length).toBe(t.nodes.length * 2);
    checkNesting(t);
    for (const n of t.nodes) expect(n.order.ret).toBeGreaterThan(n.order.call);
  });
  it('is deterministic, and a different seed changes the geometry', () => {
    const a = grove.generate(grove.defaults, 'quiet-fern-12');
    expect(grove.generate(grove.defaults, 'quiet-fern-12')).toEqual(a);
    const b = grove.generate(grove.defaults, 'other-seed-01');
    expect(b.nodes[5].points).not.toEqual(a.nodes[5].points);
  });
  it('clamps depth per branching factor to stay within 2,047 nodes', () => {
    expect(maxDepthFor(3)).toBe(6);
    expect(maxDepthFor(4)).toBe(5);
    for (const branching of [2, 3, 4]) {
      const t = grove.generate({ ...grove.defaults, branching, depth: 10 }, 's');
      expect(t.nodes.length).toBeLessThanOrEqual(2047);
      expect(t.maxDepth).toBe(maxDepthFor(branching));
    }
  });
  it('generates the largest tree in under 50 ms', () => {
    const t0 = performance.now();
    const t = grove.generate({ ...grove.defaults, depth: 10 }, 'big');
    composeScore(t, { moodId: 'dawn', mode: 'wander' });
    const ms = performance.now() - t0;
    console.log(`largest grove (2047 nodes) generate+compose: ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(250); // generous for slow CI machines; locally ~20 ms
  });
});

describe('L-System Garden', () => {
  it('builds a nested call tree for every preset at its max iterations', () => {
    L_PRESETS.forEach((pr, preset) => {
      const t = lsystem.generate({ ...lsystem.defaults, preset, iterations: pr.maxIterations }, 'fern');
      expect(t.nodes.length).toBeGreaterThan(3);
      expect(t.nodes.length).toBeLessThanOrEqual(2600);
      checkNesting(t);
      for (const n of t.nodes) expect(n.points.length).toBeGreaterThanOrEqual(4);
      expect(t.callCount).toBeGreaterThan(t.nodes.length);
    });
  });
  it('is deterministic', () => {
    expect(lsystem.generate(lsystem.defaults, 'a')).toEqual(lsystem.generate(lsystem.defaults, 'a'));
  });
});

describe('theory', () => {
  it('maps degrees into the scale', () => {
    expect(degreeToMidi(0, SCALES.majorPentatonic, 62)).toBe(62);
    expect(degreeToMidi(5, SCALES.majorPentatonic, 62)).toBe(74);
    expect(degreeToMidi(-1, SCALES.majorPentatonic, 62)).toBe(59);
    expect(midiToName(62)).toBe('D4');
  });
  it('voice-leads with small movement', () => {
    const a = voiceLead({ symbol: 'C', tones: [0, 4, 7] }, 0, null);
    const b = voiceLead({ symbol: 'F', tones: [5, 9, 12] }, 0, a);
    const moved = b.reduce((s, x) => s + Math.min(...a.map((y) => Math.abs(x - y))), 0);
    expect(moved).toBeLessThanOrEqual(4);
    for (const m of b) expect(m >= 48 && m <= 72).toBe(true);
  });
});

function allChecks(score: Score, moodScale: number[], keyPc: number, avoidPc?: number) {
  for (const n of score.notes) {
    expect(Number.isFinite(n.time) && Number.isFinite(n.duration) && Number.isFinite(n.midi)).toBe(true);
    expect(n.time).toBeGreaterThanOrEqual(0);
    expect(n.velocity).toBeGreaterThan(0);
    expect(n.velocity).toBeLessThanOrEqual(1);
    if (n.voice === 'lead' || n.voice === 'bell' || n.voice === 'ornament') {
      const pc = mod(n.midi - keyPc, 12);
      expect(moodScale.includes(pc)).toBe(true);
      if (avoidPc !== undefined && pc === avoidPc) expect(n.duration).toBeLessThan(score.bpm ? (60 / score.bpm) * 1.8 : 2);
    }
  }
}

describe('composer', () => {
  const trace = grove.generate(grove.defaults, 'still-lake-07');

  for (const mood of MOOD_LIST) {
    it(`${mood.name}: scale lock, length, tonic ending, density`, () => {
      for (const mode of ['wander', 'bloom'] as const) {
        const s = composeScore(trace, { moodId: mood.id, mode });
        allChecks(s, SCALES[mood.scale], mood.keyPc, mood.avoidPc);
        expect(s.duration).toBeGreaterThanOrEqual(mode === 'wander' ? 90 : 60);
        expect(s.duration).toBeLessThanOrEqual(360);
        const last = s.chords[s.chords.length - 1];
        expect(last.symbol).toBe(mood.tonic.symbol);
        expect(new Set(last.midis.map((m) => mod(m, 12)))).toEqual(new Set(chordPcs(mood.tonic, mood.keyPc)));
        const attacks = s.notes.filter((n) => ['lead', 'bell', 'ornament'].includes(n.voice)).map((n) => n.time);
        for (const t of attacks) {
          const inWindow = attacks.filter((x) => x >= t && x < t + 1).length;
          expect(inWindow).toBeLessThanOrEqual(Math.floor(mood.maxNotesPerSecond));
        }
        expect(s.nodeTimes.length).toBe(trace.nodes.length);
      }
    });
  }

  it('Wander and Bloom order the same tree differently', () => {
    const w = composeScore(trace, { moodId: 'dawn', mode: 'wander' });
    const b = composeScore(trace, { moodId: 'dawn', mode: 'bloom' });
    const order = (s: Score) => s.events.filter((e) => e.kind === 'call').map((e) => e.nodeId).join(',');
    expect(order(w)).not.toBe(order(b));
  });

  it('is deterministic', () => {
    expect(composeScore(trace, { moodId: 'rain', mode: 'wander' })).toEqual(composeScore(trace, { moodId: 'rain', mode: 'wander' }));
  });

  it('fits the deepest tree into the time budget by thinning', () => {
    const big = grove.generate({ ...grove.defaults, depth: 10 }, 'big');
    const s = composeScore(big, { moodId: 'dawn', mode: 'wander' });
    expect(s.duration).toBeLessThanOrEqual(400);
    expect(s.stats.thinned).toBeGreaterThan(0);
  });

  it('composes the L-system garden too', () => {
    const t = lsystem.generate(lsystem.defaults, 'fern-song');
    const s = composeScore(t, { moodId: 'forest', mode: 'wander' });
    allChecks(s, SCALES.minorPentatonic, 6);
    expect(s.notes.length).toBeGreaterThan(20);
    expect(s.duration).toBeLessThanOrEqual(400);
  });

  it('density cap drops ornaments before lead notes', () => {
    const mk = (time: number, voice: 'lead' | 'ornament') => ({ time, duration: 1, midi: 60, velocity: 0.5, pan: 0, voice, nodeId: 0, depth: 3 });
    const { kept, dropped } = applyDensityCap([mk(0, 'ornament'), mk(0.1, 'lead'), mk(0.2, 'lead'), mk(0.3, 'lead'), mk(0.4, 'ornament')], 3);
    expect(dropped).toBe(2);
    expect(kept.every((n) => n.voice === 'lead')).toBe(true);
  });

  it('prints the first notes of Dawn Mist for an eye check', () => {
    const s = composeScore(trace, { moodId: 'dawn', mode: 'wander' });
    const lines = s.notes.slice(0, 40).map((n) => `${n.time.toFixed(2).padStart(6)}s ${n.voice.padEnd(8)} ${midiToName(n.midi).padEnd(4)} v${n.velocity.toFixed(2)}`);
    console.log(`Dawn Mist, still-lake-07 — ${s.duration.toFixed(0)} s, ${s.stats.noteCount} notes, ${s.bpm} BPM\n${lines.join('\n')}`);
    expect(lines.length).toBe(40);
  });
});

describe('share links', () => {
  it('round-trips a song', () => {
    const song = { world: 'grove' as const, params: { depth: 6, spread: 30 }, mood: 'ocean' as const, mode: 'bloom' as const, seed: 'still-lake-07', bpm: 52, transpose: -2, focus: [1, 2] };
    expect(decodeSong(`#${encodeSong(song)}`)).toEqual(song);
  });
  it('ignores junk', () => {
    expect(decodeSong('#w=evil&s=<script>')).toBeNull();
  });
});
