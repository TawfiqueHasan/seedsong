// The composer: RecursionTrace → Score. Pure and deterministic.
//
// Fractal form (SPEC §5.3): the call tree IS the musical form.
//   trunk (depth 0)        → the key: root + fifth drone for the whole piece, a low opening note
//   boughs (depth 1)       → sections; each one shifts the melody's register
//   depth 2                → phrases; each phrase gets one chord from the mood's progression
//   inner branches         → the melody (lead), stepping through scale degrees
//   twigs (maxDepth − 1)   → ornaments: quieter, higher
//   leaves (base case)     → bells: chord tones in the upper octave, long ring
//   return from a phrase   → cadence: one beat of rest while the pad re-swells
//   return from the root   → final cadence on the tonic, then a long tail

import { clamp, createRng, lerp, type Rng } from '../random';
import type { RecursionTrace, TraceNode } from '../worlds/types';
import { getMood, type Mood, type MoodId } from './moods';
import type { Mode, NodeTiming, Score, ScoreChord, ScoreEvent, ScoreNote, Voice } from './score';
import { chordPcs, degreeToMidi, mod, nearestChordTone, SCALES, voiceLead, type Chord } from './theory';

export interface MusicParams {
  moodId: MoodId;
  mode: Mode;
  /** tempo in BPM; undefined = the mood's tempo (auto-adjusted for very long or short trees) */
  bpm?: number;
  /** transpose the key, in semitones (−5..+6) */
  transpose?: number;
  /** multiplier on the mood's note-density cap (0.5..1.2) */
  density?: number;
  /** longest piece in seconds before deep levels are thinned */
  maxDuration?: number;
  /** shortest piece in seconds before the tempo slows down (auto tempo only) */
  minDuration?: number;
}

export const TAIL_SECONDS = 10;
const LEAD_LO = 60;
const LEAD_HI = 84;

type Role = 'trunk' | 'section' | 'phrase' | 'lead' | 'twig' | 'leaf';

interface Ctx {
  trace: RecursionTrace;
  mood: Mood;
  keyPc: number;
  scale: number[];
  leadBase: number;
  rng: Rng;
  phraseDepth: number;
}

export function roleOf(node: TraceNode, maxDepth: number, phraseDepth: number): Role {
  if (node.depth === 0) return 'trunk';
  if (phraseDepth === 2 && node.depth === 1) return 'section';
  if (node.depth === phraseDepth) return 'phrase';
  if (node.isLeaf) return 'leaf';
  if (maxDepth >= 4 && node.depth >= maxDepth - 1) return 'twig';
  return 'lead';
}

/** chord pitch classes usable for long notes (Lydian's raised 4th is kept for short passing notes only) */
function hPcs(ctx: Ctx, chord: Chord): number[] {
  const pcs = chordPcs(chord, ctx.keyPc);
  if (ctx.mood.avoidPc === undefined) return pcs;
  const avoid = mod(ctx.keyPc + ctx.mood.avoidPc, 12);
  const safe = pcs.filter((pc) => pc !== avoid);
  return safe.length ? safe : pcs;
}

const quantise = (beats: number) => Math.round(clamp(beats, 0.5, 2) * 2) / 2;
const leadBeats = (node: TraceNode) => quantise(lerp(0.5, 2, Math.sqrt(clamp(node.size, 0, 1))));
const melodicStep = (node: TraceNode) => clamp(Math.round(node.turn * 1.5 + 0.5), -2, 3);

/** velocity envelope over the piece: rise over the first 25%, hold to 70%, ease to 0.75 */
function form(x: number): number {
  if (x < 0.25) return lerp(0.7, 1, x / 0.25);
  if (x < 0.7) return 1;
  return lerp(1, 0.75, (x - 0.7) / 0.3);
}

