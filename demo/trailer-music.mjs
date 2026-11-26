// Renders the trailer's music bed with Seedsong itself: the same seed as the footage, in Dawn Mist,
// at the trailer tempo with a little more note density, through the real instrument rack (offline).
// Usage: node demo/trailer-music.mjs <outFile.wav> [seconds]

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const [outFile, secondsArg] = process.argv.slice(2);
if (!outFile) throw new Error('usage: node demo/trailer-music.mjs <outFile.wav> [seconds]');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const plan = JSON.parse(fs.readFileSync(path.join(here, 'trailer.json'), 'utf8'));
const seconds = Number(secondsArg ?? 70);

const PORT = 5183;
const server = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' });
process.on('exit', () => server.kill());
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(`http://localhost:${PORT}/`)).ok) break;
  } catch {
    /* starting */
  }
  await new Promise((r) => setTimeout(r, 500));
}
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();
await page.goto(`http://localhost:${PORT}/favicon.svg`);
const b64 = await page.evaluate(
  async ({ bpm, seconds }) => {
    const { grove } = await import('/src/core/worlds/grove.ts');
    const { composeScore } = await import('/src/core/music/compose.ts');
    const { renderScore } = await import('/src/export/offline.ts');
    const { encodeWav } = await import('/src/export/wav.ts');
    const trace = grove.generate({ ...grove.defaults, depth: 7 }, 'quiet-fern-12');
    const full = composeScore(trace, { moodId: 'dawn', mode: 'wander', bpm, density: 1.2 });
    // keep only what the trailer needs; the drone and pad chords are clipped to the window
    const score = {
      ...full,
      duration: seconds,
      tail: 4,
      notes: full.notes.filter((n) => n.time < seconds).map((n) => ({ ...n, duration: Math.min(n.duration, seconds + 3 - n.time) })),
      chords: full.chords.filter((c) => c.time < seconds).map((c) => ({ ...c, duration: Math.min(c.duration, seconds + 3 - c.time) })),
    };
    const buf = await renderScore(score, 'quiet-fern-12', { ambience: {}, withAmbience: false });
    const bytes = encodeWav({ sampleRate: buf.sampleRate, channels: [buf.getChannelData(0), buf.getChannelData(1)] }, { bitDepth: 24, normalizeDb: -1, fadeOut: 0 });
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  },
  { bpm: plan.bpm, seconds },
);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, Buffer.from(b64, 'base64'));
console.log(`music bed: ${outFile} (${seconds} s at ${plan.bpm} BPM)`);
await browser.close();
server.kill();
process.exit(0);
