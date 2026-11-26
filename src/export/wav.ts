// WAV encoder (written in-house): peak normalise, fade out, TPDF dither to 16-bit (or 24-bit),
// and a LIST/INFO chunk carrying the title and the share link so every file can be regrown.

export interface WavOptions {
  bitDepth: 16 | 24;
  /** peak-normalise to this many dBFS (e.g. -1); null to skip */
  normalizeDb: number | null;
  /** seconds of fade-out at the end */
  fadeOut: number;
  info?: Partial<Record<'INAM' | 'IART' | 'ICMT' | 'ISFT' | 'ICRD', string>>;
  /** deterministic dither seed */
  ditherSeed?: number;
}

export interface PcmInput {
  sampleRate: number;
  channels: Float32Array[];
}

export function measure(channels: Float32Array[]): { peak: number; rms: number } {
  let peak = 0;
  let sum = 0;
  let n = 0;
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i++) {
      const v = Math.abs(ch[i]);
      if (v > peak) peak = v;
      sum += ch[i] * ch[i];
    }
    n += ch.length;
  }
  return { peak, rms: Math.sqrt(sum / Math.max(1, n)) };
}

export const toDb = (x: number) => (x <= 0 ? -Infinity : 20 * Math.log10(x));

/** apply gain + fade in place (on copies) and return processed channels */
export function master(input: PcmInput, opts: Pick<WavOptions, 'normalizeDb' | 'fadeOut'>): Float32Array[] {
  const out = input.channels.map((c) => new Float32Array(c));
  const { peak } = measure(out);
  let gain = 1;
  if (opts.normalizeDb !== null && peak > 0) gain = Math.pow(10, opts.normalizeDb / 20) / peak;
  const fadeLen = Math.min(out[0]?.length ?? 0, Math.round(opts.fadeOut * input.sampleRate));
  for (const ch of out) {
    const start = ch.length - fadeLen;
    for (let i = 0; i < ch.length; i++) {
      let g = gain;
      if (i >= start && fadeLen > 0) {
        const x = (i - start) / fadeLen;
        g *= Math.cos((x * Math.PI) / 2) ** 2; // equal-power style fade, smooth to silence
      }
      ch[i] *= g;
    }
  }
  return out;
}

export function encodeWav(input: PcmInput, opts: WavOptions): Uint8Array {
  const channels = master(input, opts);
  const numCh = channels.length;
  const frames = channels[0]?.length ?? 0;
  const bytesPer = opts.bitDepth / 8;
  const dataBytes = frames * numCh * bytesPer;
  const info = buildInfo(opts.info ?? {});
  const total = 12 + 24 + info.length + 8 + dataBytes;
  const buf = new ArrayBuffer(total);
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let p = 0;
  const str = (s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(p++, s.charCodeAt(i));
  };
  const u32 = (v: number) => {
    view.setUint32(p, v, true);
    p += 4;
  };
  const u16 = (v: number) => {
    view.setUint16(p, v, true);
    p += 2;
  };
  str('RIFF');
  u32(total - 8);
  str('WAVE');
  str('fmt ');
  u32(16);
  u16(1); // PCM
  u16(numCh);
  u32(input.sampleRate);
  u32(input.sampleRate * numCh * bytesPer);
  u16(numCh * bytesPer);
  u16(opts.bitDepth);
  bytes.set(info, p);
  p += info.length;
  str('data');
  u32(dataBytes);

  // TPDF dither: sum of two uniform randoms, ±1 LSB; a tiny LCG keeps it deterministic
  let seed = (opts.ditherSeed ?? 12345) >>> 0;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  if (opts.bitDepth === 16) {
    for (let i = 0; i < frames; i++) {
      for (let c = 0; c < numCh; c++) {
        const s = channels[c][i] * 32767 + (rand() - rand());
        view.setInt16(p, Math.max(-32768, Math.min(32767, Math.round(s))), true);
        p += 2;
      }
    }
  } else {
    for (let i = 0; i < frames; i++) {
      for (let c = 0; c < numCh; c++) {
        const s = Math.max(-8388608, Math.min(8388607, Math.round(channels[c][i] * 8388607 + (rand() - rand()))));
        view.setUint8(p++, s & 0xff);
        view.setUint8(p++, (s >> 8) & 0xff);
        view.setUint8(p++, (s >> 16) & 0xff);
      }
    }
  }
  return bytes;
}

function buildInfo(info: Partial<Record<string, string>>): Uint8Array {
  const entries = Object.entries(info).filter(([, v]) => v) as Array<[string, string]>;
  if (entries.length === 0) return new Uint8Array(0);
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  for (const [id, value] of entries) {
    const text = enc.encode(`${value}\0`);
    const padded = text.length + (text.length % 2);
    const chunk = new Uint8Array(8 + padded);
    const dv = new DataView(chunk.buffer);
    for (let i = 0; i < 4; i++) chunk[i] = id.charCodeAt(i);
    dv.setUint32(4, text.length, true);
    chunk.set(text, 8);
    parts.push(chunk);
  }
  const bodyLen = 4 + parts.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(8 + bodyLen);
  const dv = new DataView(out.buffer);
  out.set([76, 73, 83, 84], 0); // LIST
  dv.setUint32(4, bodyLen, true);
  out.set([73, 78, 70, 79], 8); // INFO
  let p = 12;
  for (const part of parts) {
    out.set(part, p);
    p += part.length;
  }
  return out;
}

/** parse just enough of a WAV header to verify it (used by tests and audio QA) */
export function parseWav(bytes: Uint8Array): { sampleRate: number; channels: number; bitDepth: number; dataBytes: number; frames: number; info: Record<string, string> } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (o: number) => String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('not a WAV');
  let p = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitDepth = 0;
  let dataBytes = 0;
  const info: Record<string, string> = {};
  while (p + 8 <= bytes.length) {
    const id = tag(p);
    const size = view.getUint32(p + 4, true);
    if (id === 'fmt ') {
      channels = view.getUint16(p + 10, true);
      sampleRate = view.getUint32(p + 12, true);
      bitDepth = view.getUint16(p + 22, true);
    } else if (id === 'LIST' && tag(p + 8) === 'INFO') {
      let q = p + 12;
      while (q < p + 8 + size) {
        const sid = tag(q);
        const ssize = view.getUint32(q + 4, true);
        info[sid] = new TextDecoder().decode(bytes.subarray(q + 8, q + 8 + ssize)).replace(/\0+$/, '');
        q += 8 + ssize + (ssize % 2);
      }
    } else if (id === 'data') {
      dataBytes = size;
      break;
    }
    p += 8 + size + (size % 2);
  }
  return { sampleRate, channels, bitDepth, dataBytes, frames: dataBytes / (channels * (bitDepth / 8)), info };
}