export function composeScore(trace: RecursionTrace, music: MusicParams): Score {
  const mood = getMood(music.moodId);
  const keyPc = mod(mood.keyPc + (music.transpose ?? 0), 12);
  const scale = SCALES[mood.scale];
  const ctx: Ctx = {
    trace,
    mood,
    keyPc,
    scale,
    leadBase: 60 + keyPc,
    rng: createRng(`compose:${trace.seed}:${music.moodId}:${music.mode}`),
    phraseDepth: trace.maxDepth >= 4 ? 2 : 1,
  };
  const result = music.mode === 'bloom' ? composeBloom(ctx, music) : composeWander(ctx, music);
  return finalize(ctx, music, result);
}

interface Draft {
  bpm: number;
  notes: ScoreNote[];
  chords: ScoreChord[];
  events: ScoreEvent[];
  nodeTimes: NodeTiming[];
  duration: number;
  thinned: number;
}

// ───────────────────────────── Wander (depth-first) ─────────────────────────────

function composeWander(ctx: Ctx, music: MusicParams): Draft {
  const { trace, mood } = ctx;
  const nodes = trace.nodes;
  const D = trace.maxDepth;
  const roles = nodes.map((n) => roleOf(n, D, ctx.phraseDepth));

  // Pass 1: how many beats each node advances the cursor when it sounds.
  const advance = nodes.map((n, i) => {
    switch (roles[i]) {
      case 'trunk':
        return 4;
      case 'section':
        return 2;
      case 'phrase':
        return 3; // 2-beat phrase head + 1 beat of cadence rest on return
      case 'lead':
        return leadBeats(n);
      default:
        return 0.5;
    }
  });
  const FINAL_BEATS = 8;
  let totalBeats = advance.reduce((a, b) => a + b, 0) + FINAL_BEATS;

  // Fit the piece into the target length: tempo first, then thin the deepest levels.
  const maxDur = music.maxDuration ?? 300;
  const minDur = music.minDuration ?? 90;
  let bpm = music.bpm ?? mood.bpm;
  if (music.bpm === undefined) {
    const sec = (totalBeats * 60) / bpm;
    if (sec > maxDur) bpm = Math.min(bpm * 1.15, mood.bpmRange[1]);
    else if (sec < minDur) bpm = Math.max(mood.bpmRange[0], (totalBeats * 60) / minDur);
  }
  const targetBeats = (maxDur * bpm) / 60;
  const keep = Array.from({ length: nodes.length }, () => true);
  let thinned = 0;
  if (totalBeats > targetBeats) {
    // groups in thinning order: leaves, twigs, then lead levels from the deepest up
    const leadDepths = [...new Set(nodes.filter((_, i) => roles[i] === 'lead').map((n) => n.depth))].sort((a, b) => b - a);
    const groups: Array<{ ids: number[]; floor: number }> = [
      { ids: nodes.filter((_, i) => roles[i] === 'leaf').map((n) => n.id), floor: 0.15 },
      { ids: nodes.filter((_, i) => roles[i] === 'twig').map((n) => n.id), floor: 0.12 },
      ...leadDepths.map((d) => ({ ids: nodes.filter((n, i) => roles[i] === 'lead' && n.depth === d).map((n) => n.id), floor: 0.25 })),
    ];
    for (const g of groups) {
      if (totalBeats <= targetBeats || g.ids.length === 0) continue;
      const groupBeats = g.ids.reduce((a, id) => a + advance[id], 0);
      const ratio = clamp(1 - (totalBeats - targetBeats) / groupBeats, g.floor, 1);
      // Bresenham selection: evenly spread, deterministic
      let acc = 0.5;
      for (const id of g.ids) {
        acc += ratio;
        if (acc >= 1) acc -= 1;
        else {
          keep[id] = false;
          totalBeats -= advance[id];
          thinned++;
        }
      }
    }
  }

  const beat = 60 / bpm;
  const estTotal = totalBeats * beat;
  const notes: ScoreNote[] = [];
  const chords: ScoreChord[] = [];
  const events: ScoreEvent[] = [];
  const nodeTimes: NodeTiming[] = nodes.map(() => ({ start: 0, grow: beat, sounding: false }));
  const deg = Array.from({ length: nodes.length }, () => 0);
  const rng = ctx.rng.fork('wander');

  let cursor = 0; // beats
  let chord: Chord = mood.tonic;
  let pcs = hPcs(ctx, chord);
  let voicing: number[] | null = null;
  let phraseCount = 0;
  let sectionCount = 0;
  let lastLead = ctx.leadBase + 7;
  let lastBell = -1;
  let repeat = 0;

  const panOf = (n: TraceNode) => {
    const b = trace.bounds;
    const cx = (b.minX + b.maxX) / 2;
    const half = Math.max(1, (b.maxX - b.minX) / 2);
    const x = n.points.length ? n.points[n.points.length - 2] : cx;
    return clamp(((x - cx) / half) * 0.7, -0.7, 0.7);
  };
  const vel = (depth: number, tSec: number, scale = 1) =>
    clamp(0.62 * Math.pow(0.92, depth) * form(tSec / Math.max(estTotal, 1)) * (1 + rng.jitter(0.08)) * scale, 0.12, 0.85);

  const fitRange = (d: number): number => {
    const n = ctx.scale.length;
    let m = degreeToMidi(d, ctx.scale, ctx.leadBase);
    while (m > LEAD_HI) {
      d -= n;
      m = degreeToMidi(d, ctx.scale, ctx.leadBase);
    }
    while (m < LEAD_LO) {
      d += n;
      m = degreeToMidi(d, ctx.scale, ctx.leadBase);
    }
    return d;
  };

  const addNote = (voice: Voice, node: TraceNode, timeBeats: number, durBeats: number, midi: number, velocity: number, humanise: number) => {
    const time = Math.max(0, timeBeats * beat + rng.jitter(humanise));
    notes.push({ time, duration: durBeats * beat, midi, velocity, pan: panOf(node), voice, nodeId: node.id, depth: node.depth });
  };

  /** choose the lead pitch for a node: scale degree walk, chord-tone snap, range, no long repeats */
  const leadPitch = (node: TraceNode, snap: boolean, durBeats: number): number => {
    const strong = mod(cursor, 2) < 0.01;
    let d = deg[node.id];
    let midi = degreeToMidi(d, ctx.scale, ctx.leadBase);
    if (snap || strong) midi = nearestChordTone(midi, pcs, ctx.scale, ctx.leadBase);
    if (ctx.mood.avoidPc !== undefined && mod(midi - ctx.keyPc, 12) === ctx.mood.avoidPc && (strong || durBeats > 1)) {
      midi = nearestChordTone(midi, pcs, ctx.scale, ctx.leadBase);
    }
    if (midi === lastLead) {
      repeat++;
      if (repeat >= 3) {
        d += rng.chance(0.5) ? 1 : -1;
        d = fitRange(d);
        midi = degreeToMidi(d, ctx.scale, ctx.leadBase);
        repeat = 0;
      }
    } else repeat = 0;
    lastLead = midi;
    return midi;
  };

  let phraseStart = 0;
  for (const ev of trace.events) {
    const node = nodes[ev.nodeId];
    const role = roles[node.id];
    const tSec = cursor * beat;

    if (ev.kind === 'call') {
      events.push({ time: tSec, kind: 'call', nodeId: node.id, depth: node.depth });
      // the melodic degree is inherited from the parent and stepped by the branch's turn
      if (node.parentId !== null) {
        let d = deg[node.parentId] + melodicStep(node);
        if (rng.chance(((trace.params.randomness ?? 0.25) as number) * 0.5)) d += rng.chance(0.5) ? 1 : -1;
        if (role === 'section') d += [0, 2, -1, 3, 1][sectionCount % 5];
        deg[node.id] = fitRange(d);
      } else deg[node.id] = fitRange(2);

      if (!keep[node.id]) {
        nodeTimes[node.id] = { start: tSec, grow: beat * 0.75, sounding: false };
        continue;
      }
      switch (role) {
        case 'trunk': {
          nodeTimes[node.id] = { start: 0, grow: 4 * beat, sounding: true };
          addNote('bass', node, 0, 6, ctx.keyPc + 36 + 12 * (ctx.keyPc < 4 ? 1 : 0), 0.42, 0);
          cursor += 4;
          break;
        }
        case 'section': {
          sectionCount++;
          events.push({ time: tSec, kind: 'section', nodeId: node.id, depth: node.depth });
          nodeTimes[node.id] = { start: tSec, grow: 2 * beat, sounding: true };
          addNote('lead', node, cursor, 2, leadPitch(node, true, 2), vel(node.depth, tSec, 0.85), 0.01);
          cursor += 2;
          break;
        }
        case 'phrase': {
          chord = ctx.mood.progression[phraseCount % ctx.mood.progression.length];
          phraseCount++;
          pcs = hPcs(ctx, chord);
          voicing = voiceLead(chord, ctx.keyPc, voicing);
          phraseStart = tSec;
          chords.push({ time: tSec, duration: 8 * beat, midis: voicing, symbol: chord.symbol });
          const root = mod(ctx.keyPc + chord.tones[0], 12);
          addNote('bass', node, cursor, 4, 36 + root + (root < 4 ? 12 : 0), 0.38, 0);
          nodeTimes[node.id] = { start: tSec, grow: 2 * beat, sounding: true };
          addNote('lead', node, cursor, 2.2, leadPitch(node, true, 2), vel(node.depth, tSec), 0.01);
          cursor += 2;
          break;
        }
        case 'lead': {
          const b = leadBeats(node);
          nodeTimes[node.id] = { start: tSec, grow: b * beat, sounding: true };
          addNote('lead', node, cursor, b * 1.15, leadPitch(node, false, b), vel(node.depth, tSec), 0.012);
          cursor += b;
          break;
        }
        case 'twig': {
          const d = deg[node.id] + 2;
          let m = degreeToMidi(d, ctx.scale, ctx.leadBase);
          if (m > 88) m -= 12;
          nodeTimes[node.id] = { start: tSec, grow: 0.5 * beat, sounding: true };
          addNote('ornament', node, cursor, 1, m, vel(node.depth, tSec, 0.7), 0.015);
          cursor += 0.5;
          break;
        }
        case 'leaf': {
          // each leaf rings the chord tone nearest its own branch's degree, an octave up
          let m = nearestChordTone(degreeToMidi(deg[node.id], ctx.scale, ctx.leadBase) + 12, pcs, ctx.scale, ctx.leadBase);
          if (m === lastBell) m = nearestChordTone(m + (node.childIndex % 2 === 0 ? -3 : 3), pcs, ctx.scale, ctx.leadBase);
          while (m > 88) m -= 12;
          while (m < 72) m += 12;
          lastBell = m;
          nodeTimes[node.id] = { start: tSec, grow: 0.5 * beat, sounding: true };
          addNote('bell', node, cursor, 4, m, vel(node.depth, tSec, 0.9), 0.02);
          cursor += 0.5;
          break;
        }
      }
    } else {
      events.push({ time: tSec, kind: 'return', nodeId: node.id, depth: node.depth });
      if (role === 'phrase' && keep[node.id]) {
        events.push({ time: tSec, kind: 'cadence', nodeId: node.id, depth: node.depth });
        cursor += 1; // the phrase breathes
        const last = chords[chords.length - 1];
        if (last) last.duration = Math.max(last.duration, cursor * beat - phraseStart + 1.5 * beat);
      }
      if (role === 'trunk') {
        // final cadence: home chord, a last bell, the drone keeps ringing into the tail
        const tonicVoicing = voiceLead(mood.tonic, ctx.keyPc, voicing);
        chords.push({ time: tSec, duration: FINAL_BEATS * beat + 4, midis: tonicVoicing, symbol: mood.tonic.symbol });
        events.push({ time: tSec, kind: 'cadence', nodeId: node.id, depth: 0 });
        addNote('bass', node, cursor, FINAL_BEATS, ctx.keyPc + 36 + (ctx.keyPc < 4 ? 12 : 0), 0.4, 0);
        addNote('bell', node, cursor + 1, 6, nearestChordTone(ctx.leadBase + 12, hPcs(ctx, mood.tonic), ctx.scale, ctx.leadBase), 0.4, 0);
        cursor += FINAL_BEATS;
      }
    }
  }

  // let each pad chord sustain until the next one begins, with a short overlap
  for (let i = 0; i < chords.length - 1; i++) {
    const gap = chords[i + 1].time - chords[i].time;
    chords[i].duration = Math.max(chords[i].duration, gap + beat);
  }

  return { bpm, notes, chords, events, nodeTimes, duration: cursor * beat, thinned };
}

