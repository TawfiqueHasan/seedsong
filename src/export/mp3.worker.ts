// MP3 encoding off the main thread (lamejs, LGPL-3.0; see CREDITS.md).
import { Mp3Encoder } from '@breezystack/lamejs';

interface Job {
  sampleRate: number;
  left: Float32Array;
  right: Float32Array;
  kbps: number;
}

const toInt16 = (f: Float32Array) => {
  const out = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) {
    const s = Math.max(-1, Math.min(1, f[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
};

self.onmessage = (e: MessageEvent<Job>) => {
  const { sampleRate, left, right, kbps } = e.data;
  const enc = new Mp3Encoder(2, sampleRate, kbps);
  const l = toInt16(left);
  const r = toInt16(right);
  const block = 1152 * 20;
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < l.length; i += block) {
    const out = enc.encodeBuffer(l.subarray(i, i + block), r.subarray(i, i + block));
    if (out.length) chunks.push(new Uint8Array(out));
    if ((i / block) % 20 === 0) self.postMessage({ progress: i / l.length });
  }
  const tail = enc.flush();
  if (tail.length) chunks.push(new Uint8Array(tail));
  const blob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
  self.postMessage({ done: true, blob });
};
