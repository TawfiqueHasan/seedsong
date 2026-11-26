// Records the Seedsong demo: drives the production build with Playwright, captures 1080p frames
// through the Chrome DevTools screencast, records the app's own audio output (tapped from the
// AudioContext destination), and logs when each voice-over line should start.
// Usage: node demo/record.mjs <toolsDir> <outDir>   (needs `npm run build` first)

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { installOverlay } from './overlay.mjs';

const [toolsDir, outDir] = process.argv.slice(2);
if (!toolsDir || !outDir) throw new Error('usage: node demo/record.mjs <toolsDir> <outDir>');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const script = JSON.parse(fs.readFileSync(path.join(here, 'script.json'), 'utf8'));
const ffprobe = path.join(toolsDir, 'node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe');
const voDir = path.join(outDir, 'vo');
const recDir = path.join(outDir, 'rec');
const framesDir = path.join(recDir, 'frames');
fs.rmSync(recDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

const voLength = (id) =>
  Number(execSync(`"${ffprobe}" -v error -show_entries format=duration -of csv=p=0 "${path.join(voDir, `vo_${id}.wav`)}"`, { encoding: 'utf8' }).trim());

const PORT = 4317;
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
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, acceptDownloads: false });
const page = await context.newPage();

// Audio tap: anything connected to the real speakers is also sent to a MediaStream we can record.
// Overlays: a visible cursor, key badges, titles and an end card, all in the browser's top layer.
await page.addInitScript(installOverlay);

// a fixed, pretty seed so the video is reproducible
await page.goto(`http://localhost:${PORT}/#w=grove&m=dawn&o=w&s=quiet-fern-12`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

// ── screencast
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

// ── helpers
let mouse = { x: 1500, y: 760 };
async function glide(x, y, ms = 700) {
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
async function click(locator, { dx = 0.5, dy = 0.5, ms = 800 } = {}) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`not visible: ${locator}`);
  await glide(box.x + box.width * dx, box.y + box.height * dy, ms);
  await page.waitForTimeout(150);
  await page.mouse.down();
  await page.waitForTimeout(70);
  await page.mouse.up();
}
async function key(k, label) {
  await page.evaluate(([k, label]) => window.__demo.key(k, label), [k.length === 1 ? k.toUpperCase() : k, label]);
  await page.keyboard.press(k);
}
const caption = (t) => page.evaluate((t) => window.__demo.caption(t), t);
const raise = () => page.evaluate(() => window.__demo.raise());
const wait = (s) => page.waitForTimeout(s * 1000);

// ── the scenes. Each runs its actions with `vo(seconds)` marking where its voice line starts.
const timeline = [];
let current = null;
async function scene(def, run) {
  const vo = voLength(def.id);
  current = { id: def.id, start: Date.now() / 1000, voStart: null, vo };
  timeline.push(current);
  const cue = async () => {
    current.voStart = Date.now() / 1000;
    if (def.caption) await caption(def.caption);
  };
  const t0 = Date.now();
  await run({ vo, cue, after: async (s) => wait(Math.max(0, s - (Date.now() - t0) / 1000)) });
  if (current.voStart === null) throw new Error(`scene ${def.id} never cued its voice line`);
  // let the line finish, then breathe
  const spoken = Date.now() / 1000 - current.voStart;
  await wait(Math.max(0, vo - spoken) + 1.1 + (def.hold ?? 0));
}
const S = Object.fromEntries(script.scenes.map((s) => [s.id, s]));

// the audio recorder starts before Begin so the very first drone is captured
await page.evaluate(() => {
  const ctx = window.__tapCtx;
  if (!ctx) throw new Error('no audio context tap');
  const rec = new MediaRecorder(ctx.__tap.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 320000 });
  window.__chunks = [];
  rec.ondataavailable = (e) => window.__chunks.push(e.data);
  rec.onstart = () => (window.__recStart = Date.now() / 1000);
  window.__rec = rec;
  rec.start(1000);
});

await scene(S.intro, async ({ cue }) => {
  await wait(1.2);
  await cue();
  await glide(1180, 640, 2600);
});

await scene(S.begin, async ({ cue }) => {
  await click(page.getByRole('button', { name: 'Begin' }), { ms: 900 });
  await wait(2.2);
  await glide(1640, 520, 1500);
  await cue();
});