// ───────────────────────────── Bloom (breadth-first) ─────────────────────────────

function composeBloom(ctx: Ctx, music: MusicParams): Draft {
  const { trace, mood } = ctx;
  const nodes = trace.nodes;
  const D = trace.maxDepth;
  const bpm = music.bpm ?? mood.bpm;
  const beat = 60 / bpm;
  const rng = ctx.rng.fork('bloom');
  const levels: TraceNode[][] = Array.from({ length: D + 1 }, () => []);
  for (const n of nodes) levels[n.depth].push(n);
  const endX = (n: TraceNode) => (n.points.length ? n.points[n.points.length - 2] : 0);
  for (const l of levels) l.sort((a, b) => endX(a) - endX(b));

  const phraseLevels = Math.max(1, D - 1);
  const beatsPerLevel = clamp(Math.round(((150 / beat) / phraseLevels) / 4) * 4, 8, 16);

  const notes: ScoreNote[] = [];
  const chords: ScoreChord[] = [];
  const events: ScoreEvent[] = [];
  const nodeTimes: NodeTiming[] = nodes.map(() => ({ start: 0, grow: beat, sounding: false }));
  const b = trace.bounds;
  const cx = (b.minX + b.maxX) / 2;
  const half = Math.max(1, (b.maxX - b.minX) / 2);
  const pan = (n: TraceNode) => clamp(((endX(n) - cx) / half) * 0.7, -0.7, 0.7);
  const push = (voice: Voice, n: TraceNode, tBeats: number, durBeats: number, midi: number, velocity: number, h = 0) =>
    notes.push({ time: Math.max(0, tBeats * beat + rng.jitter(h)), duration: durBeats * beat, midi, velocity, pan: pan(n), voice, nodeId: n.id, depth: n.depth });

  let cursor = 0;
  let voicing: number[] | null = null;
  // level 0: the trunk and the drone
  const trunk = levels[0][0];
  nodeTimes[trunk.id] = { start: 0, grow: 4 * beat, sounding: true };
  events.push({ time: 0, kind: 'call', nodeId: trunk.id, depth: 0 });
  push('bass', trunk, 0, 6, ctx.keyPc + 36 + (ctx.keyPc < 4 ? 12 : 0), 0.42);
  cursor = 4;

  const estTotal = (4 + 4 + beatsPerLevel * phraseLevels + 8) * beat;
  for (let d = 1; d <= D; d++) {
    const level = levels[d];
    if (level.length === 0) continue;
    const isFirst = d === 1;
    const span = isFirst ? 4 : beatsPerLevel;
    const chord = isFirst ? mood.tonic : mood.progression[(d - 2) % mood.progression.length];
    voicing = voiceLead(chord, ctx.keyPc, voicing);
    const pcs = hPcs(ctx, chord);
    chords.push({ time: cursor * beat, duration: (span + 1) * beat, midis: voicing, symbol: chord.symbol });
    events.push({ time: cursor * beat, kind: 'section', nodeId: level[0].id, depth: d });
    const root = mod(ctx.keyPc + chord.tones[0], 12);
    push('bass', level[0], cursor, Math.min(span, 8), 36 + root + (root < 4 ? 12 : 0), 0.36);

    // chord tones in a register that rises one step per level
    const lo = clamp(ctx.leadBase - 3 + (d - 1) * 2, 55, 74);
    const tones: number[] = [];
    for (let m = lo; m <= lo + 17; m++) if (pcs.includes(mod(m, 12)) && SCALES[mood.scale].some((s) => mod(ctx.keyPc + s, 12) === mod(m, 12))) tones.push(m);
    if (tones.length === 0) tones.push(nearestChordTone(lo + 7, pcs, ctx.scale, ctx.leadBase));

    const m = level.length;
    const soundCount = Math.min(12, m);
    const soundEvery = m / soundCount;
    let nextSound = 0;
    let soundIdx = 0;
    const isLeafLevel = d === D;
    const voice: Voice = isLeafLevel && D >= 2 ? 'bell' : 'lead';
    level.forEach((n, i) => {
      const slot = cursor + (i / m) * span + (m > 1 ? rng.jitter(0.15) : 0);
      const t = Math.max(cursor, slot);
      events.push({ time: t * beat, kind: 'call', nodeId: n.id, depth: d });
      const sounding = i >= nextSound - 1e-9;
      nodeTimes[n.id] = { start: t * beat, grow: Math.max(0.5, span / m) * beat * 1.5, sounding };
      if (sounding) {
        nextSound += soundEvery;
        const k = soundCount === 1 ? Math.floor(tones.length / 2) : Math.round((soundIdx / (soundCount - 1)) * (tones.length - 1));
        let midi = tones[k];
        if (voice === 'bell') while (midi < 72) midi += 12;
        const durB = voice === 'bell' ? 4 : clamp((span / soundCount) * 1.5, 1, 3);
        const v = clamp(0.62 * Math.pow(0.92, d) * form((t * beat) / estTotal) * (1 + rng.jitter(0.08)), 0.12, 0.85);
        push(voice, n, t, durB, midi, voice === 'bell' ? v * 0.9 : v, voice === 'bell' ? 0.02 : 0.012);
        soundIdx++;
      }
    });
    cursor += span;
    events.push({ time: cursor * beat, kind: 'cadence', nodeId: level[level.length - 1].id, depth: d });
  }

  const tonicVoicing = voiceLead(mood.tonic, ctx.keyPc, voicing);
  chords.push({ time: cursor * beat, duration: 8 * beat + 4, midis: tonicVoicing, symbol: mood.tonic.symbol });
  push('bass', trunk, cursor, 8, ctx.keyPc + 36 + (ctx.keyPc < 4 ? 12 : 0), 0.4);
  push('bell', trunk, cursor + 1, 6, nearestChordTone(ctx.leadBase + 12, hPcs(ctx, mood.tonic), ctx.scale, ctx.leadBase), 0.4);
  events.push({ time: cursor * beat, kind: 'return', nodeId: trunk.id, depth: 0 });
  cursor += 8;

  for (let i = 0; i < chords.length - 1; i++) {
    const gap = chords[i + 1].time - chords[i].time;
    chords[i].duration = Math.max(chords[i].duration, gap + beat);
  }
  return { bpm, notes, chords, events, nodeTimes, duration: cursor * beat, thinned: 0 };
}

