// Edits the trailer: speed ramps, eased camera zooms/pans, crossfade transitions and animated titles
// on the recorded footage; then a mix of the narrator, the Seedsong music bed with a soft beat that
// drops after a riser, whooshes on transitions and an end bell, normalised to −14 LUFS.
// Usage: node demo/trailer-mix.mjs <toolsDir> <workDir> <output.mp4>
//   workDir holds rec/ (frames + timeline.json), vo/ (vo_<id>.wav) and music.wav.

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [toolsDir, workDir, output] = process.argv.slice(2);
if (!output) throw new Error('usage: node demo/trailer-mix.mjs <toolsDir> <workDir> <output.mp4>');
const here = path.dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(fs.readFileSync(path.join(here, 'trailer.json'), 'utf8'));
const ffmpeg = path.join(toolsDir, 'node_modules/ffmpeg-static/ffmpeg.exe');
const rec = path.join(workDir, 'rec');
const tmp = path.join(workDir, 'work');
fs.mkdirSync(tmp, { recursive: true });
const tl = JSON.parse(fs.readFileSync(path.join(rec, 'timeline.json'), 'utf8'));
const FPS = 30;
const D = 0.45; // crossfade length
const ff = (args, label) => {
  console.log(`· ${label}`);
  execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'], maxBuffer: 1 << 26 });
};
const fwd = (p) => p.replace(/\\/g, '/');
const esc = (p) => fwd(p).replace(/:/g, '\\:');