await scene(S.lens, async ({ cue, after }) => {
  await click(page.getByRole('button', { name: /Recursion lens/ }));
  await wait(0.6);
  await cue();
  await after(4);
  await glide(260, 600, 1600);
});

await scene(S.bloom, async ({ cue, after, vo }) => {
  await key('l', 'close lens');
  await wait(0.8);
  await cue();
  await after(vo * 0.45);
  await click(page.getByRole('radio', { name: /Bloom/ }), { ms: 900 });
});

await scene(S.moods, async ({ cue, after }) => {
  await cue();
  await after(1.6);
  await click(page.getByRole('radio', { name: 'Deep Ocean' }));
  await after(7.2);
  await click(page.getByRole('radio', { name: 'Night Forest' }));
});

await scene(S.shape, async ({ cue, after }) => {
  await click(page.getByRole('radio', { name: /Wander/ }), { ms: 700 });
  await wait(0.5);
  await click(page.getByRole('button', { name: 'Shape your garden' }));
  await wait(0.6);
  await cue();
  const spread = page.getByRole('slider', { name: 'Spread' });
  const wind = page.getByRole('slider', { name: 'Wind' });
  await after(3.4);
  await click(spread, { dx: 0.62 });
  await after(6.2);
  await click(wind, { dx: 0.45 });
});

await scene(S.lsystem, async ({ cue }) => {
  await click(page.getByRole('radio', { name: /L-System Garden/ }));
  await wait(0.4);
  await cue();
  await wait(5.5);
  await key('Escape', 'close');
  await glide(1500, 700, 1200);
});

await scene(S.relax, async ({ cue, after }) => {
  await click(page.getByRole('button', { name: 'Shape your garden' }));
  await wait(0.4);
  await click(page.getByRole('tab', { name: 'Atmosphere' }));
  await cue();
  await after(2.4);
  await click(page.getByRole('tab', { name: 'Session' }));
  await after(3.4);
  await click(page.getByRole('switch', { name: /Breathing companion/ }));
  await after(5.6);
  await key('Escape', 'close');
  await wait(0.3);
  await glide(1700, 900, 900);
  await page.evaluate(() => window.__demo.cursorVisible(false));
  await key('z', 'zen mode');
  await wait(7.5);
  await key('Escape', 'controls back');
  await page.evaluate(() => window.__demo.cursorVisible(true));
});

await scene(S.keep, async ({ cue, after }) => {
  await key('e', 'keep this song');
  await wait(0.5);
  await raise();
  await cue();
  await after(3.2);
  await click(page.getByRole('button', { name: 'Download WAV' }));
  await after(9);
  await glide(1260, 330, 1400);
});

await scene(S.outro, async ({ cue }) => {
  await key('Escape', 'close');
  await caption('');
  await wait(0.6);
  await page.evaluate(() => {
    window.__demo.cursorVisible(false);
    window.__demo.end(`<div><h1>Seedsong</h1><p class="tag">Plant a seed. Watch recursion grow. Listen to it bloom.</p>
      <p class="links">tawfiquehasan.github.io/seedsong<br>github.com/TawfiqueHasan/seedsong</p>
      <p class="foot">Hub's Quest · Epoch 1 · Recursive Soundscapes</p></div>`);
  });
  await wait(1.6);
  await cue();
});

// ── stop and save
await cdp.send('Page.stopScreencast');
const audio = await page.evaluate(async () => {
  await new Promise((r) => {
    window.__rec.onstop = r;
    window.__rec.stop();
  });
  const blob = new Blob(window.__chunks, { type: 'audio/webm' });
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { b64: btoa(s), start: window.__recStart };
});
fs.writeFileSync(path.join(recDir, 'music.webm'), Buffer.from(audio.b64, 'base64'));
await new Promise((r) => setTimeout(r, 800)); // let the last frame writes land
fs.writeFileSync(path.join(recDir, 'timeline.json'), JSON.stringify({ frames, audioStart: audio.start, scenes: timeline, end: Date.now() / 1000 }, null, 1));
const dur = frames.length ? frames[frames.length - 1].t - frames[0].t : 0;
console.log(`frames: ${frames.length} over ${dur.toFixed(1)} s (${(frames.length / Math.max(dur, 1)).toFixed(1)} fps); audio ${(audio.b64.length * 0.75 / 1e6).toFixed(1)} MB`);
await browser.close();
server.kill();
process.exit(0);