// ───────────────────────────── shared finishing ─────────────────────────────

function finalize(ctx: Ctx, music: MusicParams, d: Draft): Score {
  const cap = ctx.mood.maxNotesPerSecond * (music.density ?? 1);
  const { kept, dropped } = applyDensityCap(d.notes, cap);
  // the drone holds the key for the whole piece and fades into the tail
  const droneRoot = 36 + ctx.keyPc + (ctx.keyPc < 2 ? 12 : 0);
  const trunkId = ctx.trace.nodes[0]?.id ?? 0;
  const droneDur = d.duration + TAIL_SECONDS * 0.6;
  kept.push({ time: 0, duration: droneDur, midi: droneRoot, velocity: 0.5, pan: -0.15, voice: 'drone', nodeId: trunkId, depth: 0 });
  kept.push({ time: 0, duration: droneDur, midi: droneRoot + 7, velocity: 0.42, pan: 0.15, voice: 'drone', nodeId: trunkId, depth: 0 });
  kept.sort((a, b) => a.time - b.time || a.midi - b.midi);
  d.events.sort((a, b) => a.time - b.time);
  for (const n of kept) {
    n.time = round(n.time);
    n.duration = round(Math.max(0.05, n.duration));
  }
  // mark nodes whose note was dropped by the density cap as silent (they still grow)
  const soundingIds = new Set(kept.map((n) => n.nodeId));
  for (let i = 0; i < d.nodeTimes.length; i++) if (d.nodeTimes[i].sounding && !soundingIds.has(i)) d.nodeTimes[i].sounding = false;

  return {
    version: 1,
    seed: ctx.trace.seed,
    worldId: ctx.trace.worldId,
    moodId: ctx.mood.id,
    mode: music.mode,
    bpm: Math.round(d.bpm * 10) / 10,
    key: `${['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'][ctx.keyPc]}`,
    scale: ctx.mood.scale,
    duration: round(d.duration),
    tail: TAIL_SECONDS,
    notes: kept,
    chords: d.chords,
    events: d.events,
    nodeTimes: d.nodeTimes,
    stats: { noteCount: kept.length, nodeCount: ctx.trace.nodes.length, maxDepth: ctx.trace.maxDepth, droppedForDensity: dropped, thinned: d.thinned },
  };
}