// ── 1. raw frames → constant-rate intermediate
const t0 = tl.frames[0].t;
const master = path.join(tmp, 'master.mp4');
if (!fs.existsSync(master) || fs.statSync(master).mtimeMs < fs.statSync(path.join(rec, 'timeline.json')).mtimeMs) {
  const list = [];
  tl.frames.forEach((f, i) => {
    const next = tl.frames[i + 1];
    list.push(`file '${fwd(path.join(rec, 'frames', f.file))}'`, `duration ${Math.max(0.001, next ? next.t - f.t : 1 / FPS).toFixed(4)}`);
  });
  list.push(`file '${fwd(path.join(rec, 'frames', tl.frames.at(-1).file))}'`);
  fs.writeFileSync(path.join(tmp, 'frames.txt'), list.join('\n'));
  ff(['-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'frames.txt'), '-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-preset', 'fast', '-crf', '12', master], 'building master footage');
}

// ── 2. the edit: per-scene speed and camera move
// zoom z0→z1 while the focus point moves (fx0,fy0)→(fx1,fy1); eased in-out
const CAMERA = {
  hook: { z: [1.16, 1.0], f: [[0.5, 0.4], [0.5, 0.45]] },
  begin: { z: [1.0, 1.22], f: [[0.5, 0.6], [0.5, 0.52]] },
  map: { z: [1.32, 1.08], f: [[0.5, 0.32], [0.5, 0.45]] },
  lens: { z: [1.05, 1.5], f: [[0.4, 0.4], [0.13, 0.36]] },
  bloom: { z: [1.35, 1.0], f: [[0.45, 0.88], [0.5, 0.5]] },
  moods: { z: [1.0, 1.14], f: [[0.5, 0.55], [0.5, 0.5]] },
  shape: { z: [1.18, 1.0], f: [[0.72, 0.45], [0.5, 0.5]] },
  relax: { z: [1.22, 1.0], f: [[0.5, 0.42], [0.5, 0.5]] },
  keep: { z: [1.0, 1.28], f: [[0.5, 0.5], [0.5, 0.48]] },
  outro: { z: [1.07, 1.0], f: [[0.5, 0.45], [0.5, 0.5]] },
};
const TRANSITIONS = ['zoomin', 'smoothleft', 'fade', 'smoothup', 'smoothleft', 'fade', 'smoothright', 'fade', 'fadeblack'];

const scenes = plan.scenes.map((s, i) => {
  const r = tl.scenes.find((x) => x.id === s.id);
  if (!r) throw new Error(`no footage for ${s.id}`);
  const last = i === plan.scenes.length - 1;
  const L = s.len + (last ? 0 : D); // output length including the crossfade handle
  return { ...s, srcStart: r.start - t0, srcDur: L * s.speed, L };
});
// output start times
let acc = 0;
scenes.forEach((s, i) => {
  s.outStart = i === 0 ? 0 : acc - D;
  acc = i === 0 ? s.L : acc + s.L - D;
});
const total = acc;

const ease = (P) => `if(lt(${P},0.5),4*${P}*${P}*${P},1-pow(-2*${P}+2,3)/2)`;
const inputs = [];
const parts = [];
scenes.forEach((s, i) => {
  inputs.push('-ss', s.srcStart.toFixed(3), '-t', (s.srcDur + 0.2).toFixed(3), '-i', master);
  const cam = CAMERA[s.id];
  const N = Math.round(s.L * FPS);
  const P = `min(1,on/${Math.max(1, N - 1)})`;
  const E = ease(P);
  const z = `${cam.z[0]}+(${cam.z[1] - cam.z[0]})*${E}`;
  const fx = `(${cam.f[0][0]}+(${cam.f[1][0] - cam.f[0][0]})*${E})`;
  const fy = `(${cam.f[0][1]}+(${cam.f[1][1] - cam.f[0][1]})*${E})`;
  parts.push(
    `[${i}:v]setpts=(PTS-STARTPTS)/${s.speed},fps=${FPS},trim=duration=${s.L.toFixed(3)},setpts=PTS-STARTPTS,` +
      `scale=3840:2160:flags=lanczos,zoompan=z='${z}':x='max(0,min(iw-iw/zoom,${fx}*iw-iw/zoom/2))':y='max(0,min(ih-ih/zoom,${fy}*ih-ih/zoom/2))':d=1:s=1920x1080:fps=${FPS},` +
      `setsar=1,format=yuv420p,settb=AVTB[s${i}]`,
  );
});
let last = 's0';
for (let i = 1; i < scenes.length; i++) {
  const out = `x${i}`;
  parts.push(`[${last}][s${i}]xfade=transition=${TRANSITIONS[i - 1] ?? 'fade'}:duration=${D}:offset=${scenes[i].outStart.toFixed(3)}[${out}]`);
  last = out;
}
// animated titles: fade + small rise, in a soft dark pill
const font = esc('C:/Windows/Fonts/segoeuib.ttf');
let titled = last;
scenes.forEach((s, i) => {
  if (!s.title) return;
  const file = path.join(tmp, `title_${s.id}.txt`);
  fs.writeFileSync(file, s.title);
  const a = (s.outStart + (i === 0 ? 0.5 : 0.35)).toFixed(3);
  const b = (s.outStart + s.L - (i === scenes.length - 1 ? 0.2 : D + 0.2)).toFixed(3);
  const alpha = `if(lt(t,${a}),0,if(lt(t,${a}+0.35),(t-${a})/0.35,if(lt(t,${b}-0.3),1,if(lt(t,${b}),(${b}-t)/0.3,0))))`;
  const out = `t${i}`;
  parts.push(
    `[${titled}]drawtext=fontfile='${font}':textfile='${esc(file)}':fontsize=50:fontcolor=0xEEF1F8:box=1:boxcolor=0x0B1020@0.62:boxborderw=26:` +
      `x='(w-text_w)/2':y='118+20*(1-min(1,max(0,(t-${a})/0.4)))':alpha='${alpha}':enable='between(t,${a},${b})'[${out}]`,
  );
  titled = out;
});
parts.push(`[${titled}]fade=t=in:st=0:d=0.6,fade=t=out:st=${(total - 1.2).toFixed(3)}:d=1.2[vout]`);
fs.writeFileSync(path.join(tmp, 'video.filter'), parts.join(';\n'));
const video = path.join(tmp, 'video.mp4');
ff([...inputs, '-filter_complex_script', path.join(tmp, 'video.filter'), '-map', '[vout]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-tune', 'film', '-r', String(FPS), '-t', total.toFixed(3), video], 'editing video (zooms, ramps, transitions, titles)');

// ── 3. sound: VO, music bed with a soft beat, riser, boom, whooshes, end bell
const bpm = plan.bpm;
const beat = 60 / bpm;
const drop = scenes[1].outStart + D / 2;
const dropBeat = Math.ceil((drop - 0.02) / beat) * beat;
const outroStart = scenes.at(-1).outStart;
const beatEnd = Math.floor(outroStart / beat) * beat + beat * 0.5;
const ms = (x) => Math.round(x * 1000);
const audioIn = ['-i', path.join(workDir, 'music.wav')];
const voScenes = scenes.filter((s) => fs.existsSync(path.join(workDir, 'vo', `vo_${s.id}.wav`)));
voScenes.forEach((s) => audioIn.push('-i', path.join(workDir, 'vo', `vo_${s.id}.wav`)));
const A = [];
voScenes.forEach((s, i) => {
  const at = ms(s.outStart + (s.id === 'hook' ? 0.45 : 0.3));
  A.push(
    `[${i + 1}:a]aresample=48000,highpass=f=85,equalizer=f=220:t=q:w=1.2:g=-2,equalizer=f=3300:t=q:w=1.4:g=2.5,equalizer=f=9000:t=h:w=0.7:g=1.5,` +
      `acompressor=threshold=-21dB:ratio=3:attack=6:release=140:makeup=2.5,aecho=1:1:31|47:0.07|0.045,pan=stereo|c0=c0|c1=c0,adelay=${at}|${at}[v${i}]`,
  );
});
A.push(`${voScenes.map((_, i) => `[v${i}]`).join('')}amix=inputs=${voScenes.length}:normalize=0,apad=whole_dur=${total.toFixed(3)}[vo]`, '[vo]asplit=2[voice][vokey]');
const tt = total.toFixed(3);
// kick: a soft sine thump (pitch drops 115→42 Hz) on every beat between the drop and the outro
A.push(
  `aevalsrc='between(t,${dropBeat},${beatEnd})*0.7*sin(2*PI*(42*mod(t-${dropBeat},${beat})+(73/30)*(1-exp(-30*mod(t-${dropBeat},${beat})))))*exp(-7*mod(t-${dropBeat},${beat}))':s=48000:d=${tt},lowpass=f=180,pan=stereo|c0=c0|c1=c0,asplit=2[kick][kickkey]`,
);
// hats on the off-beats and a very light 16th shaker, both noise
A.push(
  `aevalsrc='between(t,${dropBeat + beat / 2},${beatEnd})*0.30*(2*random(0)-1)*exp(-55*mod(t-${dropBeat}-${beat / 2},${beat}))+between(t,${dropBeat + beat * 4},${beatEnd})*0.07*(2*random(1)-1)*exp(-90*mod(t-${dropBeat},${beat / 4}))':s=48000:d=${tt},highpass=f=7000,lowpass=f=13000,aecho=1:1:9:0.3,pan=stereo|c0=0.8*c0|c1=c0[hats]`,
);
// riser into the drop (noise swell + rising tone) and a low boom on it
const rs = (dropBeat - 1.9).toFixed(3);
A.push(
  `aevalsrc='between(t,${rs},${dropBeat})*(0.22*(2*random(2)-1)*pow((t-${rs})/1.9,2)+0.07*sin(2*PI*(260*(t-${rs})+(1300/3.8)*pow(t-${rs},2)))*pow((t-${rs})/1.9,2))+gte(t,${dropBeat})*0.9*sin(2*PI*(38*(t-${dropBeat})+(40/10)*(1-exp(-10*(t-${dropBeat})))))*exp(-3.2*(t-${dropBeat}))':s=48000:d=${tt},highpass=f=30,pan=stereo|c0=c0|c1=c0[fx1]`,
);
// whooshes on every later transition: a short band-passed noise swell
const whooshAt = scenes.slice(2).map((s) => s.outStart - 0.05);
whooshAt.forEach((w, i) => {
  A.push(
    `aevalsrc='0.5*(2*random(${10 + i})-1)*pow(sin(PI*min(1,t/0.6)),2)':s=48000:d=0.6,bandpass=f=${1600 + (i % 3) * 600}:width_type=o:w=1.6,highpass=f=400,pan=stereo|c0=${i % 2 ? 0.7 : 1}*c0|c1=${i % 2 ? 1 : 0.7}*c0,adelay=${ms(w)}|${ms(w)}[w${i}]`,
  );
});
// end bell as the end card appears
const bellAt = outroStart + 0.25;
A.push(
  `aevalsrc='0.22*sin(2*PI*587.33*t)*exp(-t*1.1)+0.07*sin(2*PI*587.33*2.76*t)*exp(-t*2.4)+0.04*sin(2*PI*587.33*5.4*t)*exp(-t*4)':s=48000:d=6,afade=t=in:d=0.004,aecho=0.9:0.6:180|260:0.35|0.25,pan=stereo|c0=c0|c1=c0,adelay=${ms(bellAt)}|${ms(bellAt)}[bell]`,
);
// the music: fades in under the hook, pumps gently with the kick, and settles under the outro
A.push(
  `[0:a]aresample=48000,atrim=duration=${tt},volume=0.56,afade=t=in:st=0:d=1.6,afade=t=out:st=${(total - 3.2).toFixed(3)}:d=3.2,apad=whole_dur=${tt}[bedraw]`,
  '[bedraw][kickkey]sidechaincompress=threshold=0.05:ratio=4:attack=4:release=170:knee=4[bed]',
  `[bed][kick][hats][fx1]${whooshAt.map((_, i) => `[w${i}]`).join('')}amix=inputs=${4 + whooshAt.length}:normalize=0[musicbus]`,
  '[musicbus][vokey]sidechaincompress=threshold=0.025:ratio=4.5:attack=50:release=450:knee=8[ducked]',
  `[ducked][voice][bell]amix=inputs=3:normalize=0,afade=t=out:st=${(total - 1.6).toFixed(3)}:d=1.6,atrim=duration=${tt}[mix]`,
);
fs.writeFileSync(path.join(tmp, 'audio.filter'), A.join(';\n'));
const premix = path.join(tmp, 'premix.wav');
ff([...audioIn, '-filter_complex_script', path.join(tmp, 'audio.filter'), '-map', '[mix]', '-c:a', 'pcm_s24le', premix], 'mixing sound');
const m = spawnSync(ffmpeg, ['-hide_banner', '-i', premix, '-af', 'loudnorm=I=-14:TP=-1.2:LRA=9:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const j = JSON.parse(m.slice(m.lastIndexOf('{'), m.lastIndexOf('}') + 1));
const finalWav = path.join(tmp, 'final.wav');
ff(['-i', premix, '-af', `loudnorm=I=-14:TP=-1.2:LRA=9:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,aresample=48000`, '-c:a', 'pcm_s16le', finalWav], 'normalising loudness');
ff(['-i', video, '-i', finalWav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', output], 'muxing');
const r = spawnSync(ffmpeg, ['-hide_banner', '-i', output, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
console.log(`done: ${output} (${(fs.statSync(output).size / 1e6).toFixed(1)} MB, ${total.toFixed(1)} s, drop at ${dropBeat.toFixed(2)} s)`);
console.log(r.slice(r.lastIndexOf('Summary:')).replace(/\s+/g, ' ').trim());
fs.writeFileSync(path.join(tmp, 'edit.json'), JSON.stringify({ total, drop: dropBeat, scenes: scenes.map((s) => ({ id: s.id, outStart: s.outStart, L: s.L })) }, null, 1));
