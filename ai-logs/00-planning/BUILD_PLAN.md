> Exported from the claude.ai planning conversation (Claude Docs: "Recursive Soundscapes — Winning Build Plan"), 25 Nov 2026.
> This is the planning response to the prompt quoted in `planning-session.md`. The four diagrams (rubric chart, recursion-to-music map, architecture, timeline) are images in the original doc and appear here as placeholders.

# Recursive Soundscapes — Winning Build Plan (Hub's Quest Epoch 1)

Nov 25, 2026 · @Saikat

## TL;DR

Build **Seedsong**, a calm browser "sound garden". A recursive function grows a glowing fractal tree, and the call tree itself becomes the music. The trunk is the drone, the main boughs are the chord progression, branches carry the melody, twigs add ornaments, leaves ring as bells, and every `return` resolves a phrase.

The user picks a mood, shapes the seed, watches it grow, and downloads the song. The name is a working title; rename it freely.

- **Stack:** Vite + React + TypeScript, Tone.js for audio, Canvas 2D for visuals, Radix UI primitives for accessible controls, Vitest + Playwright for tests, GitHub Pages for the live demo.
- **Where the points are:** relaxation/UX (35%) plus musical quality (25%) is 60% of the score. Put most hours there, not into extra features.
- **Method:** drop the starter kit into an empty repo (CLAUDE.md, spec, skills, subagents, logging hooks), then run the phase prompts in order. Each phase is plan → build → verify (tests + browser screenshots) → you listen → commit.
- **Clock (GMT+6):** working skeleton with export before you sleep (about 04:00), sleep until 09:00, polish all day, feature freeze 18:30, submit by 21:00. The hard deadline is 22:00.

Five things decide the score:

1. **It sounds beautiful on the first click.** Every note is locked to a scale, timbres are soft, reverb is long, and a limiter stops harsh peaks. No random bleeps.
2. **The first minute feels like a ritual.** A headphones hint, one Begin tap, then the tree grows in sync with the music.
3. **Recursion is visible and audible.** A live call-stack "recursion lens" shows each call as it plays. A Wander (depth-first) vs Bloom (breadth-first) toggle lets people hear the difference.
4. **Export works every time.** Offline-rendered WAV, plus MP3, MIDI and cover art, covered by an end-to-end test.
5. **The AI logs are complete.** Hooks record every prompt and response automatically. Missing logs can get you disqualified.

## Where the points are

&#91;embedded content: Source: the official Hub's Quest Epoch 1 brief (evaluation section)\]

How you feel using it (35%) and how it sounds (25%) decide 60% of the score, so most of the build hours go there. Technical execution is only 5%. But the six mandatory deliverables are pass/fail, so a broken export or missing control costs far more than 5%.

- **Relaxation & UX (35%):** the first minute, moods, crossfades, ambience, calm visuals, mobile. The judges will feel this before they think about anything else.
- **Musical quality (25%):** scale-locked harmony that moves, phrases that breathe, a soft mix. Listening checkpoints are built into the timeline.
- **Creative recursion (15%):** won by the idea (the call tree is the musical form) and by making it visible. More worlds help less than a clearer mapping.
- **Visual design + interaction (20%):** one coherent design system and plain-language controls, not more screens.
- **Technical execution (5%):** the tests, CI and clean architecture mostly protect everything else from breaking at demo time.

The judges come from UIU Developers Hub, so most will likely know recursion from a data-structures course. A live call-stack view and a code view with the running line highlighted make the idea legible to them in seconds.

## Product concept: Seedsong

Seedsong turns one recursive function into a garden you listen to: plant a seed, watch it branch, hear it bloom, keep the song. Tagline for the README hero: *"Plant a seed. Watch recursion grow. Listen to it bloom."*

Why this concept beats the obvious entries:

- **It is the most literal recursive function.** `branch(length, angle, depth)` calls itself, so every judge recognises it in one glance. Most rival entries will map Fibonacci numbers to random notes.
- **The structure is musical, not decorative.** A tree already has the shape of a piece of music: one root, a few big sections, many small phrases, and endings. Section 4 maps each level to a musical role.
- **It is calming to watch.** Slow growth, swaying branches and glowing blossoms are relaxing visuals, and relaxation is the largest rubric line.
- **It scales safely.** The same engine can later play other recursions as extra "worlds" (an L-system garden, a Tower of Hanoi music box) without touching the audio or export code.

### The first minute (the judge's first impression)

1. **Landing.** Deep twilight gradient, slow drifting motes, the title, and one seed pulsing at breathing pace (about 6 breaths a minute). A line reads "Best with headphones". One button: **Begin**. That tap also unlocks browser audio, which browsers require anyway.
2. **0–8 s.** A warm drone fades in. The trunk grows upward with a low note.
3. **8–60 s.** Boughs split into harmony, branches carry the melody, twigs sparkle, and leaves open as glowing blossoms with bell tones. The recursion lens prints `branch(depth 3, length 84, angle 24°)` as each note plays.
4. **Ending.** The recursion unwinds, the music resolves to the home chord, the tree sways gently, and a softly glowing **Keep this song** button appears.

### Core loop

Choose a mood → shape the seed → grow and listen → keep (export, share link, save to your garden).

### Five moods (one-tap presets)

Each mood sets the scale, tempo, instruments, ambience and colour palette together, so a non-technical user gets a finished piece in one tap.

| Mood | Scale and tempo | Lead sound | Ambience | Palette |
| --- | --- | --- | --- | --- |
| Dawn Mist | D major pentatonic, 60 BPM | soft electric piano + warm pad | light birds, breeze | peach, rose, gold on deep indigo |
| Rain Garden | A minor pentatonic, 56 BPM | kalimba pluck + pad | rain | teal, sage on slate |
| Deep Ocean | C Lydian, 50 BPM | slow pad swells + glass bells | ocean waves | aqua, cyan on navy |
| Night Forest | F♯ minor pentatonic, 54 BPM | harp-like pluck + low drone | crickets, stream | emerald, moss, firefly yellow |
| Temple | D Yo scale, 48 BPM | koto-like pluck + singing-bowl drone | wind, distant chimes | amber, saffron on plum |

Four of the five are pentatonic scales with no semitones, so overlapping notes never clash. Deep Ocean uses C Lydian; the composer treats its two semitone steps as short passing notes only.

## Recursion to music: the creative core

&#91;embedded content: Recursion-to-music mapping · 6 levels and the return rule\]

The recursion's structure is the musical structure. Musically a tree is a piece: one key, a few sections, many phrases, and endings. Each level of `branch()` therefore gets a different musical job, and each `return` resolves what its call started. Listeners hear the shape of the recursion: phrases inside sections inside the piece, self-similar at every scale.

### The other parameters

| Recursion property | Musical result |
| --- | --- |
| branch length | note duration (long boughs, short twigs) and loudness |
| branch angle vs its parent | melodic step: left holds, right climbs, jitter adds a neighbour note |
| branch x position | stereo position, so the left side of the tree sounds on the left |
| depth | register and velocity: deeper is higher and softer |
| randomness (seeded) | gentle timing and velocity humanisation |
| seed | the whole piece: the same seed always grows the same song |

### Two ways to traverse the same tree

