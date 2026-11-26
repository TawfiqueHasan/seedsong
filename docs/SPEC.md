# Seedsong: Product and Technical Specification

Version 1.0 · 25 Nov 2026 · Hub's Quest Epoch 1 "Recursive Soundscapes"

> Make recursion audible. Make simulation beautiful. Make the experience relaxing. (from the brief)

---

## §0 Vision and principles

Seedsong turns one recursive function into a garden you listen to. The user plants a seed (a set of recursion parameters), watches a luminous fractal tree grow, and hears the call tree become a calm piece of music. When it finishes they keep the song.

Principles, in priority order:

1. **Calm before clever.** Every feature must lower stress. If something can startle, it is wrong.
2. **Beautiful by default.** The first click, with zero configuration, must sound and look finished.
3. **The structure is the music.** Musical form comes from the shape of the recursion, not from decoration on top of it.
4. **Show the mathematics.** Anyone can see which call is playing and why it sounds the way it does.
5. **One source of truth.** Trace → Score → (audio, export, MIDI, visuals). Nothing drifts out of sync.

## §1 Experience

### §1.1 The first minute (what judges see first)

1. **Landing.** Deep night gradient, slow drifting motes, the title *Seedsong* in Fraunces, and one seed glyph pulsing at breathing pace (10 s cycle, about 6 breaths a minute). A line reads "Best with headphones". One primary button: **Begin**. The click unlocks audio, which browsers require anyway.
2. **0–8 s.** A warm drone fades in over 6 s. The trunk grows upward with a low note.
3. **8–60 s.** Boughs split into harmony, branches carry the melody, twigs sparkle, and leaves open as glowing blossoms with bell tones. The recursion lens shows the current call.
4. **End.** The recursion unwinds, the music resolves to the home chord, the tree sways gently, and the **Keep this song** button glows softly.

### §1.2 Core loop

Choose a mood → shape the seed → grow and listen → keep (export, share link, save to garden). Moods are one-tap presets; parameters are for exploring.

### §1.3 Personas

- **The tired student** wants ten calm minutes. Uses a mood, zen mode and the sleep timer. Never opens the parameter drawer.
- **The curious coder** wants to see recursion. Opens the recursion lens and code view, toggles Wander/Bloom, changes depth.
- **The musician** wants material. Exports WAV and MIDI and shares seeds.

## §2 Rubric mapping

| Criterion (weight) | Features that earn it |
| --- | --- |
| Relaxation & UX (35%) | first-minute ritual, moods, crossfades, ambience mixer, breathing companion, sleep timer, zen mode, calm copy, mobile layout, no harsh peaks |
| Musical quality (25%) | scale lock, fractal form with chord progression and cadences, voice-leading, five designed moods, mix chain, density cap, audio QA |
| Creative recursion (15%) | fractal-form mapping, recursion lens, code view, depth skyline, Wander vs Bloom, extra worlds (L-system, Hanoi) |
| Visual design (10%) | design tokens, bioluminescent rendering, growth synced to notes, particles, palettes per mood |
| Interaction & usability (10%) | plain-language controls, presets, keyboard shortcuts, share links, garden, onboarding, help |
| Technical execution (5%) | pure tested core, single rack for live and offline, CI/CD, deployed demo, export tests, performance budgets |

## §3 Scope (MoSCoW)

**Must (ship by 04:00 for skeleton, all verified by 15:00):**

- M1 Fractal Grove world with configurable depth, branching, spread, length ratio, randomness, asymmetry, seed (§4.1)
- M2 Composer with fractal form, Wander mode, scale lock, cadences, density cap (§5)
- M3 Live audio engine: five moods, pad/lead/bell/drone voices, reverb/delay, master limiter, procedural ambience (§6)
- M4 Canvas visualizer with growth synced to notes, glow, particles, sway, reduced motion (§7)
- M5 Transport: play, pause, stop, seek, volume, regenerate with crossfade (§8)
- M6 Export: offline-rendered WAV (16-bit) with progress, plus MIDI (§9)
- M7 Landing ritual, moods, control drawer, mobile layout, keyboard access, WCAG 2.2 AA basics (§8)
- M8 Deployed on GitHub Pages, README, AI logs complete (§12)

