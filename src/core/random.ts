// Seeded randomness. The only source of randomness allowed outside tests (Math.random is banned),
// so the same seed always grows the same tree and the same song.

/** cyrb128: a fast 128-bit string hash, used to turn a seed word into PRNG state. */
export function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** sfc32: small fast counter PRNG with 128-bit state. Returns floats in [0, 1). */
function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export interface Rng {
  /** float in [0, 1) */
  (): number;
  /** float in [min, max) */
  range(min: number, max: number): number;
  /** integer in [min, max] */
  int(min: number, max: number): number;
  /** true with probability p */
  chance(p: number): boolean;
  /** symmetric jitter in [-amount, amount] */
  jitter(amount: number): number;
  pick<T>(items: readonly T[]): T;
  /** an independent stream derived from this seed and a label (stable regardless of call order) */
  fork(label: string): Rng;
  readonly seed: string;
}

export function createRng(seed: string): Rng {
  const [a, b, c, d] = cyrb128(seed);
  const next = sfc32(a, b, c, d);
  // warm up: the first outputs of sfc32 are weakly mixed
  for (let i = 0; i < 12; i++) next();
  const rng = (() => next()) as Rng;
  rng.range = (min, max) => min + (max - min) * next();
  rng.int = (min, max) => Math.floor(min + (max - min + 1) * next());
  rng.chance = (p) => next() < p;
  rng.jitter = (amount) => (next() * 2 - 1) * amount;
  rng.pick = (items) => items[Math.floor(next() * items.length)];
  rng.fork = (label) => createRng(`${seed}::${label}`);
  Object.defineProperty(rng, 'seed', { value: seed });
  return rng;
}

const ADJECTIVES = [
  'still', 'quiet', 'soft', 'slow', 'gentle', 'misty', 'velvet', 'silver', 'amber', 'hushed',
  'drifting', 'calm', 'warm', 'dreaming', 'golden', 'mossy', 'tender', 'pale', 'distant', 'evening',
  'morning', 'glowing', 'sleepy', 'woven', 'floating', 'lunar', 'tidal', 'cedar', 'willow', 'feather',
] as const;

const NOUNS = [
  'lake', 'fern', 'river', 'moss', 'cloud', 'ember', 'grove', 'harbor', 'meadow', 'lantern',
  'tide', 'willow', 'pebble', 'orchard', 'breeze', 'hollow', 'comet', 'garden', 'valley', 'reed',
  'aurora', 'cove', 'canopy', 'petal', 'brook', 'dune', 'firefly', 'glade', 'heron', 'lotus',
] as const;

/** A calm, human-friendly seed such as "still-lake-07". `entropy` comes from the caller (time, crypto). */
export function seedName(entropy: number): string {
  const rng = createRng(`seedname:${entropy}`);
  return `${rng.pick(ADJECTIVES)}-${rng.pick(NOUNS)}-${String(rng.int(1, 99)).padStart(2, '0')}`;
}

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
