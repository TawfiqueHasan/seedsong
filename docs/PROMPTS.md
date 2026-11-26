# Seedsong prompt chain

Paste these into Claude Code in order. Every prompt is logged automatically to `ai-logs/` by the hooks, so paste the full text rather than paraphrasing; the judges will read exactly what you sent.

## Rules for every phase

1. **One phase per context.** Run `/clear` before each new phase. CLAUDE.md, the spec and the plan files carry the context; a fresh window keeps quality high.
2. **Plan first for big phases.** Phases marked **[PLAN]** start in plan mode (`/plan …` or Shift+Tab until it says plan mode). Read the plan, correct it, then approve.
3. **Let it work, then check.** Switch to *accept edits* (Shift+Tab) during implementation. Do not approve anything that touches `ai-logs/` or `.claude/hooks/`.
4. **You are the ears and eyes.** After every audio or visual phase, listen with headphones and look on your phone. Send feedback with the templates at the end of this file.
5. **Commit every green phase.** The `verify` skill runs before each commit. Push after every phase so CI deploys a live build.
6. **Watch usage.** Run `/usage` between phases. Above about 70% of your window, switch to `/model sonnet` for the lighter phases listed below.

| Phase | Model | Effort | Mode |
| --- | --- | --- | --- |
| 0 Architecture | `/model best` (Fable where your plan has it, otherwise Opus) | xhigh | plan |
| 1 Scaffold | opus | high | accept edits |
| 2 Recursion engine | opus | high | accept edits |
| 3 Composer | best | xhigh | plan → accept edits |
| 4 Audio engine | best | high | accept edits |
| 5 Export | opus | high | accept edits |
| 6 Visualizer | opus | high | accept edits |
| 7 Relaxation UX | best | high | plan → accept edits |
| 8 Recursion visible | opus | high | accept edits |
| 9 Extra worlds | opus or sonnet | high | accept edits |
| 10 A11y + performance | opus | high | accept edits |
| 11 Judge + polish | opus | high | accept edits |
| 12 Release | sonnet | medium | accept edits |

Set effort with `/effort high` (or `xhigh`). Optional: `/advisor opus` while running Sonnet gets a stronger second opinion at key moments.

---

## Phase 0: Architecture [PLAN] · target 00:00–00:25

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

## Phase 1: Scaffold, CI, deploy · target 00:25–01:00

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

## Phase 2: Recursion engine · target 01:00–01:30

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

## Phase 3: Composer [PLAN] · target 01:30–02:30

```
/plan Implement SPEC §5 (the composer) in src/core/music. Load the sound-design skill first.

- theory.ts: the scales in SPEC §5.2, degree ↔ MIDI helpers, a chord builder, and voice-leading (choose the inversion and octave with the smallest total movement from the previous chord).
- moods.ts: the five moods in SPEC §6.1 (musical fields only: root, scale, bpm range, progression, registers, density).
- compose.ts (+ wander.ts, bloom.ts, density.ts): composeScore(trace, music, mode) implementing the fractal form of SPEC §5.3, Wander (§5.4) now and Bloom (§5.5) as a second mode, the dynamics envelope, the density cap, seeded humanisation, cadences on depth-2 returns, the final resolution to the tonic, and ScoreEvents for visual sync.

Tests: every note's pitch class is in the active scale (except Lydian passing notes on weak beats); notes per second never exceed the cap; the last chord is the tonic chord; Wander and Bloom order notes differently for the same trace; identical inputs give an identical score (snapshot one small seed); default params of every mood give 90 s–6 min; no NaN and no negative times.

Finally print a readable dump of the first 40 notes of the default Dawn Mist score (time, voice, note name, velocity) so I can check the melody shape by eye.
```

## Phase 4: Audio engine + live playback · target 02:30–03:30

```
Implement SPEC §6 (sound design) and the playback half of SPEC §10 in src/audio. Load the sound-design skill first and follow its Tone.js v15 rules.

- rack.ts: createRack(context, mood) builds every voice, the send effects (reverb, delay, chorus), the procedural ambience layers and the master chain (EQ → compressor → limiter at −1 dB). It must work unchanged inside Tone.Offline, because Phase 5 exports with it. Await reverb readiness.
- engine.ts: AudioEngine with unlock(), load(score, mood), play(), pause(), stop(), seek(seconds), setVolume(), setAmbience(layer, value), setMono(), crossfadeTo(score, mood) over 2 s, and dispose(). Every change ramps; no clicks.
- scheduler.ts + bus.ts: schedule ScoreNotes and ScoreChords on getTransport(); emit typed visual events through getDraw() onto an event bus.
- A dev-only /lab route with buttons to audition each voice, each mood's pad + lead, each ambience layer, and the full default score.

Check: no console errors, and no growth in live Tone.js nodes after 10 crossfades. Then STOP and give me a listening checklist: which /lab buttons to press, what each should sound like, and what to report back.
```

