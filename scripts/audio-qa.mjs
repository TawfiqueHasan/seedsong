#!/usr/bin/env node
// Audio QA: renders one reference seed per mood (and both walk modes) offline in a headless browser
// with the real instrument rack, then checks the raw mix: no clipping, loudness in range, no long
// silences before the outro, no NaN or DC offset. Prints a table; exits non-zero on failure.
//
// Usage: npm run audio:qa            (uses Microsoft Edge locally; set E2E_BROWSER=chromium in CI)

import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const PORT = 5179;
const MOODS = process.env.QA_MOODS ? process.env.QA_MOODS.split(',') : ['dawn', 'rain', 'ocean', 'forest', 'temple'];
const SEED = 'still-lake-07';

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => server.kill();
process.on('exit', stop);

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('dev server did not start');
}

await waitForServer();
const browser = await chromium.launch({
  headless: process.env.QA_HEADED ? false : true,
  channel: process.env.E2E_BROWSER === 'chromium' ? undefined : 'msedge',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
// a blank same-origin page: modules load from the dev server without the live app running
await page.goto(`http://localhost:${PORT}/favicon.svg`);

const rows = [];
let failed = false;
for (const mood of MOODS) {
  for (const mode of ['wander', 'bloom']) {
    const r = await page.evaluate(
      async ({ mood, mode, seed }) => {
        const { grove } = await import('/src/core/worlds/grove.ts');
        const { composeScore } = await import('/src/core/music/compose.ts');
        const { getMood } = await import('/src/core/music/moods.ts');
        const { renderScore } = await import('/src/export/offline.ts');
        const trace = grove.generate({ ...grove.defaults, depth: 6 }, seed);
        const score = composeScore(trace, { moodId: mood, mode });
        const t0 = performance.now();
        const buf = await renderScore(score, seed, { ambience: getMood(mood).ambience, withAmbience: true });
        const ms = performance.now() - t0;
        const L = buf.getChannelData(0);
        const R = buf.getChannelData(1);
        const sr = buf.sampleRate;
        let peak = 0;
        let sum = 0;
        let dc = 0;
        let nan = 0;
        for (let i = 0; i < L.length; i++) {
          const a = L[i];
          const b = R[i];
          if (!Number.isFinite(a) || !Number.isFinite(b)) nan++;
          peak = Math.max(peak, Math.abs(a), Math.abs(b));
          sum += a * a + b * b;
          dc += a + b;
        }
        // longest run of 100 ms windows below −50 dBFS, before the outro (last tail seconds)
        const win = Math.floor(sr * 0.1);
        const outro = Math.floor((score.duration + 2) * sr);
        let run = 0;
        let longest = 0;
        for (let i = 0; i + win < Math.min(L.length, outro); i += win) {
          let s = 0;
          for (let j = i; j < i + win; j++) s += L[j] * L[j] + R[j] * R[j];
          const db = 10 * Math.log10(s / (2 * win) + 1e-20);
          run = db < -50 ? run + 0.1 : 0;
          longest = Math.max(longest, run);
        }
        const rms = Math.sqrt(sum / (2 * L.length));
        return {
          seconds: buf.duration,
          renderMs: ms,
          peakDb: 20 * Math.log10(peak + 1e-20),
          rmsDb: 20 * Math.log10(rms + 1e-20),
          dc: Math.abs(dc / (2 * L.length)),
          nan,
          silence: longest,
          notes: score.stats.noteCount,
        };
      },
      { mood, mode, seed: SEED },
    );
    const problems = [];
    if (r.nan > 0) problems.push('NaN samples');
    if (r.peakDb > 0) problems.push('clipping');
    if (r.rmsDb < -30 || r.rmsDb > -12) problems.push('loudness out of range');
    if (r.silence > 4) problems.push(`silence ${r.silence.toFixed(1)} s`);
    if (r.dc > 0.01) problems.push('DC offset');
    if (problems.length) failed = true;
    rows.push({
      mood,
      mode,
      length: `${r.seconds.toFixed(0)} s`,
      notes: r.notes,
      'peak dBFS': r.peakDb.toFixed(1),
      'RMS dBFS': r.rmsDb.toFixed(1),
      'after −1 dB normalise': (r.rmsDb + (-1 - r.peakDb)).toFixed(1),
      'longest gap': `${r.silence.toFixed(1)} s`,
      render: `${(r.renderMs / 1000).toFixed(1)} s`,
      result: problems.length ? `FAIL: ${problems.join(', ')}` : 'ok',
    });
  }
}
await browser.close();
stop();
console.table(rows);
console.log(failed ? 'Audio QA failed.' : 'Audio QA passed: no clipping, steady loudness, no long silences.');
process.exit(failed ? 1 : 0);
