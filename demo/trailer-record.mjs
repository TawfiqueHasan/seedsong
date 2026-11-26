// Records raw footage for the short trailer. Each scene runs long enough for its planned
// output length × playback speed (fast scenes are sped up in the edit), plus a crossfade handle.
// Usage: node demo/trailer-record.mjs <toolsDir> <outDir>   (needs `npm run build` first)

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { installOverlay } from './overlay.mjs';

const [toolsDir, outDir] = process.argv.slice(2);
if (!toolsDir || !outDir) throw new Error('usage: node demo/trailer-record.mjs <toolsDir> <outDir>');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const plan = JSON.parse(fs.readFileSync(path.join(here, 'trailer.json'), 'utf8'));
const HANDLE = 0.5; // output seconds of overlap for crossfades
const recDir = path.join(outDir, 'rec');
const framesDir = path.join(recDir, 'frames');
fs.rmSync(recDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

const PORT = 4318;
const server = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' });
process.on('exit', () => server.kill());
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(`http://localhost:${PORT}/`)).ok) break;
  } catch {
    /* starting */
  }
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch({
  channel: 'msedge',
  headless: !process.env.HEADED,
  args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--hide-scrollbars'],
});
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await context.newPage();
await page.addInitScript(installOverlay);
await page.goto(`http://localhost:${PORT}/#w=grove&m=dawn&o=w&s=quiet-fern-12`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

const cdp = await context.newCDPSession(page);
const frames = [];
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const file = `f${String(frames.length).padStart(6, '0')}.jpg`;
  frames.push({ file, t: metadata.timestamp });
  fs.writeFile(path.join(framesDir, file), Buffer.from(data, 'base64'), () => undefined);
  try {
    await cdp.send('Page.screencastFrameAck', { sessionId });
  } catch {
    /* closing */
  }
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
await page.waitForTimeout(400);

let mouse = { x: 1500, y: 760 };
async function glide(x, y, ms = 500) {
  const steps = Math.max(8, Math.round(ms / 16));
  const from = { ...mouse };
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
    await page.waitForTimeout(ms / steps);
  }
  mouse = { x, y };
}
async function click(locator, { dx = 0.5, dy = 0.5, ms = 550 } = {}) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`not visible: ${locator}`);
  await glide(box.x + box.width * dx, box.y + box.height * dy, ms);
  await page.waitForTimeout(90);
  await page.mouse.down();
  await page.waitForTimeout(60);
  await page.mouse.up();
}
async function key(k, label) {
  await page.evaluate(([k, label]) => window.__demo.key(k, label), [k.length === 1 ? k.toUpperCase() : k, label]);
  await page.keyboard.press(k);
}
const wait = (s) => page.waitForTimeout(s * 1000);

const timeline = [];
const S = Object.fromEntries(plan.scenes.map((s) => [s.id, s]));
/** run a scene's actions, then hold until its raw duration (output length × speed + handle) is reached */
async function scene(id, run) {
  const def = S[id];
  const start = Date.now() / 1000;
  await run({ at: async (outSec) => wait(Math.max(0, start + outSec * def.speed - Date.now() / 1000)) });
  const raw = (def.len + HANDLE) * def.speed;
  await wait(Math.max(0, start + raw - Date.now() / 1000));
  timeline.push({ id, start, end: Date.now() / 1000 });
}

await scene('hook', async () => {
  await glide(1150, 640, 2800);
});
await scene('begin', async () => {
  await click(page.getByRole('button', { name: 'Begin' }), { ms: 400 });
  await glide(1700, 760, 1200);
});
await scene('map', async () => {
  await glide(1760, 860, 1500);
});
await scene('lens', async ({ at }) => {
  await click(page.getByRole('button', { name: /Recursion lens/ }), { ms: 450 });
  await at(1.6);
  await glide(300, 560, 900);
});
await scene('bloom', async ({ at }) => {
  await key('l', 'close lens');
  await at(1.4);
  await click(page.getByRole('radio', { name: /Bloom/ }), { ms: 600 });
});
await scene('moods', async () => {
  await click(page.getByRole('radio', { name: 'Deep Ocean' }), { ms: 450 });
  await glide(1500, 620, 900);
});
await scene('shape', async ({ at }) => {
  await click(page.getByRole('button', { name: 'Shape your garden' }), { ms: 450 });
  await wait(0.4);
  await click(page.getByRole('radio', { name: /L-System Garden/ }), { ms: 450 });
  await at(1.4);
  await click(page.getByRole('slider', { name: 'Generations' }), { dx: 0.98, ms: 450 });
});
await scene('relax', async ({ at }) => {
  await click(page.getByRole('tab', { name: 'Session' }), { ms: 450 });
  await click(page.getByRole('switch', { name: /Breathing companion/ }), { ms: 450 });
  await at(2.1);
  await key('Escape', 'close');
  await page.evaluate(() => window.__demo.cursorVisible(false));
  await key('z', 'zen mode');
});
await scene('keep', async ({ at }) => {
  await key('Escape', 'controls back');
  await page.evaluate(() => window.__demo.cursorVisible(true));
  await at(0.5);
  await key('e', 'keep this song');
  await wait(0.4);
  await page.evaluate(() => window.__demo.raise());
  await click(page.getByRole('button', { name: 'Download WAV' }), { ms: 550 });
});
await scene('outro', async () => {
  await key('Escape', 'close');
  await page.evaluate(() => {
    window.__demo.cursorVisible(false);
    window.__demo.end(`<div><h1>Seedsong</h1><p class="tag">Plant a seed. Watch recursion grow. Listen to it bloom.</p>
      <p class="links">tawfiquehasan.github.io/seedsong<br>github.com/TawfiqueHasan/seedsong</p>
      <p class="foot">Hub's Quest · Epoch 1 · Recursive Soundscapes</p></div>`);
  });
});

await cdp.send('Page.stopScreencast');
await new Promise((r) => setTimeout(r, 800));
fs.writeFileSync(path.join(recDir, 'timeline.json'), JSON.stringify({ frames, scenes: timeline, handle: HANDLE }, null, 1));
const dur = frames.length ? frames[frames.length - 1].t - frames[0].t : 0;
console.log(`frames: ${frames.length} over ${dur.toFixed(1)} s (${(frames.length / Math.max(dur, 1)).toFixed(1)} fps)`);
await browser.close();
server.kill();
process.exit(0);