const round = (x: number) => Math.round(x * 1000) / 1000;
const ATTACK_VOICES: Voice[] = ['lead', 'bell', 'ornament'];

/**
 * Keep at most `cap` attacked notes (lead, bell, ornament) in any 1-second window.
 * Accept in priority order — lead, then bells, then ornaments — so the lowest-priority
 * notes are the ones dropped. Drone, pad and bass are never dropped.
 */
export function applyDensityCap(notes: ScoreNote[], cap: number): { kept: ScoreNote[]; dropped: number } {
  const limit = Math.max(1, Math.floor(cap));
  const accepted: number[] = []; // sorted times of accepted attack notes
  const kept: ScoreNote[] = notes.filter((n) => !ATTACK_VOICES.includes(n.voice));
  let dropped = 0;
  for (const voice of ATTACK_VOICES) {
    const cands = notes.filter((n) => n.voice === voice).sort((a, b) => a.time - b.time);
    for (const n of cands) {
      if (fits(accepted, n.time, limit)) {
        insertSorted(accepted, n.time);
        kept.push(n);
      } else dropped++;
    }
  }
  return { kept, dropped };
}

function fits(sorted: number[], t: number, limit: number): boolean {
  // every 1 s window that would contain t must hold fewer than `limit` accepted notes;
  // the worst window starts at t or at an accepted note in (t − 1, t]
  const lo = lowerBound(sorted, t - 1 + 1e-9);
  const starts = [t];
  for (let i = lo; i < sorted.length && sorted[i] <= t; i++) starts.push(sorted[i]);
  for (const s of starts) {
    const a = lowerBound(sorted, s);
    const b = lowerBound(sorted, s + 1 - 1e-9);
    if (b - a + 1 > limit) return false;
  }
  return true;
}

function lowerBound(xs: number[], v: number): number {
  let lo = 0;
  let hi = xs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] < v) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function insertSorted(xs: number[], v: number) {
  xs.splice(lowerBound(xs, v), 0, v);
}