**Listening checkpoint 1 (you):** headphones on, go through the checklist, then send the listening-feedback template below. Repeat until it sounds calm and beautiful. This is the 25% musical-quality line; spend 20–30 minutes here.

## Phase 5: Export · target 03:30–04:30 (right after Phase 4)

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

## Before you sleep (optional, about 04:30)

Only if `/usage` shows plenty of room left. A goal does not change the permission mode, so first press Shift+Tab until you reach auto mode (if your Claude Code offers it) or *accept edits* (the kit's allowlist already covers npm and git commands). Then:

```
/goal npm run verify and npm run test:e2e both pass, src/core has at least 90% statement coverage, npm run audio:qa passes for all five moods, and docs/STATUS.md lists every Must and Should from SPEC §3 with its state (done / partial / missing) and the evidence. Do not add new features, do not change docs/SPEC.md, and stop after 30 turns.
```

If a usage limit hits overnight, the goal pauses and resumes when the limit resets.

Sleep 04:30–09:30. Usage windows refill while you sleep.

## Phase 6: Visualizer · target 09:30–10:30 (morning, fresh eyes)

```
Implement SPEC §7 for the Grove world in src/viz and connect it to the audio event bus. Load the calm-ux and frontend-design skills first.

- renderer.ts: Canvas 2D with devicePixelRatio scaling, resize handling, layered offscreen canvases (sky, tree, glow, particles), a 60 fps budget, and rendering paused while the tab is hidden.
- grove-renderer.ts: each branch grows over its note's duration (easeOutCubic); brightness follows velocity; leaves bloom as glowing blossoms on bell notes; gentle wind sway (6–10 s period, stronger with depth); strokes batched per depth level.
- particles.ts, camera.ts, sky.ts: ≤ 80 slow fireflies, small bursts on bells, auto-fit camera with a ±1% breathing zoom over 10 s.
- Mood palettes as CSS variables (SPEC §7.1). Reduced motion = no sway, no drift, fades only. Never flash more than 3 times per second.

Use the Playwright MCP to screenshot at 1440×900 and 390×844 at 5 s, 30 s and the end of the default piece. Critique your own screenshots against SPEC §7 and fix the three weakest things before you finish. Report average fps from a 10-second performance trace. Commit.
```

## Phase 7: Relaxation UX layer [PLAN] · target 10:30–13:30

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

## Phase 8: Make recursion visible · target 14:00–15:00

```
Implement SPEC §4.4 and §5.5:
1. Recursion lens: the live call stack as indented frames like `branch(depth 3, len 0.37, θ 102°)`, synced to playback via the event bus; counters for calls, current depth and max depth; collapsible. It is visual only; on pause, announce a one-sentence summary to screen readers.
2. Code view: the world's codeSnippet with the executing line highlighted (call → note, base case → bell, return → resolution).
3. Depth skyline: the score's depth over time as a stepped silhouette under the transport bar, with playhead, click-to-seek and keyboard seek.
4. Wander vs Bloom toggle (if Bloom is not finished, finish it now) with a one-line explanation and a 2 s crossfade between modes.
5. A "How it works" panel: the mapping table from SPEC §5.3 and three plain sentences about recursion.
Screenshot desktop and mobile, verify, commit.
```

## Phase 9: More worlds · target 15:00–16:00

```
Add World 2, "L-System Garden", per SPEC §4.2 and §5.7, only through the WorldDefinition interface (no special cases in audio or export code): recursive expand(), turtle interpretation, the six presets, a rule editor with validation, the iteration clamp, its own renderer and music mapping. Tests: expansion determinism, bracket balance, segment cap.
Then, only if every Must is verified and it is before 15:30 GMT+6, add World 3, "Hanoi Music Box", per SPEC §4.3 and §5.7. Commit after each world.
```

## Phase 10: Accessibility and performance · target 16:00–17:00

```
Use the a11y-auditor agent to audit the whole app: every panel open and closed, every world, desktop and mobile, reduced motion on and off. Fix every serious or critical axe violation and every keyboard trap it reports.
Then performance on the production build (npm run build && npm run preview): bundle size report, memory across 10 regenerations, fps on the deepest allowed tree, first load time.
Targets: axe 0 serious/critical, 60 fps desktop, no memory growth, initial JS under 400 KB gzipped. Commit.
```

If fixes drag on: `/goal axe reports 0 serious or critical violations on every screen state and npm run verify passes`

## Phase 11: Judge and polish sprint · target 17:00–18:30

First run the independent review:

```
/judge
```

Then:

```
Fix the items from the rubric-judge report in order of points gained per minute. Stop at 18:30 GMT+6 (feature freeze). After each fix: verify, screenshot if visual, commit. Then run the rubric-judge agent again and show me the before/after scores per rubric line.
```

## Phase 12: Release · target 18:30–20:00

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

---

## Feedback templates

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