**Should (after all Musts):**

- S1 Bloom (breadth-first) mode + Wander/Bloom toggle (§5.5)
- S2 Recursion lens + code view + depth skyline (§8.3)
- S3 MP3 export, cover art PNG, live session recording (§9)
- S4 Ambience mixer, breathing companion, sleep timer, zen mode (§8.2)
- S5 Share links + local garden (§8.2)
- S6 World 2: L-System Garden (§4.2)
- S7 Audio QA script + axe e2e + CI (§11)

**Could (only if ahead of schedule at 15:00):**

- C1 World 3: Hanoi Music Box (§4.3)
- C2 Sampled instruments from VSCO 2 CE (CC0) for the lead voice (§6.4)
- C3 Endless "Drift" mode: after a piece ends, plant the next tree a fifth higher and crossfade (§5.8)
- C4 PWA install + offline, Media Session lock-screen controls
- C5 Video export (canvas + audio via MediaRecorder)
- C6 Bangla UI language toggle

**Won't (this time):** accounts, backend, database, social feed, AI-generated music, payments.

---

## §4 Recursion worlds

### §4.0 Shared model

```ts
type WorldId = 'grove' | 'lsystem' | 'hanoi';

interface ParamSpec {
  key: string; label: string; help: string;        // help = one plain-language sentence
  min: number; max: number; step: number; default: number; unit?: string;
  format?: (v: number) => string;                   // value text for aria-valuetext
}

interface TraceNode {
  id: number; parentId: number | null;
  depth: number; childIndex: number; siblingCount: number; isLeaf: boolean;
  params: Record<string, number>;                   // e.g. { length, angle }
  geom: { x1: number; y1: number; x2: number; y2: number; width: number };
  order: { call: number; ret: number };             // DFS indices of call and return events
}

interface RecursionTrace {
  worldId: WorldId; seed: string; params: Record<string, number | string>;
  nodes: TraceNode[];                               // in call order
  events: Array<{ kind: 'call' | 'return'; nodeId: number }>;
  maxDepth: number; truncated: boolean;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

interface WorldDefinition<P> {
  id: WorldId; name: string; tagline: string;
  params: ParamSpec[]; defaults: P;
  generate(params: P, rng: Rng): RecursionTrace;   // pure
  codeSnippet: string;                              // shown in code view, 10–14 lines
  lineFor(event: 'call' | 'base' | 'return'): number; // line to highlight in code view
}
```

Randomness: `cyrb128(seedString)` → `sfc32` PRNG. Seeds are human-friendly words (`still-lake-07`), generated from a small calm word list.

### §4.1 World 1: Fractal Grove (hero, Must)

```ts
function branch(x, y, angle, length, depth) {
  emitCall(node)                                    // a note begins
  if (depth < maxDepth && length > minLength) {     // recursive case
    for (let i = 0; i < branching; i++) {
      const offset = branching === 1 ? 0 : spread * (2 * i / (branching - 1) - 1)
      const jitter = (rng() - 0.5) * 2 * randomness * spread * 0.6
      const lean   = asymmetry * spread * 0.5
      const next   = length * ratio * (1 + (rng() - 0.5) * randomness * 0.4)
      branch(x2, y2, angle + offset + jitter + lean, next, depth + 1)
    }
  }                                                 // base case: a leaf (bell)
  emitReturn(node)                                  // the phrase resolves
}
```

| Param | Range | Default | Help text |
| --- | --- | --- | --- |
| depth | 1–10 (clamped by branching) | 7 | How many times each branch splits. Deeper trees make longer songs. |
| branching | 2–4 | 2 | How many new branches grow from each tip. More branches, richer harmony. |
| spread | 5–60° | 24° | How wide the branches open. Wider trees sound more spacious. |
| ratio | 0.55–0.82 | 0.72 | How much shorter each branch is than its parent. Shorter branches make quicker notes. |
| randomness | 0–1 | 0.25 | How much the wind bends each branch. Adds gentle variation. |
| asymmetry | -1–1 | 0 | Leans the tree left or right. Shifts the melody up or down. |
| seed | text | random words | Same seed, same song. Share it with a friend. |