- **Wander (depth-first, default):** the melody climbs one branch to its leaf, comes back, and climbs the next, like an improvisation that keeps returning home.
- **Bloom (breadth-first):** each level plays as a 2-bar phrase, left to right like a harp sweep, so the tree blooms level by level from drone to bells.

A toggle lets people hear the difference, which teaches depth-first versus breadth-first faster than any diagram.

### More recursions through the same engine

- **L-System Garden (Should):** a recursive `expand(symbol, depth)` grows ferns, bushes, Koch snowflakes and dragon curves. `[` and `]` push and pop the turtle, so branches literally start harmony voices and return to the saved pitch.
- **Hanoi Music Box (Could):** `hanoi(n, from, to, via)` moves glowing discs; larger discs sound lower, each peg has its own timbre, and the smallest disc's every-other-move pattern becomes a natural ostinato.

## Features by priority

Ship every Must by 15:00, start Shoulds only once the Musts are verified, and stop adding features at 18:30. The full spec for each item is in `docs/SPEC.md` §3 of the starter kit.

| Priority | Feature | What it earns |
| --- | --- | --- |
| Must | Fractal Grove: depth, branching, spread, length ratio, randomness, asymmetry, seed | Deliverable 1, creative recursion |
| Must | Composer: fractal form, Wander mode, scale lock, cadences, density cap | Deliverable 3, musical quality |
| Must | Live audio: five moods, pad/lead/bell/drone voices, reverb, limiter, procedural ambience | Musical quality, relaxation |
| Must | Canvas tree that grows in sync with the notes, with glow, particles and sway | Deliverable 2, visual design |
| Must | Transport: play, pause, seek, volume, regenerate with crossfade | Deliverable 4, interaction |
| Must | Export: offline-rendered WAV with progress, plus MIDI | Deliverable 5 |
| Must | Landing ritual, moods, control drawer, mobile layout, keyboard access | Deliverable 6, relaxation & UX |
| Must | Live GitHub Pages demo, README, complete AI logs | Eligibility, technical execution |
| Should | Bloom (breadth-first) mode and a Wander/Bloom toggle | Creative recursion |
| Should | Recursion lens, code view, depth skyline | Creative recursion, visual design |
| Should | MP3, cover-art PNG, live session recording | Interaction |
| Should | Ambience mixer, breathing companion, sleep timer, zen mode | Relaxation & UX |
| Should | Share links and a saved-seed "garden" | Interaction |
| Should | World 2: L-System Garden | Creative recursion |
| Should | Audio QA script, axe accessibility tests, CI | Technical execution, musical quality |
| Could | World 3: Hanoi Music Box | Creative recursion |
| Could | Sampled lead from VSCO 2 CE (public domain, CC0) | Musical quality |
| Could | Endless Drift: next tree modulates up a fifth | Relaxation |
| Could | PWA install and lock-screen controls | UX |
| Could | Video export, Bangla UI toggle | Interaction, local touch |
| Won't | Accounts, backend, AI-generated audio, payments | Nothing in the rubric |

**What "enterprise-ready" means here.** It means production quality: a pure, tested core, CI, a live deploy, WCAG 2.2 AA accessibility, performance budgets, clean licences and real documentation. It does not mean enterprise features such as login, databases or admin panels. Those earn zero rubric points, cost hours and add failure risk, so the plan leaves them out on purpose.

## Architecture and stack

&#91;embedded content: Seedsong architecture · one score, three outputs\]

Everything flows from one `Score`. The recursion and the composer are pure, tested functions, so the same seed always gives the same piece. The live engine and the exporter build their instruments with the same `createRack()`, so the file sounds exactly like playback. Visuals never schedule audio; they react to note events the audio clock emits through `getDraw()`, so sight and sound stay in sync.

### Stack (versions checked on npm today)

| Layer | Choice | Version | Why |
| --- | --- | --- | --- |
| Build | Vite + React + TypeScript (strict) | 8.3 / 19.3 / 7.0 | fastest agent-friendly setup; `npm create vite` now ships TypeScript 7 and oxlint |
| Audio | Tone.js | 15.1 | scheduling, synths, effects, offline rendering, recorder |
| Visuals | Canvas 2D | built in | fast enough for 2,047 branches, no extra library to debug |
| UI | Tailwind CSS + Radix UI primitives + Motion + Lucide | 4.3 / 1.8 / 14 / 1.80 | accessible sliders, dialogs and tabs out of the box |
| State | Zustand | 5.1 | small, persists settings and the garden |
| Export | `@tonejs/midi`, `@breezystack/lamejs` | 2.0 / 1.2 | MIDI and MP3; WAV encoder written in-house |
| Tests | Vitest + Testing Library, Playwright + axe | 5.1 / 1.65 / 4.14 | unit, end-to-end, accessibility |
| Deploy | GitHub Actions → GitHub Pages |  | free, lives next to the repo the judges open |

One trap I checked: `typescript-eslint` does not support TypeScript 7 yet, so the kit tells Claude to keep create-vite's oxlint and not add ESLint.

### Folder map

`src/core` (worlds, music, random, url) · `src/audio` (engine, rack, scheduler, instruments, ambience) · `src/export` (offline, wav, mp3 worker, midi, cover, record) · `src/viz` (renderer, per-world renderers, particles, camera) · `src/ui` (components) · `src/state` · `tests/e2e` · `scripts`. The full tree and interfaces are in SPEC §4.0 and §10.

### Budgets

Generate and compose in under 50 ms for the largest tree, 60 fps on desktop and at least 30 on a mid-range phone, under 400 KB of JavaScript gzipped on first load, and no memory growth across 10 regenerations.

## Sound design

The music sounds intentional for three reasons. Every note is locked to the scale. Harmony moves through calm, voice-led chords. A proper mix chain keeps everything soft. The mood table in the concept section sets scale, tempo, timbre and ambience; this section covers how it is played.

### Five rules that separate music from bleeps

1. **Work in scale degrees, never raw pitches.** The melody steps through the scale index, so a wrong note is impossible by construction.
2. **Harmony must move.** One chord per phrase from a calm progression (add9, sus, maj7 voicings), and each chord is voice-led so the smallest possible movement connects it to the last one.
3. **Phrases breathe.** Every return from a depth-2 call gets a soft cadence and one beat of rest. The piece ends on the home chord with a 10-second tail.
4. **Less is more.** At most about 3.5 notes a second, soft velocities, long releases. Silence is part of the piece.
5. **Mix it like a record.** High-pass everything except drone and bass, use one long reverb on a send, then compressor and limiter at -1 dB, aiming for about -18 to -16 LUFS.

### Voices and levels

| Voice | Built from (Tone.js 15) | Level | Role |
| --- | --- | --- | --- |
| Drone | two detuned sines, 6 s attack | -24 dB | the trunk: key and root |
| Pad | PolySynth of fat triangles → low-pass with slow LFO → chorus | -18 dB | chords per phrase |
| Lead | FM electric piano, FM kalimba, or Karplus-Strong pluck per mood | -12 to -15 dB | the melody from branches |
| Bells | FM bell (harmonicity 5.07) → high-pass 400 Hz | -22 dB | leaves, with heavy reverb |
| Ambience | filtered noise layers: rain, ocean, wind, stream, crickets, fire | -24 to -34 dB | atmosphere |

