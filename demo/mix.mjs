// Assembles the demo video: recorded frames → 1080p30 H.264, plus a mix of the processed
// voice-over, the app's own recorded music (ducked under the voice), a soft intro bed and an end bell.
// Usage: node demo/mix.mjs <toolsDir> <outDir> <output.mp4>

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [toolsDir, outDir, output] = process.argv.slice(2);
if (!output) throw new Error('usage: node demo/mix.mjs <toolsDir> <outDir> <output.mp4>');
const ffmpeg = path.join(toolsDir, 'node_modules/ffmpeg-static/ffmpeg.exe');
const rec = path.join(outDir, 'rec');
const vo = path.join(outDir, 'vo');
const work = path.join(outDir, 'work');
fs.mkdirSync(work, { recursive: true });
const tl = JSON.parse(fs.readFileSync(path.join(rec, 'timeline.json'), 'utf8'));
const t0 = tl.frames[0].t;
const total = tl.frames[tl.frames.length - 1].t - t0 + 1 / 30;
const run = (args, label) => {
  console.log(`· ${label}`);
  return execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });
};
const runCapture = (args) => spawnSync(ffmpeg, ['-hide_banner', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 }).stderr;

// ── 1. video: variable-rate screencast frames → constant 30 fps
const list = [];
tl.frames.forEach((f, i) => {
  const next = tl.frames[i + 1];
  const d = next ? next.t - f.t : 1 / 30;
  list.push(`file '${path.join(rec, 'frames', f.file).replace(/\\/g, '/')}'`, `duration ${Math.max(0.001, d).toFixed(4)}`);
});
list.push(`file '${path.join(rec, 'frames', tl.frames[tl.frames.length - 1].file).replace(/\\/g, '/')}'`);
fs.writeFileSync(path.join(work, 'frames.txt'), list.join('\n'));
const video = path.join(work, 'video.mp4');
const fresh = fs.existsSync(video) && fs.statSync(video).mtimeMs > fs.statSync(path.join(rec, 'timeline.json')).mtimeMs;
if (!fresh) run(
  [
    '-f', 'concat', '-safe', '0', '-i', path.join(work, 'frames.txt'),
    '-vf', `fps=30,scale=1920:1080:flags=lanczos,format=yuv420p,fade=t=in:st=0:d=1.2,fade=t=out:st=${(total - 2).toFixed(2)}:d=2`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'film', '-x264-params', 'aq-mode=3',
    '-t', total.toFixed(3), video,
  ],
  'encoding video',
);

// ── 2. audio
const musicAt = Math.max(0, tl.audioStart - t0);
const voScenes = tl.scenes.filter((s) => s.voStart);
const endCard = tl.scenes.find((s) => s.id === 'outro');
const bellAt = endCard ? endCard.start - t0 + 0.7 : total - 8;
const ms = (s) => Math.round(s * 1000);

const inputs = ['-i', path.join(rec, 'music.webm')];
voScenes.forEach((s) => inputs.push('-i', path.join(vo, `vo_${s.id}.wav`)));
const n = voScenes.length;

const voChain = voScenes
  .map(
    (s, i) =>
      `[${i + 1}:a]aresample=48000,highpass=f=85,equalizer=f=220:t=q:w=1.2:g=-2,equalizer=f=3300:t=q:w=1.4:g=2.5,equalizer=f=9000:t=h:w=0.7:g=1.5,` +
      `acompressor=threshold=-21dB:ratio=3:attack=6:release=140:makeup=2.5,aecho=1:1:31|47:0.07|0.045,pan=stereo|c0=c0|c1=c0,adelay=${ms(s.voStart - t0)}|${ms(s.voStart - t0)}[v${i}]`,
  )
  .join(';');

const filter = [
  voChain,
  `${voScenes.map((_, i) => `[v${i}]`).join('')}amix=inputs=${n}:normalize=0:dropout_transition=0,apad=whole_dur=${total.toFixed(3)}[vomix]`,
  '[vomix]asplit=2[voice][key]',
  // the app's music, starting when it really started on screen; a little quieter as a bed
  '[0:a]aresample=48000,asplit=2[m1][m2]',
  `[m1]volume=0.62,adelay=${ms(musicAt)}|${ms(musicAt)},apad=whole_dur=${total.toFixed(3)}[mus]`,
  // a soft intro bed under the landing screen: a later, settled stretch of the same piece, fading out as the real start fades in
  `[m2]atrim=start=40:duration=${(musicAt + 3).toFixed(2)},asetpts=PTS-STARTPTS,lowpass=f=2600,volume=0.42,afade=t=in:st=0:d=2.5,afade=t=out:st=${Math.max(1, musicAt - 1).toFixed(2)}:d=4[intro]`,
  // a soft bell (fundamental + inharmonic partial, long decay) as the end card appears
  `aevalsrc='0.20*sin(2*PI*739.99*t)*exp(-t*1.1)+0.07*sin(2*PI*739.99*2.76*t)*exp(-t*2.4)+0.04*sin(2*PI*739.99*5.4*t)*exp(-t*4)|0.20*sin(2*PI*739.99*t+0.3)*exp(-t*1.1)+0.07*sin(2*PI*739.99*2.76*t)*exp(-t*2.2)+0.04*sin(2*PI*739.99*5.4*t)*exp(-t*3.6)':s=48000:d=6,afade=t=in:d=0.004,aecho=0.9:0.6:180|260:0.35|0.25,adelay=${ms(bellAt)}|${ms(bellAt)}[bell]`,
  '[mus][intro]amix=inputs=2:normalize=0:dropout_transition=0[bed]',
  // duck the music under the narrator, smoothly
  '[bed][key]sidechaincompress=threshold=0.03:ratio=3.2:attack=90:release=800:knee=8[duckedraw]',
  '[duckedraw]asplit=2[ducked][duckdbg]',
  `[ducked][voice][bell]amix=inputs=3:normalize=0:dropout_transition=0,afade=t=out:st=${(total - 3.5).toFixed(2)}:d=3.5,atrim=duration=${total.toFixed(3)}[mix]`,
].join(';');

const premix = path.join(work, 'premix.wav');
run([...inputs, '-filter_complex', filter, '-map', '[mix]', '-c:a', 'pcm_s24le', '-ar', '48000', premix, '-map', '[duckdbg]', '-c:a', 'pcm_s16le', path.join(work, 'music-bed.wav')], 'mixing audio');

// two-pass loudness normalisation to −16 LUFS, −1.5 dBTP
const measure = runCapture(['-i', premix, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']);
const json = JSON.parse(measure.slice(measure.lastIndexOf('{'), measure.lastIndexOf('}') + 1));
const ln = `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${json.input_i}:measured_TP=${json.input_tp}:measured_LRA=${json.input_lra}:measured_thresh=${json.input_thresh}:offset=${json.target_offset}:linear=true`;
const finalAudio = path.join(work, 'final.wav');
run(['-i', premix, '-af', `${ln},aresample=48000`, '-c:a', 'pcm_s16le', finalAudio], 'normalising loudness');

// ── 3. mux
run(['-i', video, '-i', finalAudio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', output], 'muxing');
const after = runCapture(['-i', output, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
const summary = after.slice(after.lastIndexOf('Summary:'));
console.log(`done: ${output} (${(fs.statSync(output).size / 1e6).toFixed(1)} MB, ${total.toFixed(1)} s)`);
console.log(summary.replace(/\s+/g, ' ').trim());