Depth clamp so the full tree fits a 2,047-node budget: branching 2 → max depth 10; 3 → 6; 4 → 5. The depth slider max follows the branching value. Never truncate a tree halfway (lopsided trees sound broken).

### §4.2 World 2: L-System Garden (Should)

- Recursive expansion, not string replacement: `expand(symbol, depth)` returns the symbol when `depth === 0` or no rule exists; otherwise it calls `expand` for every symbol in the rule. The expand call stack is the recursion trace (call depth = rewrite depth).
- Turtle: `F` draws a segment (one node), `+`/`-` rotate, `[` pushes state (a branch begins), `]` pops (the branch returns).
- Presets (axiom, rules, angle, iterations): Fern `X` · `X→F+[[X]-X]-F[-FX]+X`, `F→FF` · 25° · 5; Bush `F` · `F→FF+[+F-F-F]-[-F+F+F]` · 22.5° · 4; Koch snowflake `F++F++F` · `F→F-F++F-F` · 60° · 4; Dragon `FX` · `X→X+YF+`, `Y→-FX-Y` · 90° · 10; Sierpinski arrowhead `A` · `A→B-A-B`, `B→A+B+A` · 60° · 6; Hilbert `A` · `A→+BF-AFA-FB+`, `B→-AF+BFB+FA-` · 90° · 5.
- Rule editor: validate symbols, balanced brackets, and a 4,000-segment cap (the iteration slider max adapts per preset).

### §4.3 World 3: Hanoi Music Box (Could)

- `hanoi(n, from, to, via)`: if `n === 0` return; `hanoi(n-1, from, via, to)`; `move(n, from, to)`; `hanoi(n-1, via, to, from)`.
- Discs 3–8 (default 5 → 31 moves). Discs glide on arcs (700 ms, ease-in-out); a soft ripple on landing.
- The smallest disc moves every other step, so its notes form a natural ostinato. The move sequence is a fractal rhythm (the ruler sequence).

### §4.4 Making recursion visible (Should)

- Recursion lens: live call stack as indented frames, e.g. `branch(depth 3, len 0.37, θ 102°)`, plus counters (calls, current depth, max depth).
- Code view: the world's `codeSnippet` with the executing line highlighted. Call → note, base case → bell, return → resolution.
- Depth skyline: a stepped silhouette of call depth over time under the transport bar, with playhead and click/keyboard seek.

---

## §5 Composer (trace → score)

### §5.1 Score model

```ts
type Voice = 'drone' | 'pad' | 'lead' | 'ornament' | 'bell' | 'bass';
interface ScoreNote  { id: string; time: number; duration: number; midi: number; velocity: number; pan: number; voice: Voice; nodeId: number; depth: number }
interface ScoreChord { time: number; duration: number; midis: number[]; symbol: string }
interface ScoreEvent { time: number; kind: 'call' | 'return' | 'cadence' | 'section'; nodeId: number; depth: number }
interface Score {
  version: 1; seed: string; worldId: WorldId; moodId: MoodId; mode: 'wander' | 'bloom';
  bpm: number; key: string; scale: ScaleId; duration: number; tail: number;   // seconds
  notes: ScoreNote[]; chords: ScoreChord[]; events: ScoreEvent[];
  stats: { noteCount: number; nodeCount: number; maxDepth: number };
}
```

Times are in seconds from 0. Velocity is 0–1. Pan is -1 to 1. The composer is pure and deterministic.

### §5.2 Scales (semitones from the root)

majorPentatonic `[0,2,4,7,9]` · minorPentatonic `[0,3,5,7,10]` · yo `[0,2,5,7,9]` · lydian `[0,2,4,6,7,9,11]` · dorian `[0,2,3,5,7,9,10]` · aeolian `[0,2,3,5,7,8,10]` · ionian `[0,2,4,5,7,9,11]`.
Melody arithmetic happens in scale degrees (an index into the scale across octaves), so every note is in the scale by construction.

### §5.3 Fractal form (the core idea)

