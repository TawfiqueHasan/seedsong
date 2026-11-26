// Voice-over with Kokoro-82M (Apache-2.0), an open-source neural TTS that runs locally.
// Usage: node demo/tts.mjs <toolsDir> <outDir>
//   toolsDir: folder where kokoro-js is installed; outDir: where vo_<id>.wav files go.
//   SCRIPT=trailer.json picks another narration file.

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [toolsDir, outDir] = process.argv.slice(2);
if (!toolsDir || !outDir) throw new Error('usage: node demo/tts.mjs <toolsDir> <outDir>');
const here = path.dirname(fileURLToPath(import.meta.url));
const script = JSON.parse(fs.readFileSync(path.join(here, process.env.SCRIPT || 'script.json'), 'utf8'));
const require = createRequire(path.join(toolsDir, 'package.json'));
const { KokoroTTS } = await import(pathToFileURL(require.resolve('kokoro-js')).href);

fs.mkdirSync(outDir, { recursive: true });
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'fp32', device: 'cpu' });
const only = process.env.ONLY;
for (const scene of script.scenes) {
  if (only && scene.id !== only) continue;
  const t0 = Date.now();
  const audio = await tts.generate(scene.text, { voice: process.env.VOICE || script.voice, speed: script.speed });
  const file = path.join(outDir, `vo_${scene.id}.wav`);
  await audio.save(file);
  console.log(`${scene.id}: ${(audio.audio.length / audio.sampling_rate).toFixed(1)} s (${Date.now() - t0} ms)`);
}