Exact starting patches, the full mix table and the Tone.js rules are in the kit's `sound-design` skill. A nice detail for the README: Karplus-Strong synthesis is itself a feedback loop, so even the pluck sound is recursive.

### Ambience and samples

Build ambience procedurally first. It needs no files or licences and renders cleanly in the offline export. If there is time, add two to four recorded loops from Pixabay, which the brief itself suggests. Pixabay content is free to use without attribution, but it cannot be redistributed as standalone files ([Pixabay licence](https://pixabay.com/service/faq/)); credit it in CREDITS.md anyway. For a sampled lead, VSCO 2 Community Edition is public domain (CC0) ([Versilian Studios](https://versilian-studios.com/vsco-community/)).

### Research to cite in the README

- A web-based listening study of 293 adults identified the elements that promoted relaxation: no accentuation, legato, soft (pp–mp) dynamics, smooth melodic shape, repetition, middle register, rubato, thin texture and smooth transitions. Legato, absent accents and rubato mattered most ([Conrad et al., medRxiv preprint, 2023](https://medrxiv.org/content/10.1101/2023.08.09.23293385v1.full.pdf)). The composer's rules map onto each of these. The same study found medium tempos (80–100 bpm) relaxing, so let users raise the tempo instead of forcing very slow pieces.
- A study that slowed the tempo to 45 bpm, softened the timbre and lowered the volume found two distinct responder profiles among listeners ([Hernández-Ruiz et al., Psychology of Music, 2020](https://researchdiscovery.drexel.edu/esploro/outputs/journalArticle/What-makes-music-relaxing-An-investigation/991019169516804721)). People relax differently, which is the argument for user-chosen moods and tempo.

### You are the ears

Claude cannot hear. At every audio checkpoint, listen on headphones and on phone speakers, then report in these words so Claude can map them to changes:

| You hear | Claude changes |
| --- | --- |
| harsh, tinny | lower FM index, low-pass the lead at 3–4 kHz, quieter bells |
| muddy, boomy | high-pass pads at 150–180 Hz, drop the bass, cut low end from the reverb |
| busy, anxious | fewer notes per second, drop ornaments, longer notes |
| boring, samey | progression moves every phrase, register changes per section |
| aimless | phrase starts and strong beats snap to chord tones |
| clicks, pops | longer attacks, ramp every change |

The full 13-row table is in the `sound-design` skill. Spend 20–30 minutes on the first listening pass; it is the 25% line.

## Visual design, relaxation UX and accessibility

Calm here is a design decision: a dark "Nocturne Garden" look, slow motion, one obvious action at a time, and WCAG 2.2 AA from the first screen. This section carries 55% of the score (relaxation & UX, visual design, interaction).

### Visual system

| Token | Value |
| --- | --- |
| Background | ink navy `#0B1020` → `#121A33`, mood-tinted horizon glow; never pure black |
| Text | `#EEF1F8` primary, `#AAB3C8` secondary (9:1 on the background) |
| Glass panels | `rgba(12,17,34,0.62)` + 16 px blur + hairline border; keeps text contrast over a bright tree |
| Accents | one family per mood (peach-gold Dawn, teal-sage Rain, aqua Ocean, emerald-firefly Forest, amber Temple) |
| Type | Fraunces (display), Manrope (UI), JetBrains Mono (code view), self-hosted |
| Motion | 200 / 400 / 1,200–2,000 ms, ease-out entrances, no bounce; ambient loops 6–10 s |
| Icons | Lucide outline, 1.5 px stroke; no emoji |

**Avoid:** purple gradients on white, neon cyberpunk, neumorphism, the default shadcn look, bouncy animation. I ran the ui-ux-pro-max design skill for this brief; it proposed light neumorphism in lavender, which suits wellness landing pages, not an immersive night-time instrument, and neumorphism carries high accessibility risk. Use that skill for its UX checklists only.

### Signature visuals

- Branches glow from a deep trunk colour to luminous tips, with a soft additive glow pass.
- Each branch grows over the length of its own note. The playing branch brightens with the note's loudness.
- Leaves open as blossoms when their bell rings, then breathe slowly.
- Up to 80 fireflies drift on a slow noise field; a few spark on each bell.
- Wind sway with a 6–10 s period, stronger toward the tips; a ±1% breathing zoom every 10 s.

### Relaxation features

- **First-minute ritual:** headphones hint, one Begin tap, drone fades in over 6 s.
- **Moods:** one tap changes sound, palette and ambience together, with a 3 s crossfade.
- **Nothing jumps:** parameter changes regenerate after 400 ms and crossfade over 2 s.
- **Atmosphere mixer:** rain, ocean, wind, stream, crickets, fire.
- **Breathing companion:** a ring that grows for 4 s and shrinks for 6 s.
- **Sleep timer:** 15, 30 or 60 minutes, then a 60 s fade.
- **Zen mode:** hides all UI; any key brings it back.
- **Calm copy:** "Plant a seed", "Your song is ready", "Keep this song". No exclamation marks.
- **In-key UI sounds:** optional, quantised to the scale and the beat, so interacting never breaks the music.

### Interaction

- Layout: full-bleed canvas, floating glass transport bar, a control drawer (right on desktop, bottom sheet on mobile) with World, Sound, Atmosphere and Session tabs.
- Every slider has a plain-language explanation of its musical effect, for example "Depth: how many times each branch splits. Deeper trees make longer songs."
- Shortcuts: Space, N, W, L, Z, E, M, arrows, 1–5, ?, Esc. They can be switched off.
- Share links carry the seed and every parameter; a local "garden" keeps up to 24 seeds.
- Errors are gentle: a toast with retry, and a "Replant" recovery screen.

### Accessibility (WCAG 2.2 AA)

- Full keyboard operation, visible focus that the transport bar never hides, no keyboard traps.
- Contrast 4.5:1 for text and 3:1 for controls, measured over the brightest part of the tree.
- Reduced-motion mode (system setting or in-app switch): no sway, drift or zoom; fades only. Nothing flashes more than 3 times a second.
- The canvas has a live text description, such as "A fractal tree, 127 branches, 7 levels deep, playing in D major pentatonic at 60 BPM".
- Sliders announce values with units; status changes are announced politely; touch targets are at least 24 px (aim for 44).
- Audio never autoplays; pause and volume are always one step away; a mono switch helps people with hearing in one ear.
- Automated: axe checks in the end-to-end tests must report zero serious or critical issues.

## Audio export

Export renders the score offline through the exact instrument rack used for live playback. The file therefore sounds identical to what the user heard, and it renders faster than real time. Export is a mandatory deliverable, so it is built before you sleep (Phase 5), not on the last day.

| Format | How | Priority |
| --- | --- | --- |
| WAV, 16-bit (default) or 24-bit | `Tone.Offline` → own encoder with dither and title/seed metadata | Must |
| MIDI | `@tonejs/midi`, one track per voice, so musicians can open it in a DAW | Must |
| MP3, 192 kbps | `@breezystack/lamejs` in a Web Worker (LGPL; credit it) | Should |
| Cover art, 1600×1600 PNG | snapshot of the finished tree with title, mood and seed | Should |
| Live session recording | `Tone.Recorder`: WebM/Opus or MP4/AAC depending on the browser | Should |
| Video | canvas stream + audio through `MediaRecorder` | Could |

### Pipeline

1. Build the rack inside `Tone.Offline` with the same `createRack()` used live.
2. Await the reverb's `ready` promise (and any samples) before starting the transport. Skipping this is the classic cause of silent or dry exports.
3. Render the score plus an 8-second tail, fade the last 3 seconds, and peak-normalise to -1 dBFS.
4. Encode, with progress (rendering → encoding → done) and a cancel button.
5. Name the file `seedsong_<mood>_<seed>_<date>.wav` and write the share link into its metadata, so every file can be regrown.

**Proof it works:** an end-to-end test downloads a WAV and checks that it is over 200 KB with RMS above -45 dBFS. `npm run audio:qa` renders every mood and fails on clipping, wrong loudness or long silences.

## 24-hour timeline

&#91;embedded content: Build timeline · Wed 25 23:20 to Thu 26 22:00, GMT+6\]

The night builds the engine, so the riskiest technical parts (composer, audio, export) are done while you are fresh. The morning goes to what judges feel (visuals, relaxation UX). The afternoon makes recursion visible, adds a world, and hardens accessibility and performance. Nothing new starts after 18:30.

- **Checkpoint 04:30:** a full piece plays and exports. If not, skip the overnight goal and fix export first; it is mandatory.
- **Checkpoint 13:30:** the app shell, moods and tools work on the live URL. If you are behind, run the behind-schedule prompt and cut Hanoi, video export and PWA.
- **Checkpoint 18:30:** feature freeze. Only fixes, docs and the demo video after this.
- **12:00:** the submission link is released. Open it straight away so there are no surprises at 21:00.
- Take a 20–30 minute break around 13:30. Sleep is in the plan on purpose: listening and visual judgement are what earn the 35% and 25% lines, and both degrade badly without it.

## Claude Code setup

You need the latest Claude Code, the starter kit, one official plugin and two MCP servers. Every extra plugin costs context and adds ways to break, so install nothing else. Claude Code needs a paid plan (Pro, Max, Team, Enterprise or Console); the free claude.ai plan does not include it ([setup docs](https://code.claude.com/docs/en/setup)).

### Install

| Step | Command |
| --- | --- |
| Install on macOS, Linux or WSL | `curl -fsSL https://claude.ai/install.sh \| bash` |
| Install on Windows (PowerShell) | `irm https://claude.ai/install.ps1 \| iex` |
| Update an existing install | `claude update`, then check with `claude --version` or `claude doctor` |

On Windows, Git for Windows is optional. It provides Git Bash, which Claude Code's Bash tool needs; without it Claude Code falls back to PowerShell.

### What to install, and what to skip

| Item | Type | How | Why |
| --- | --- | --- | --- |
| `verify`, `sound-design`, `calm-ux`, `judge` | project skills | in the kit (`.claude/skills/`) | project knowledge on demand; a project skill named `verify` runs right before every commit ([skills docs](https://code.claude.com/docs/en/skills.md)) |
| `rubric-judge`, `a11y-auditor`, `music-director` | subagents | in the kit (`.claude/agents/`) | independent reviews, so the builder never grades itself |
| frontend-design (Anthropic) | plugin | `/plugin install frontend-design@claude-plugins-official` | steers UI away from the generic AI look |
| Playwright MCP | MCP server | in the kit's `.mcp.json` | Claude's eyes: opens the app, clicks, screenshots, reads the console |
| Context7 MCP | MCP server | in the kit's `.mcp.json` | current library docs (Tone.js 15, Vite 8, Tailwind 4) instead of stale memory |
| `/code-review`, `/simplify`, `/security-review` | bundled skills | built in | quick reviews before the release |
| ui-ux-pro-max | plugin, optional | `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` | UX and accessibility checklists only |
| webapp-testing, algorithmic-art | skip |  | redundant with the Playwright MCP; pulls the renderer toward p5.js |

On native Windows, MCP servers started with `npx` need a `cmd /c` wrapper, which is why the kit ships `.mcp.windows.json` ([MCP docs](https://code.claude.com/docs/en/mcp)).

### Models and effort

- `/model best` picks Fable where your plan includes it, otherwise the latest Opus ([model configuration](https://code.claude.com/docs/en/model-config)). Fable is the most capable model in Claude Code and suits long, autonomous work, but it is never the default.
- On the Anthropic API the `opus` alias resolves to Opus 5.5 and `sonnet` to Sonnet 5.5. Use Sonnet for the release phase or when `/usage` runs high.
- `/effort high` by default; `/effort xhigh` for the architecture, composer and UX planning phases. Avoid `max` unless usage is plentiful.
- Anthropic's own tip for Fable: describe the outcome, not the steps, and use a goal to keep it working toward that outcome. The kit's prompts are written that way.

### Commands you will use

| Command | Use it for |
| --- | --- |
| Shift+Tab | cycle permission modes: default → accept edits → plan (and auto, where available) |
| `/plan <task>` | start a big phase in read-only planning mode |
| `/clear` | fresh context before each new phase (the logs keep the history) |
| `/compact <focus>` | shrink a long session without starting over |
| `/rewind` or Esc Esc | roll code and conversation back to a checkpoint |
| `/goal <condition>` | keep Claude working until a checkable condition holds; a small fast model judges it after each turn ([goal docs](https://code.claude.com/docs/en/goal)) |
| `/usage` | plan limits and spend; check it between phases |
| `/hooks`, `/mcp`, `/skills` | confirm the logging hooks, servers and skills are loaded |
| `/export <file>` | extra plain-text backup of a conversation |

### Permissions

The kit's `.claude/settings.json` pre-approves safe commands (npm scripts, Playwright, `git add`, `commit` and `push` without force). It blocks edits to `ai-logs/` and the hooks, force pushes, hard resets and reading `.env` files. Do not use `--dangerously-skip-permissions`; the allowlist plus accept-edits mode gives the same speed without the risk.

## Starter kit and the method

The kit gives Claude Code the whole picture before it writes a line. The method keeps it honest: plan, build, verify, listen, commit, one phase at a time. Both are in `seedsong-starter-kit.zip`, which I sent in the chat; `README_FIRST.md` inside it walks through setup in about 20 minutes.

| Kit file | What it does |
| --- | --- |
| `CLAUDE.md` | read by Claude every session: rubric weights, stack rules, architecture rules, definition of done, relaxation rules |
| `docs/SPEC.md` | the full spec: worlds, composer algorithm, moods and patches, visual tokens, UX, accessibility, export, architecture, tests |
| `docs/PROMPTS.md` | the 13 phase prompts (0–12) plus feedback templates |
| `docs/RUBRIC.md` | the official rubric, what a 10/10 looks like, the final self-check |
| `.claude/settings.json` + `.claude/hooks/ai-log.mjs` | automatic prompt and response logging, plus the permission allowlist |
| `.claude/skills/` and `.claude/agents/` | project skills and independent reviewers |
| `.mcp.json` / `.mcp.windows.json` | Playwright and Context7 |
| `scripts/collect-ai-logs.mjs` | rebuilds the logs from Claude Code's own transcripts |

### The method, in ten rules

1. **Spec before code.** Claude reads `CLAUDE.md` every session; each prompt names the spec section to read first.
2. **One phase per context.** Run `/clear` before each phase. Long, mixed sessions are where quality drops.
3. **Plan the big phases.** Architecture, composer and UX start in plan mode. Read the plan, correct it, then approve.
4. **Ask for outcomes with a finish line.** Every prompt ends with "Done when…" so Claude knows exactly what proof to show.
5. **Give Claude eyes.** After any UI change it screenshots desktop and phone sizes with the Playwright MCP and fixes what looks wrong.
6. **You are the ears.** Listen at every audio checkpoint and answer in the feedback vocabulary.
7. **Independent review.** The builder never grades itself: run `/judge`, the `a11y-auditor` and the `music-director` after major phases.
8. **Commit and push every green phase.** The `verify` skill runs first; CI deploys the live site. If something breaks, use `/rewind` or revert the last commit.
9. **Mind the usage budget.** Check `/usage` between phases, use Sonnet for light work, and sleep while the window refills.
10. **Protect scope.** Musts first, then Shoulds; nothing new after 18:30.

### What only you can do

- Listen on headphones and phone speakers, and look at the app on your actual phone.
- Choose between options when Claude asks; never let it guess on scope.
- Record the demo video, write the submission, and paste the share link of this planning chat into `ai-logs/00-planning/planning-session.md`.

## The prompt chain

These are the exact prompts to paste into Claude Code, in order; the same text is in `docs/PROMPTS.md` in the kit. Paste them whole, because the logs record exactly what you send. Run `/clear` before each new phase, and use the feedback templates in the next section between phases.

| Phase | Model · effort · mode | Done when |
| --- | --- | --- |
| 0 Architecture | best · xhigh · plan | the approved plan is saved as `docs/plans/00-architecture.md` |
| 1 Scaffold, CI, deploy | opus · high | verify and e2e pass; the landing screen is live on GitHub Pages |
| 2 Recursion engine | opus · high | the Grove generator passes count, nesting and determinism tests |
| 3 Composer | best · xhigh · plan | score tests pass and the note dump looks musical |
| 4 Audio engine | best · high | every voice plays in /lab and you approve the sound |
| 5 Export | opus · high | WAV and MIDI download; the e2e test proves the WAV is not silent |
| Overnight goal | auto or accept edits | verify, e2e and audio QA pass; `docs/STATUS.md` exists |
| 6 Visualizer | opus · high | the tree grows in sync at 60 fps; screenshots reviewed |
| 7 Relaxation UX | best · high · plan | shell, moods, tools and onboarding work; keyboard-only run passes |
| 8 Recursion visible | opus · high | lens, code view, skyline and Wander/Bloom work |
| 9 More worlds | opus or sonnet · high | L-System world works (Hanoi only if ahead) |
| 10 A11y + performance | opus · high | axe reports 0 serious issues; 60 fps; no memory growth |
| 11 Judge + polish | opus · high | the judge's re-score improves; feature freeze at 18:30 |
| 12 Release | sonnet · medium | README, samples, logs, deployed checks, `v1.0.0` tag |

### Phase 0: Architecture \[PLAN\] · target 00:00–00:25

```
/plan We are building "Seedsong" for a 24-hour solo hackathon (deadline Thu 26 Nov 2026, 22:00 GMT+6). Read CLAUDE.md, docs/SPEC.md (all of it) and docs/RUBRIC.md before answering.

Produce a plan that I will save as docs/plans/00-architecture.md, containing:
1. The folder and module structure from SPEC §10, changed only where you have a concrete reason (say why).
2. Exact TypeScript interfaces for WorldDefinition, ParamSpec, RecursionTrace, TraceNode, MusicParams, Mood, Score, ScoreNote, ScoreChord, ScoreEvent, and the AudioEngine public API.
3. A mermaid data-flow diagram: user params → trace → score → live playback / offline export / MIDI / visuals.
4. The dependency list with versions you verified with `npm view <pkg> version`. Keep the create-vite defaults (oxlint, TypeScript 7). No ESLint.
5. The 8 biggest technical risks (for example Tone.Offline with Reverb readiness, iOS silent switch, canvas performance, GitHub Pages base path) and the mitigation for each.
6. A checklist for Phases 1–12 of docs/PROMPTS.md with acceptance criteria per phase.

Do not write application code yet. Ask me at most 3 questions, and only if something blocks the plan.
```

After you approve: "Save the approved plan to docs/plans/00-architecture.md and commit it."

### Phase 1: Scaffold, CI, deploy · target 00:25–01:00

```
Implement Phase 1 of docs/plans/00-architecture.md.

1. This folder already contains CLAUDE.md, docs/, scripts/, ai-logs/ and .claude/, so do NOT scaffold into it directly and NEVER use --overwrite or anything that deletes files. Run `npm create vite@latest _scaffold -- --template react-ts --no-interactive`, move everything from _scaffold into the repo root without overwriting existing files (append its .gitignore lines to ours), then delete _scaffold. Keep oxlint and TypeScript 7. Then add: Tailwind CSS 4 (@tailwindcss/vite), tone, zustand, motion, lucide-react, radix-ui, @fontsource-variable/fraunces, @fontsource-variable/manrope, @fontsource-variable/jetbrains-mono, vitest + jsdom + @testing-library/react, @playwright/test + @axe-core/playwright, prettier.
2. Create the folder structure from the plan with small placeholder modules.
3. package.json scripts: dev, build, preview, typecheck, lint, format, test, test:watch, test:e2e, verify (typecheck + lint + test + build), audio:qa (temporary stub that exits 0), logs:collect (node scripts/collect-ai-logs.mjs).
4. GitHub Actions: .github/workflows/ci.yml (npm ci, verify, Playwright e2e with cached browsers) and deploy.yml (build, then deploy to GitHub Pages with actions/deploy-pages; Vite `base` comes from the repo name).
5. The landing screen from SPEC §1.1 and §7.1: night gradient, the title "Seedsong" in Fraunces, "Best with headphones", and a Begin button. Begin calls Tone.start(), sets navigator.audioSession.type = "playback" when available, and plays a soft 3-second Dadd9 pad through a limiter with a fade in and out. Keyboard accessible, visible focus.
6. One Vitest smoke test and one Playwright smoke test (page loads, Begin is focusable, no console errors).

Done when: npm run verify passes, npm run test:e2e passes, you have screenshotted the landing screen with the Playwright MCP at 1440×900 and 390×844, and you have committed. Then give me the exact commands to push to GitHub and tell me how to enable GitHub Pages (Settings → Pages → Source: GitHub Actions).
```

Then check that `ai-logs/PROMPT_LOG.md` exists and shows Phase 0 and Phase 1. Push, enable Pages, and open the live URL.

### Phase 2: Recursion engine · target 01:00–01:30

```
Implement SPEC §4.0 and §4.1 (Fractal Grove) in src/core. Pure TypeScript: no DOM, no Tone.js, no React.

- src/core/random.ts: cyrb128 string hash → sfc32 PRNG; rng.fork(label) for independent streams; human-friendly seed names (adjective-noun-NN from a small calm word list).
- src/core/worlds/types.ts: WorldDefinition, ParamSpec (with plain-language help text and units), RecursionTrace, TraceNode.
- src/core/worlds/grove.ts: the recursive branch() exactly as SPEC §4.1 describes, with the depth clamp per branching factor (2,047-node budget), call/return events, geometry and bounds. Include codeSnippet and lineFor() for the code view.
- src/core/worlds/registry.ts.
- src/workers/compose.worker.ts: runs generate (and later compose) off the main thread, with a synchronous fallback.

Tests: for branching 2 and depth d the node count is 2^(d+1) − 1; every call has exactly one matching return and events nest properly; the same params + seed give a deep-equal trace; a different seed changes the geometry; the depth clamp holds for branching 3 and 4; the largest allowed tree generates in under 50 ms (log the time).

Done when npm run verify passes. Commit, then summarise the public API in 5 lines.
```

### Phase 3: Composer \[PLAN\] · target 01:30–02:30

```
/plan Implement SPEC §5 (the composer) in src/core/music. Load the sound-design skill first.

- theory.ts: the scales in SPEC §5.2, degree ↔ MIDI helpers, a chord builder, and voice-leading (choose the inversion and octave with the smallest total movement from the previous chord).
- moods.ts: the five moods in SPEC §6.1 (musical fields only: root, scale, bpm range, progression, registers, density).
- compose.ts (+ wander.ts, bloom.ts, density.ts): composeScore(trace, music, mode) implementing the fractal form of SPEC §5.3, Wander (§5.4) now and Bloom (§5.5) as a second mode, the dynamics envelope, the density cap, seeded humanisation, cadences on depth-2 returns, the final resolution to the tonic, and ScoreEvents for visual sync.

Tests: every note's pitch class is in the active scale (except Lydian passing notes on weak beats); notes per second never exceed the cap; the last chord is the tonic chord; Wander and Bloom order notes differently for the same trace; identical inputs give an identical score (snapshot one small seed); default params of every mood give 90 s–6 min; no NaN and no negative times.

Finally print a readable dump of the first 40 notes of the default Dawn Mist score (time, voice, note name, velocity) so I can check the melody shape by eye.
```

### Phase 4: Audio engine + live playback · target 02:30–03:30

```
Implement SPEC §6 (sound design) and the playback half of SPEC §10 in src/audio. Load the sound-design skill first and follow its Tone.js v15 rules.

- rack.ts: createRack(context, mood) builds every voice, the send effects (reverb, delay, chorus), the procedural ambience layers and the master chain (EQ → compressor → limiter at −1 dB). It must work unchanged inside Tone.Offline, because Phase 5 exports with it. Await reverb readiness.
- engine.ts: AudioEngine with unlock(), load(score, mood), play(), pause(), stop(), seek(seconds), setVolume(), setAmbience(layer, value), setMono(), crossfadeTo(score, mood) over 2 s, and dispose(). Every change ramps; no clicks.
- scheduler.ts + bus.ts: schedule ScoreNotes and ScoreChords on getTransport(); emit typed visual events through getDraw() onto an event bus.
- A dev-only /lab route with buttons to audition each voice, each mood's pad + lead, each ambience layer, and the full default score.

Check: no console errors, and no growth in live Tone.js nodes after 10 crossfades. Then STOP and give me a listening checklist: which /lab buttons to press, what each should sound like, and what to report back.
```

**Listening checkpoint 1 (you):** headphones on, go through the checklist, then send the listening-feedback template below. Repeat until it sounds calm and beautiful. This is the 25% musical-quality line; spend 20–30 minutes here.

### Phase 5: Export · target 03:30–04:30 (right after Phase 4)

```
Implement SPEC §9 in src/export, plus the export dialog. Load the sound-design skill first.

- offline.ts: renderScore(score, mood, options) via Tone.Offline using the SAME createRack(); await reverb and sample readiness inside the callback; ambience toggle; tail and fade-out; progress (suspend the offline context at intervals where supported, otherwise estimate); cancel.
- wav.ts: 16-bit with TPDF dither and 24-bit PCM, LIST/INFO metadata (title, artist, comment with the share URL, software, date), optional peak normalise to −1 dBFS.
- midi.ts: @tonejs/midi, one track per voice, tempo and names.
- mp3.worker.ts: @breezystack/lamejs at 192 kbps in a Web Worker with progress.
- cover.ts: a 1600×1600 PNG of the finished tree with title, mood and seed. record.ts: live session recording with Tone.Recorder.
- ExportDialog: format, include ambience, tail length, normalise; progress, cancel, a calm success toast. Filename seedsong_<mood>_<seed>_<yyyymmdd-hhmm>.<ext>.

Tests: WAV header fields and byte length; 16/24-bit round trip; MIDI note count equals the score note count. Playwright e2e: Begin → export WAV → the download exists, is larger than 200 KB, and its RMS is above −45 dBFS (parse it in the test). Replace the audio:qa stub with scripts/audio-qa.mjs per SPEC §11.4. Done when verify and e2e pass. Commit and push.
```

### Before you sleep (optional, about 04:30)

Only if `/usage` shows plenty of room left. A goal does not change the permission mode, so first press Shift+Tab until you reach auto mode (if your Claude Code offers it) or *accept edits* (the kit's allowlist already covers npm and git commands). Then:

```
/goal npm run verify and npm run test:e2e both pass, src/core has at least 90% statement coverage, npm run audio:qa passes for all five moods, and docs/STATUS.md lists every Must and Should from SPEC §3 with its state (done / partial / missing) and the evidence. Do not add new features, do not change docs/SPEC.md, and stop after 30 turns.
```

If a usage limit hits overnight, the goal pauses and resumes when the limit resets.

Sleep 04:30–09:30. Usage windows refill while you sleep.

### Phase 6: Visualizer · target 09:30–10:30 (morning, fresh eyes)

```
Implement SPEC §7 for the Grove world in src/viz and connect it to the audio event bus. Load the calm-ux and frontend-design skills first.

- renderer.ts: Canvas 2D with devicePixelRatio scaling, resize handling, layered offscreen canvases (sky, tree, glow, particles), a 60 fps budget, and rendering paused while the tab is hidden.
- grove-renderer.ts: each branch grows over its note's duration (easeOutCubic); brightness follows velocity; leaves bloom as glowing blossoms on bell notes; gentle wind sway (6–10 s period, stronger with depth); strokes batched per depth level.
- particles.ts, camera.ts, sky.ts: ≤ 80 slow fireflies, small bursts on bells, auto-fit camera with a ±1% breathing zoom over 10 s.
- Mood palettes as CSS variables (SPEC §7.1). Reduced motion = no sway, no drift, fades only. Never flash more than 3 times per second.

Use the Playwright MCP to screenshot at 1440×900 and 390×844 at 5 s, 30 s and the end of the default piece. Critique your own screenshots against SPEC §7 and fix the three weakest things before you finish. Report average fps from a 10-second performance trace. Commit.
```

### Phase 7: Relaxation UX layer \[PLAN\] · target 10:30–13:30

```
/plan Implement SPEC §8 (relaxation UX and accessibility) on top of the working engine. Load the calm-ux and frontend-design skills first and read SPEC §7.1 (design tokens). First read docs/STATUS.md if it exists.

Build in this order, verifying each step in the browser before starting the next:
1. App shell: full-bleed canvas; floating glass TransportBar (play/pause, new seed, Wander/Bloom, time with a depth-skyline placeholder, volume, Keep); top bar (logo, help, zen, fullscreen); ControlDrawer (right on desktop, bottom sheet on mobile) with tabs World · Sound · Atmosphere · Session.
2. Five mood chips that crossfade sound, palette and ambience over 3 s.
3. Parameter controls generated from each world's ParamSpec: Radix sliders with visible labels, value text with units, the plain-language help text, regenerate after a 400 ms debounce with a 2 s crossfade.
4. Atmosphere mixer (rain, ocean, wind, stream, crickets, fire) and a reverb "space" control.
5. Session tools: breathing companion (4 s in, 6 s out), sleep timer (15/30/60 min, 60 s fade), mono audio, reduce motion, in-key UI sounds (off by default), keyboard shortcuts on/off.
6. First-visit onboarding (3 short cards, skippable, remembered), help overlay with shortcuts (?), polite toasts (aria-live), and an error boundary with a calm "Replant" recovery.
7. Share link (URL hash codec in src/core/url.ts) and "Your garden" (up to 24 saved seeds in localStorage with thumbnail, rename, delete).

Follow WCAG 2.2 AA as SPEC §8.4 lists it. After each step take Playwright MCP screenshots (desktop + mobile) and fix what looks wrong. Finish with a keyboard-only run through the whole flow and report anything you could not reach. Commit after each step.
```

### Phase 8: Make recursion visible · target 14:00–15:00

```
Implement SPEC §4.4 and §5.5:
1. Recursion lens: the live call stack as indented frames like `branch(depth 3, len 0.37, θ 102°)`, synced to playback via the event bus; counters for calls, current depth and max depth; collapsible. It is visual only; on pause, announce a one-sentence summary to screen readers.
2. Code view: the world's codeSnippet with the executing line highlighted (call → note, base case → bell, return → resolution).
3. Depth skyline: the score's depth over time as a stepped silhouette under the transport bar, with playhead, click-to-seek and keyboard seek.
4. Wander vs Bloom toggle (if Bloom is not finished, finish it now) with a one-line explanation and a 2 s crossfade between modes.
5. A "How it works" panel: the mapping table from SPEC §5.3 and three plain sentences about recursion.
Screenshot desktop and mobile, verify, commit.
```

### Phase 9: More worlds · target 15:00–16:00

```
Add World 2, "L-System Garden", per SPEC §4.2 and §5.7, only through the WorldDefinition interface (no special cases in audio or export code): recursive expand(), turtle interpretation, the six presets, a rule editor with validation, the iteration clamp, its own renderer and music mapping. Tests: expansion determinism, bracket balance, segment cap.
Then, only if every Must is verified and it is before 15:30 GMT+6, add World 3, "Hanoi Music Box", per SPEC §4.3 and §5.7. Commit after each world.
```

### Phase 10: Accessibility and performance · target 16:00–17:00

```
Use the a11y-auditor agent to audit the whole app: every panel open and closed, every world, desktop and mobile, reduced motion on and off. Fix every serious or critical axe violation and every keyboard trap it reports.
Then performance on the production build (npm run build && npm run preview): bundle size report, memory across 10 regenerations, fps on the deepest allowed tree, first load time.
Targets: axe 0 serious/critical, 60 fps desktop, no memory growth, initial JS under 400 KB gzipped. Commit.
```

If fixes drag on: `/goal axe reports 0 serious or critical violations on every screen state and npm run verify passes`

### Phase 11: Judge and polish sprint · target 17:00–18:30

First run the independent review:

```
/judge
```

Then:

```
Fix the items from the rubric-judge report in order of points gained per minute. Stop at 18:30 GMT+6 (feature freeze). After each fix: verify, screenshot if visual, commit. Then run the rubric-judge agent again and show me the before/after scores per rubric line.
```

### Phase 12: Release · target 18:30–20:00

```
Feature freeze. Prepare the submission per SPEC §12:
1. README.md following SPEC §12.2: hero image, live demo link, a video link placeholder, the brief's six mandatory deliverables and where each lives in the app, the recursion → music mapping table, an architecture mermaid diagram, how to run and test, the accessibility statement, research-backed design notes, credits and licences, and an AI-usage section linking ai-logs/INDEX.md.
2. scripts/render-samples.mjs: render 3 songs (Dawn Mist, Rain Garden, Temple) with Playwright into samples/ as MP3 + cover PNG, and list their share links in samples/README.md.
3. docs/ARCHITECTURE.md and CREDITS.md (fonts, Tone.js, @tonejs/midi, lamejs (LGPL), any Pixabay or VSCO sounds).
4. Run npm run logs:collect and confirm ai-logs/INDEX.md lists every session.
5. Final checks on the deployed GitHub Pages URL (not localhost): Begin, play, export WAV, share link, mobile viewport.
6. Tag v1.0.0 and push.
Report anything that is not perfect.
```

You then record the 2–3 minute demo video (script in the build plan), add its link to the README, run `npm run logs:collect` one last time, commit, push, and submit by 21:00.

## Feedback templates

Use these between phases. Specific feedback gets specific fixes; "make it better" gets random changes.

### Listening feedback

```
Listening feedback, mood <mood>, seed <seed>, mode <Wander/Bloom>, headphones:
- What I liked: …
- Problems (use the words from the sound-design skill's feedback table where possible): …
- Moment(s): at 0:42 …, at 1:30 …
Translate each problem into specific parameter changes using the sound-design skill, change only those, and tell me exactly what to listen for on the next pass.
```

### Visual feedback

```
Visual feedback (screenshot attached / at <viewport>): …
Too <busy/dim/bright/fast/static/cramped> at <where>. Keep <what I like>.
Make the changes, screenshot the same view at 1440×900 and 390×844, and compare before/after.
```

### Bug report

```
Bug: <steps to reproduce> → expected <x>, got <y>. Console: <errors, if any>.
Reproduce it with the Playwright MCP first, write a failing test where possible, fix the root cause, verify, commit.
```

### Behind schedule

```
It is <time> GMT+6 and we are behind. Read docs/SPEC.md §3 and docs/STATUS.md. List every remaining Must and Should with an estimate in minutes, then propose a cut list that gets every Must verified and deployed by 18:30. Wait for my OK before changing code.
```

### Something broke

```
The app broke after the last change: <symptom>. Run git log --oneline -10 and git diff HEAD~1 --stat, find the cause, and fix it with the smallest change. If a fix is not clear within 10 minutes, revert the last commit and tell me.
```

Claude Code's `/rewind` (Esc Esc) can also restore code and conversation to an earlier checkpoint.

## AI logs that cannot disqualify you

The rules require your full prompt chain and the agent's response to every prompt, and missing logs may disqualify you. The kit records everything automatically, in layers that do not depend on each other, so one failure costs nothing.

| Layer | What it captures | When |
| --- | --- | --- |
| Hooks → `ai-logs/PROMPT_LOG.md` and `prompt-log.jsonl` | every prompt word for word, Claude's final response, files changed, commands run, subagent results | live, on every turn |
| Raw transcripts → `ai-logs/transcripts/` | Claude Code's own JSONL, including every tool call and subagent | after every turn and at session end |
| `npm run logs:collect` → `ai-logs/sessions/` and `INDEX.md` | readable transcripts of every session for this repo, even ones from before the hooks worked | before each push in the final hours, and before submitting |
| Planning → `ai-logs/00-planning/` | this conversation: your original prompt, the plan and the kit | add it by hand (see below) |

I tested the hook against simulated Claude Code events: prompts with code blocks, missing fields, malformed input, and 20 prompts fired concurrently from two sessions (no lost or duplicate numbers). I also tested the collector against a fake transcript store. One thing I could not test here is a live Claude Code session, which is why setup step 4.5 is a one-line smoke test.

### Rules

- Paste prompts in full. The log records exactly what you send.
- Never edit or delete anything in `ai-logs/`. The kit's permissions stop Claude from editing it too.
- After the first prompt, open `PROMPT_LOG.md` and confirm the entry is there. Glance at it after each phase.
- Commit `ai-logs/` with every push.
- If you use any other AI tool (a quick ChatGPT question, an image generator for the logo), paste its prompt and answer into `ai-logs/other-tools/`. Being open about it is safer than a gap.
- Add this planning chat: the updated kit already includes this plan as `ai-logs/00-planning/BUILD_PLAN.md`; paste this chat's share link into `planning-session.md`.
- Never put API keys or passwords in a prompt; the logs are public.

## QA checklist

Nothing counts as done until it works on the deployed URL in a fresh browser. Tick these at the times shown.

### After every phase

- [ ] `npm run verify` passes and CI is green on GitHub
- [ ] No console errors after Begin and 5 seconds of playback
- [ ] Screenshots at 1440×900 and 390×844 look right
- [ ] `ai-logs/PROMPT_LOG.md` has this phase's prompts and responses
- [ ] Committed and pushed

### Before you sleep (about 04:30)

- [ ] A full piece plays from Begin to the final chord without clicks
- [ ] WAV and MIDI export download, and the WAV plays in a normal media player
- [ ] The live GitHub Pages URL works

### Sound (with headphones, then phone speakers)

- [ ] Every mood is calm for 5 minutes: no harsh, muddy or busy passages
- [ ] Phrases breathe and the piece ends on the home chord
- [ ] Mood changes and regenerations crossfade with no jumps in volume
- [ ] `npm run audio:qa` passes for every mood

### Accessibility and devices

- [ ] Keyboard-only: Begin, play, change mood, change depth, export, close everything
- [ ] Reduced motion on: no sway, drift or zoom
- [ ] axe end-to-end test: zero serious or critical issues
- [ ] Chrome and Firefox on desktop; Chrome on Android or Safari on iPhone (with the silent switch on)

### Final, on the deployed URL (19:30–20:30)

- [ ] All six mandatory deliverables work in a private window
- [ ] Share link reopens the same tree and song
- [ ] README links (demo, video, logs) all open
- [ ] `npm run logs:collect` run, `ai-logs/INDEX.md` lists every session, planning session added
- [ ] Tag `v1.0.0` pushed

## Submission, README and demo video

Submit by 21:00, an hour before the 22:00 deadline. The submission link arrives at 12:00 on Thursday; check the announcement channel then and save the form.

### What to submit

- [ ] Public GitHub repo link
- [ ] Live demo link (GitHub Pages)
- [ ] Demo video link (2–3 minutes, unlisted YouTube or Google Drive)
- [ ] Deliverables in the repo: `samples/` (3 songs as MP3 with cover art and share links), README, `LICENSE` (MIT), `CREDITS.md`
- [ ] AI prompt logs: `ai-logs/` with `PROMPT_LOG.md`, `transcripts/`, `sessions/`, `INDEX.md` and `00-planning/`
- [ ] Tag `v1.0.0`, then take a screenshot of the form confirmation

### README outline (judges read this first)

1. Hero GIF of the tree growing, the one-line pitch, and big **Live demo** and **Video** links.
2. The idea: the recursion-to-music mapping table and one paragraph.
3. The brief's six mandatory deliverables, each with where it lives in the app.
4. Features grouped by rubric line.
5. How it works: the architecture diagram (trace → score → audio, export, visuals).
6. Run, test, build and deploy commands.
7. Accessibility statement (the WCAG 2.2 AA measures).
8. Research-backed design choices, with the two citations from the sound design section.
9. Credits and licences.
10. AI usage: tools, the method, and a link to `ai-logs/INDEX.md`.

### Demo video script (about 2:30)

| Time | On screen | Say |
| --- | --- | --- |
| 0:00–0:10 | Landing, then click Begin; the drone fades in | "What if you could hear recursion?" |
| 0:10–0:40 | The tree grows; the recursion lens and code view follow along | "Seedsong runs one recursive function, branch(), and turns its call tree into music. The trunk is the drone, boughs are chords, branches are the melody, leaves ring as bells, and every return resolves a phrase." |
| 0:40–1:05 | Toggle Wander and Bloom | "Depth-first wanders like a melody. Breadth-first blooms like chords." |
| 1:05–1:30 | Change depth and spread, then switch to Rain Garden | "Every seed is a different song, and the same seed always gives the same song, so you can share it." |
| 1:30–1:50 | Breathing companion, zen mode, sleep timer | "It is built to calm you down, not to show off." |
| 1:50–2:10 | Keep this song: export WAV and MIDI, cover art; play the file | "Your song renders offline through the same instruments you just heard." |
| 2:10–2:25 | Keyboard-only use, reduced motion, tests passing in CI | "Accessible, tested and deployed." |
| 2:25–2:30 | Title card with the URL | "Make recursion audible. Seedsong." |

Record at 1080p with system audio (OBS, or Win+G on Windows). Do a test take first to check the audio is captured, and add captions so the video also works on mute.

## Risks and fallbacks

Most hackathon losses come from a few predictable failures. Each has a prevention built into the plan and a fallback if it happens anyway.

| Risk | Prevention | If it happens anyway |
| --- | --- | --- |
| Silent or dry WAV export | await the reverb's `ready` inside `Tone.Offline`; the e2e test checks the file's loudness | demo with live session recording; MIDI export still works |
| No sound on iPhone with the silent switch on | set `navigator.audioSession.type = 'playback'` on Begin (iOS 17+) | looping silent `<audio>` element; demo on desktop |
| Music sounds random or harsh | scale degrees, density cap, mix chain, listening checkpoints | run the music-director agent and the feedback table; make Dawn Mist the default |
| Canvas stutters on deep trees | 2,047-node clamp, strokes batched per depth, rendering paused when hidden | lower the default depth to 6; drop the glow pass on mobile |
| Clicks, pops or memory leaks after regenerating | ramps everywhere, release before dispose, test 10 crossfades | rebuild the whole rack on Replant |
| Blank page on GitHub Pages | Vite `base` set from the repo name; live URL checked in Phase 1 | deploy the same build to Netlify or Vercel |
| Usage limit mid-build | Sonnet for light phases, `/clear` between phases, sleep through the reset | wait for the reset or continue on Sonnet; log any other tool by hand |
| A gap in the AI logs | hooks + raw transcripts + `logs:collect`, smoke test at setup | rebuild from `~/.claude/projects` with `npm run logs:collect` |
| Running late | Musts first, feature freeze at 18:30, the behind-schedule prompt | cut in this order: Hanoi, video export, PWA, Bangla, L-System rule editor |
| The scaffold deletes the kit | Phase 1 scaffolds into `_scaffold/` and merges; the kit is committed first | restore from git |
| Laptop or internet failure | push after every phase | continue on any machine; the live URL stays up |
| Tired judgement at 3 a.m. | 5 hours of sleep; the overnight goal only does safe hardening | trust `/judge` and the checklists over gut feel |