| Recursion level | Musical role | Voice |
| --- | --- | --- |
| Trunk (depth 0) | the key; a root + fifth drone for the whole piece | drone |
| Boughs (depth 1) | sections A, B (C, D) of the piece | section events, pad colour |
| Depth 2 | phrases; each depth-2 subtree is one phrase with one chord from the mood's progression (cycled) | pad |
| Depth 3 to maxDepth-2 | the melody | lead |
| Twigs (maxDepth-1) | ornaments: quieter, higher, thinned by density | ornament |
| Leaves (base case) | bells: chord tones, upper octave, long ring | bell |
| Return from a depth-2 call | cadence: soft pad re-swell + one beat of rest | pad |
| Return from the root | final cadence to the tonic + 8–12 s tail | pad, drone |

For shallow trees (maxDepth ≤ 3) the melody starts at depth 1. The last phrase always ends on the tonic chord.

### §5.4 Wander (depth-first, default)

- Walk the trace events in order. A `call` at depth ≥ 3 emits a lead note; twigs emit ornaments; leaves emit bells.
- Beat = 60 / bpm seconds. Lead duration in beats = quantise(lerp(0.5, 2, sqrt(length / trunkLength))) to {0.5, 1, 1.5, 2}. Ornaments 0.5 beat. Bells ring 4 beats but advance the cursor only 0.5 beat.
- Pitch: degree(child) = degree(parent) + step. For branching 2, left child +0 and right child +2 (a gentle climb toward the leaves); for 3–4 children, steps spread across -1…+2. Branch jitter adds ±1 degree with probability = randomness × 0.5 (seeded).
- At a phrase start, snap to the nearest chord tone. On strong beats (1 and 3 of 4/4), move non-chord tones to the nearest chord tone.
- Lead range MIDI 60–84 (reflect at the edges). Never repeat one pitch more than 3 times in a row.
- Bells: the chord tone nearest to lead + 12, clamped to MIDI 72–96.

### §5.5 Bloom (breadth-first, Should)

- Level 0 starts the drone; level 1 swells the first chord; each level d ≥ 2 becomes a 2-bar phrase.
- Nodes in a level are sorted by x (left → right, like a harp sweep) and spread across the phrase with seeded offsets of ±0.15 beat.
- Pitches come from the current chord; register rises one step per level. The chord progression advances once per level.
- Cap 12 notes per phrase. Pick a seeded, evenly spaced subset when a level is larger. End with a return to the tonic.

### §5.6 Dynamics, density, humanisation, length

- Velocity = clamp(0.62 × 0.92^depth × form(t) × (1 ± 0.08 seeded), 0.12, 0.85). `form(t)` rises 0.7 → 1.0 over the first 25% of the piece, holds to 70%, and falls to 0.75 at the end.
- Density cap: at most `mood.maxNotesPerSecond` (default 3.5) in any 1 s window. Drop lowest priority first: ornaments, then bells, then lead (never drone or pad).
- Humanise onsets ±12 ms (lead), ±20 ms (bells). Never below 0.
- Target length 90 s–6 min. If longer, raise tempo up to +15% then thin the deepest level. If shorter, slow down to the mood's minimum tempo.

### §5.7 Mappings for other worlds

- L-System: each `F` is a note; `+`/`-` move one scale degree up/down; `[` saves pitch and starts a quieter harmony voice one register up; `]` restores the saved pitch (melodic return). Bracket depth lowers velocity by 8% per level. Rewrite depth chooses the voice (shallow = lead, deep = ornament).
- Hanoi: disc n → degree (N − n) (larger discs lower); peg → pan (-0.6, 0, 0.6) and voice (pluck, lead, bell); one move per beat; call depth → velocity.

### §5.8 Endless Drift (Could)

After a piece ends, generate the next seed, modulate to the key a fifth up (circle of fifths), and crossfade over 8 s.

---

## §6 Sound design

### §6.1 Moods

