// Music theory helpers. Melody arithmetic happens in scale degrees, so every note is in the scale
// by construction; harmony uses chords voice-led for the smallest movement.

export type ScaleId = 'majorPentatonic' | 'minorPentatonic' | 'yo' | 'lydian' | 'dorian' | 'aeolian' | 'ionian';

export const SCALES: Record<ScaleId, number[]> = {
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  yo: [0, 2, 5, 7, 9],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  ionian: [0, 2, 4, 5, 7, 9, 11],
};

export const SCALE_NAMES: Record<ScaleId, string> = {
  majorPentatonic: 'major pentatonic',
  minorPentatonic: 'minor pentatonic',
  yo: 'yo',
  lydian: 'Lydian',
  dorian: 'Dorian',
  aeolian: 'Aeolian',
  ionian: 'major',
};

const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const NAMES_ASCII = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const mod = (n: number, m: number) => ((n % m) + m) % m;
export const pcName = (pc: number) => NAMES[mod(pc, 12)];
export const midiToName = (m: number) => `${NAMES_ASCII[mod(m, 12)]}${Math.floor(m / 12) - 1}`;
export const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** degree (any integer, can be negative) → MIDI note in the scale rooted at rootMidi */
export function degreeToMidi(deg: number, scale: readonly number[], rootMidi: number): number {
  const n = scale.length;
  return rootMidi + 12 * Math.floor(deg / n) + scale[mod(deg, n)];
}

/** nearest degree whose MIDI is closest to `midi` */
export function midiToDegree(midi: number, scale: readonly number[], rootMidi: number): number {
  const n = scale.length;
  const octave = Math.floor((midi - rootMidi) / 12);
  let best = octave * n;
  let bestDist = Infinity;
  for (let d = (octave - 1) * n; d <= (octave + 1) * n; d++) {
    const dist = Math.abs(degreeToMidi(d, scale, rootMidi) - midi);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best;
}

export interface Chord {
  symbol: string;
  /** semitones above the key root; may exceed 12 for extensions */
  tones: number[];
}

/** pitch classes (absolute, 0..11) of a chord in a key */
export const chordPcs = (chord: Chord, keyPc: number) => [...new Set(chord.tones.map((t) => mod(keyPc + t, 12)))];

/**
 * Voice-lead: among inversions and octave placements inside [lo, hi], pick the voicing with the
 * smallest summed movement from the previous voicing. The bottom two notes stay at least a
 * fifth apart below MIDI 52 to avoid mud.
 */
export function voiceLead(chord: Chord, keyPc: number, prev: number[] | null, lo = 48, hi = 72): number[] {
  const base = chord.tones.map((t) => t);
  const candidates: number[][] = [];
  const n = base.length;
  for (let inv = 0; inv < n; inv++) {
    const rotated = base.map((t, i) => (i < inv ? t + 12 : t)).sort((a, b) => a - b);
    for (let oct = 2; oct <= 6; oct++) {
      const v = rotated.map((t) => keyPc + 12 * oct + t);
      if (v[0] < lo || v[v.length - 1] > hi) continue;
      if (v[0] < 52 && v.length > 1 && v[1] - v[0] < 7 && v[1] - v[0] !== 0) continue;
      candidates.push(v);
    }
  }
  if (candidates.length === 0) {
    // fall back to root position near the middle of the range
    let v = base.map((t) => keyPc + 48 + t);
    while (v[0] < lo) v = v.map((x) => x + 12);
    return v;
  }
  if (!prev || prev.length === 0) {
    const mid = (lo + hi) / 2;
    return candidates.reduce((a, b) => (Math.abs(avg(a) - mid + 4) < Math.abs(avg(b) - mid + 4) ? a : b));
  }
  let best = candidates[0];
  let bestCost = Infinity;
  for (const c of candidates) {
    const cost = movement(prev, c);
    if (cost < bestCost) {
      bestCost = cost;
      best = c;
    }
  }
  return best;
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function movement(a: number[], b: number[]): number {
  // each note of b moves from the nearest note of a, plus a small penalty for a shifted centre
  let cost = 0;
  for (const x of b) cost += Math.min(...a.map((y) => Math.abs(x - y)));
  return cost + Math.abs(avg(a) - avg(b)) * 0.5;
}

/**
 * The MIDI note nearest to `target` that is both in the scale and a chord tone.
 * Falls back to the nearest scale note if the chord shares no tone with the scale.
 */
export function nearestChordTone(target: number, chordPitchClasses: number[], scale: readonly number[], rootMidi: number): number {
  const scalePcs = new Set(scale.map((s) => mod(rootMidi + s, 12)));
  const allowed = chordPitchClasses.filter((pc) => scalePcs.has(pc));
  const pool = allowed.length ? allowed : [...scalePcs];
  let best = target;
  let bestDist = Infinity;
  for (let m = target - 7; m <= target + 7; m++) {
    if (!pool.includes(mod(m, 12))) continue;
    const d = Math.abs(m - target) + (m > target ? 0.1 : 0); // prefer resolving downward on ties
    if (d < bestDist) {
      bestDist = d;
      best = m;
    }
  }
  return best;
}

export const inScale = (midi: number, scale: readonly number[], rootMidi: number) =>
  scale.some((s) => mod(rootMidi + s, 12) === mod(midi, 12));