| Mood | Root, scale | BPM | Progression (pad) | Lead | Ambience |
| --- | --- | --- | --- | --- | --- |
| Dawn Mist | D, majorPentatonic (harmony from D major) | 60 | Dadd9 – Bm7 – Gmaj7 – Asus4 → D | soft FM electric piano | birds + breeze |
| Rain Garden | A, minorPentatonic (harmony from A aeolian) | 56 | Am(add9) – Fmaj7 – C – G → Am | FM kalimba pluck | rain |
| Deep Ocean | C, lydian | 50 | Cmaj7 – D/C – Em7 – Cmaj7(#11) | sparse glass bells + pad swells | ocean waves |
| Night Forest | F♯, minorPentatonic | 54 | F♯m – D – A – Esus2 → F♯m | harp-like Karplus–Strong pluck | crickets + stream |
| Temple | D, yo | 48 | open fifths and fourths over a D drone (no functional progression) | koto-like pluck | wind + distant chimes |

In Deep Ocean the F♯ (Lydian 4th) may only appear as a short note on a weak beat.

### §6.2 Voices (Tone.js v15 starting patches; tune by ear)

- **Pad:** `PolySynth(Synth, { oscillator: { type: 'fattriangle', count: 3, spread: 18 }, envelope: { attack: 2.5, decay: 1, sustain: 0.8, release: 6 } })` → `Filter(1200, 'lowpass', -24)` with a 0.05 Hz LFO (700–1600 Hz) → `Chorus(0.3, 3.5, 0.4).start()`. -18 dB.
- **Electric piano lead:** `PolySynth(FMSynth, { harmonicity: 3, modulationIndex: 2.5, envelope: { attack: 0.01, decay: 1.6, sustain: 0.15, release: 2.4 }, modulationEnvelope: { attack: 0.01, decay: 0.6, sustain: 0.1, release: 1.2 } })`. -14 dB.
- **Kalimba:** `PolySynth(FMSynth, { harmonicity: 8, modulationIndex: 2, envelope: { attack: 0.001, decay: 0.9, sustain: 0, release: 1.2 } })`. -15 dB.
- **Pluck (harp/koto):** `PluckSynth({ attackNoise: 0.6, dampening: 3000, resonance: 0.92 })` (Karplus–Strong: a feedback delay line, a recursion in sound). -12 dB.
- **Bells:** `PolySynth(FMSynth, { harmonicity: 5.07, modulationIndex: 9, envelope: { attack: 0.002, decay: 3.5, sustain: 0, release: 3 } })` → `Filter(400, 'highpass')`. -22 dB, heavy reverb send.
- **Drone:** two detuned sines (root, fifth) with a 6 s attack and slow amplitude LFO (0.07 Hz, depth 0.15). -24 dB.
- **Bass (optional):** `MonoSynth` sine, attack 1.2 s, release 4 s, on chord roots. -20 dB.
- Set `maxPolyphony` to 16 per PolySynth.

### §6.3 Effects and master

- Sends: `Reverb({ decay: 9, preDelay: 0.04 })` (await `ready`), `FeedbackDelay('4n.', 0.3)` at wet 0.2 on lead and bells.
- Master: `EQ3({ low: 0, mid: -1, high: -3 })` → `Compressor({ threshold: -20, ratio: 2.5, attack: 0.03, release: 0.3 })` → `Limiter(-1)` → destination.
- Targets: peak ≤ -1 dBFS, integrated loudness about -18 to -16 LUFS, warm spectrum (gentle high-shelf cut).
- Optional mono switch (`Tone.Mono`) for single-sided hearing.

### §6.4 Ambience

Procedural layers first (no files, no licences, work offline):
- Rain: pink noise → band 400–3,500 Hz, -28 dB, plus random droplet blips (short filtered noise, seeded timing).
- Ocean: brown noise → `AutoFilter(0.08 Hz, base 200 Hz, 3 octaves)` + slow tremolo (12 s waves). -24 dB.
- Wind: pink noise → slow-sweeping band-pass. -30 dB.
- Stream: white noise → band-pass 1.5–3 kHz with fast random modulation. -32 dB.
- Crickets: quiet high FM chirps at seeded random intervals. -34 dB.
- Fire: brown noise + random crackles. -30 dB.

Optional recorded loops (Should, if time): 2–4 seamless loops from pixabay.com (free, no attribution required; credit them anyway in CREDITS.md), 64–96 kbps OGG/MP3, 30–60 s, in `public/audio/ambience/`. Optional sampled lead: VSCO 2 Community Edition or VCSL (both CC0), a few notes per instrument, used with `Tone.Sampler`.

### §6.5 UI sounds

Off by default. When on: a soft sine blip quantised to the current scale and the next 8th note, -30 dB, on primary actions only.

---

## §7 Visual design

### §7.1 Tokens ("Nocturne Garden")

- Background: `--bg-0 #0B1020` (ink navy), `--bg-1 #121A33`, mood horizon glow as a radial gradient. Never pure black.
- Text: `--text-1 #EEF1F8`, `--text-2 #AAB3C8` (9:1 on bg-0). Body 16 px, line-height 1.5.
- Glass surfaces: `rgba(12,17,34,0.62)` + `backdrop-filter: blur(16px)` + 1 px border `rgba(255,255,255,0.10)`, radius 16 px. Keep text contrast ≥ 4.5:1 even over a bright glow.
- Mood accents: Dawn `#F5B38A` / `#F28FB0` / `#FFD98A` · Rain `#7FD1C7` / `#A8C5A0` · Ocean `#6FD6F0` / `#8FB8FF` · Night Forest `#7EE0A1` / `#F4E27A` · Temple `#F2B45A` / `#E8875B`. One accent family per mood.
- Type: Fraunces (display; soft, organic), Manrope (UI), JetBrains Mono (recursion lens, code view). Self-hosted via Fontsource. Scale 12/14/16/20/28/40/64.
- Motion: micro 200 ms, panels 400 ms, scenes 1,200–2,000 ms; enter `cubic-bezier(0.22, 1, 0.36, 1)`, crossfade `cubic-bezier(0.65, 0, 0.35, 1)`. No bounce.
- Icons: Lucide, 1.5 px stroke. No emoji. Focus ring 2 px accent + 2 px offset.
- Avoid: purple-on-white gradients, neon cyberpunk, neumorphism, glassmorphism without a contrast backstop, default shadcn look.

### §7.2 Rendering

- Canvas 2D, devicePixelRatio scaling, layers: sky (gradient, a few slow-twinkling stars, horizon glow, ground mist), tree, glow, particles. Vignette + very faint static grain (≤ 3% opacity).
- Branch width = trunkWidth × ratio^depth (trunk 10–14 px → tips 0.75 px), round caps. Colour runs from the mood's deep tone at the trunk to the luminous accent at the tips; a second wide, low-alpha pass with `'lighter'` compositing adds glow.
- Growth: each branch draws over its note's duration (easeOutCubic). The playing branch brightens with velocity and fades over the release time.
- Leaves: blossoms (radial-gradient petals) scale in on their bell note, then breathe (opacity 0.7–1.0, 6–10 s, phase-offset).
- Particles: ≤ 80 fireflies/pollen on a slow noise field (< 20 px/s); small bursts of 3–6 on bell notes.
- Wind sway: per-branch rotation `sin(t·ω + depth·φ) × amp × depth / maxDepth`, period 6–10 s; children follow parents.
- Camera: fit tree bounds with padding; breathing zoom ±1% over 10 s.
- Batch strokes per depth level (one path per level) to stay at 60 fps with 2,000 branches. Pause rendering when the tab is hidden.
- Reduced motion: no sway, no drift, no zoom; fades only. Nothing may flash more than 3 times per second.
- Sync: visuals react to events the scheduler emits via `getDraw().schedule()`; never `setTimeout` for audio-visual sync.

---

## §8 UX and accessibility

### §8.1 Layout

- Full-bleed canvas. Top bar: logo (a tiny recursive Y-branch glyph) left; help, zen, fullscreen right.
- Floating glass transport bar (bottom centre, max 720 px): play/pause, new seed, Wander/Bloom, time + depth skyline, volume, Keep (export).
- Control drawer: right side 360 px on desktop, bottom sheet on mobile. Tabs: **World** (world picker + params), **Sound** (mood, key, scale, tempo, instrument mix), **Atmosphere** (ambience mixer, reverb space), **Session** (breathing, sleep timer, mono, reduce motion, UI sounds, shortcuts on/off).
- Mood chips: five chips above the transport bar; selecting one crossfades sound, palette and ambience over 3 s.

### §8.2 Interaction

- Recursion param changes regenerate after a 400 ms debounce and crossfade over 2 s. Sound params apply live with ramps.
- Shortcuts (can be turned off; never fire inside inputs): Space play/pause · N new seed · W Wander/Bloom · L lens · Z zen · E export · M mute · ←/→ seek 10 s · ↑/↓ volume · 1–5 moods · ? help · Esc close.
- Zen mode hides all UI (cursor hides after 3 s idle); any key or click shows it again.
- Breathing companion: ring that grows 4 s (inhale) and shrinks 6 s (exhale), optional, aligned to phrase starts when possible.
- Sleep timer: 15/30/60 min with a 60 s fade-out, then pause.
- Share link: params, world, mood, mode and seed in the URL hash. Garden: up to 24 saved seeds in localStorage with thumbnail, rename, delete.
- Onboarding: 3 short cards on first visit (plant a seed · watch it grow · keep your song), skippable, remembered.
- Toasts: polite, auto-dismiss after 4 s, also announced via `aria-live="polite"`.
- Errors: AudioContext unavailable → calm explanation; export failure → toast with retry; an error boundary with a **Replant** button. Params persist to localStorage.

### §8.3 Copy tone

Short, warm, second person, no exclamation marks, no emoji, no jargon outside the lens and code view. Examples: "Plant a seed", "Your song is ready", "Breathe in", "Keep this song".

### §8.4 Accessibility (WCAG 2.2 AA)

- Contrast ≥ 4.5:1 text, ≥ 3:1 UI components and focus indicators (1.4.3, 1.4.11).
- Full keyboard operation, logical focus order, visible focus not hidden by the sticky transport bar (2.1.1, 2.4.3, 2.4.7, 2.4.11).
- Character-key shortcuts can be turned off (2.1.4).
- Targets ≥ 24×24 CSS px; aim for 44×44 (2.5.8). Every slider also works with keys and click (2.5.7).
- Moving content can be paused: zen visuals pause with playback; reduce-motion switch (2.2.2).
- No more than 3 flashes per second (2.3.1).
- Audio never autoplays; volume and pause are always reachable (1.4.2).
- Canvas has `role="img"` and a live description, e.g. "A fractal tree, 127 branches, 7 levels deep, playing in D major pentatonic at 60 BPM" (1.1.1).
- Sliders use `aria-valuetext` with units. State changes are announced politely (4.1.3).
- `lang="en"`, responsive to 320 px width, zoom to 200% without loss (1.4.4, 1.4.10).

---

## §9 Export

- **WAV (Must):** `renderScore()` via `Tone.Offline` using the same `createRack()`; await reverb (and any sample) readiness inside the callback. 44.1 kHz stereo. 16-bit with TPDF dither (default) or 24-bit. Optional peak normalise to -1 dBFS (default on), 3 s fade-out, tail 8 s (adjustable 0–20 s), ambience included (toggle).
- **MIDI (Must):** `@tonejs/midi`, one track per voice, tempo and track names.
- **MP3 (Should):** `@breezystack/lamejs` (LGPL; credit it) at 192 kbps in a Web Worker with progress.
- **Cover art (Should):** 1600×1600 PNG of the finished tree with title, mood and seed.
- **Live session recording (Should):** `Tone.Recorder` (WebM/Opus or MP4/AAC depending on the browser); captures live tweaks and ambience.
- **Video (Could):** canvas `captureStream(30)` + audio via `MediaStreamDestination` → `MediaRecorder`.
- Progress: rendering → encoding → done, with cancel. Report offline progress by suspending the context at intervals where supported; otherwise show an estimate.
- Filename: `seedsong_<mood>_<seed>_<yyyymmdd-hhmm>.<ext>`.
- WAV metadata (LIST/INFO): INAM title, IART "Seedsong", ICMT share URL, ISFT "Seedsong 1.0 (Tone.js)", ICRD date.

## §10 Architecture

```
src/
  app/          App.tsx, providers, ErrorBoundary
  core/         random.ts, url.ts (share codec)
    worlds/     types.ts, grove.ts, lsystem.ts, hanoi.ts, registry.ts
    music/      theory.ts, moods.ts, compose.ts, wander.ts, bloom.ts, density.ts
  audio/        engine.ts, rack.ts, scheduler.ts, bus.ts, ios.ts
    instruments/ pad.ts, keys.ts, kalimba.ts, pluck.ts, bells.ts, drone.ts, bass.ts
    ambience/   rain.ts, ocean.ts, wind.ts, stream.ts, crickets.ts, fire.ts
  export/       offline.ts, wav.ts, mp3.worker.ts, midi.ts, cover.ts, record.ts, download.ts
  viz/          renderer.ts, grove-renderer.ts, lsystem-renderer.ts, hanoi-renderer.ts, particles.ts, sky.ts, camera.ts, palette.ts
  ui/           components/ (TransportBar, ControlDrawer, MoodChips, ParamSlider, RecursionLens, CodeView, DepthSkyline, ExportDialog, Onboarding, HelpOverlay, Toasts …), hooks/
  state/        store.ts (Zustand slices: session, params, audio, ui, garden)
  styles/       tokens.css, global.css
  workers/      compose.worker.ts (generate + compose off the main thread)
tests/e2e/      smoke.spec.ts, export.spec.ts, a11y.spec.ts, keyboard.spec.ts
scripts/        audio-qa.mjs, render-samples.mjs, collect-ai-logs.mjs
```

- AudioEngine API: `unlock()`, `load(score, mood)`, `play()`, `pause()`, `stop()`, `seek(s)`, `setVolume(v)`, `setAmbience(layer, v)`, `setMono(on)`, `crossfadeTo(score, mood)`, `dispose()`.
- iOS: on unlock set `navigator.audioSession.type = 'playback'` when supported (plays even with the silent switch on); otherwise fall back to a looping silent `<audio>` element.
- Budgets: generate + compose < 50 ms for 2,047 nodes · 60 fps desktop, ≥ 30 fps mid-range phone · initial JS < 400 KB gzipped · no memory growth across 10 regenerations (dispose everything).

## §11 Testing and quality

1. **Unit (Vitest):** core is deterministic and invariant-tested (node counts, call/return nesting, scale lock, density cap, final tonic, no NaN, snapshot of one small seed). WAV header and encoder round-trip. MIDI note count.
2. **Component:** sliders have labels and `aria-valuetext`; shortcuts respect the on/off setting.
3. **E2E (Playwright):** load → Begin → play 3 s with zero console errors; export WAV and assert size > 200 KB and RMS > -45 dBFS; keyboard-only flow; mobile viewport smoke.
4. **Audio QA (`npm run audio:qa`):** render one reference seed per mood in headless Chromium, analyse the WAV in Node: peak ≤ -1.0 dBFS, approximate loudness -20 to -14 LUFS, no silence gap > 4 s before the outro, no NaN or DC offset. Print a table; exit non-zero on failure.
5. **A11y:** `@axe-core/playwright` on every screen state: zero serious or critical violations.
6. **CI/CD:** GitHub Actions `ci.yml` (npm ci → verify → e2e with cached browsers) and `deploy.yml` (build → GitHub Pages via `actions/deploy-pages`, Vite `base` = `/<repo>/`).

## §12 Deliverables and README

### §12.1 Submission package

Public repo · live GitHub Pages URL · 2–3 minute demo video (unlisted YouTube or Drive) · `samples/` (3 exported songs as MP3 + cover PNG + share links) · `ai-logs/` (prompt log, transcripts, planning session) · LICENSE (MIT) · CREDITS.md · tag `v1.0.0`.

### §12.2 README outline

1. Hero image or GIF + one-line pitch + **Live demo** and **Video** links.
2. "The idea": the recursion → music mapping table (§5.3) and one paragraph.
3. The brief's six mandatory deliverables, each with where it lives in the app.
4. Features (by rubric line).
5. How it works: architecture mermaid diagram (trace → score → audio/export/visuals).
6. Run locally, test, build, deploy.
7. Accessibility statement (WCAG 2.2 AA measures).
8. Design decisions grounded in research (slow tempo, consonant harmony, soft dynamics, no sudden changes) with citations.
9. Credits and licences. 10. AI usage: tools, method, link to `ai-logs/INDEX.md`.
