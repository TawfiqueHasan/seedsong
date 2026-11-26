# Seedsong: Recursive Soundscapes (Hub's Quest Epoch 1)

Solo 24-hour hackathon build. Hard deadline: **Thu 26 Nov 2026, 22:00 GMT+6**. Feature freeze: **18:30 GMT+6**.
Seedsong is a browser app where a recursive function grows a glowing fractal tree and the call tree itself becomes relaxing music.
The full product and technical spec is `docs/SPEC.md`. Read the section a task names before you start it. The official rubric and what a 10/10 looks like are in `docs/RUBRIC.md`.

## How we are judged (optimise in this order)

| Weight | Criterion | What it means for every decision |
| --- | --- | --- |
| 35% | Relaxation & UX | a calm first minute, no harsh sound or motion, frictionless controls, mobile works |
| 25% | Musical quality | notes locked to the scale, voice-led chords, soft timbres, a real mix (limiter, about -16 to -18 LUFS), real musical form |
| 15% | Creative use of recursion | the call tree IS the musical form; recursion is visible (lens, code view, skyline) and audible (Wander/Bloom) |
| 10% | Visual design | bioluminescent tree, one coherent token system, 60 fps |
| 10% | Interaction & usability | moods, clear labels, keyboard shortcuts, share links |
| 5% | Technical execution | tests, CI, deploy, reliable export, clean architecture |

Mandatory deliverables (all must work in the deployed build): configurable recursion, interactive visualization, procedural music from the recursion, UI controls + playback, audio export, and a polished, accessible, relaxing experience.

## Stack (ask before changing)

Vite 8 + React 19 + TypeScript 7 (strict) · Tone.js 15 · Canvas 2D · plain CSS design tokens (`src/styles/app.css`) with native accessible elements · Zustand · Lucide icons · Fontsource fonts (Fraunces, Manrope, JetBrains Mono) · @tonejs/midi · @breezystack/lamejs (MP3 worker) · Vitest 5 · Playwright + @axe-core/playwright (Microsoft Edge locally, Chromium in CI) · oxlint · GitHub Actions → GitHub Pages.

The build is DONE and verified (see README.md "Quality evidence" and `docs/DECISIONS.md` for every deviation from the spec: no Tailwind/Radix/Motion, no compose worker, dip-crossfade, a custom offline render loop). Work from here is polish, listening feedback and fixes, not re-scaffolding.

If `node` is not on PATH on the build machine, a portable Node install lives in the user's home folder under `nodejs-portable/`; prepend its folder to PATH for the command.

- Keep the create-vite defaults (oxlint, TypeScript 7). Do NOT add ESLint or typescript-eslint; typescript-eslint does not support TypeScript 7 yet.
- Tone.js v15: use `getTransport()`, `getDestination()`, `getDraw()`, `getContext()`. Never use the deprecated `Tone.Transport`, `Tone.Destination`, `Tone.Draw` or `Tone.context`.
- Unsure about a library API? Check Context7 (MCP) or the typings in `node_modules`. Never guess an API.
- Verify package versions with `npm view <pkg> version` before adding them.

## Commands

- `npm run dev` / `npm run build` / `npm run preview`
- `npm run verify`: typecheck + lint + unit tests + build. It must pass before every commit.
- `npm run test` (Vitest) · `npm run test:e2e` (Playwright: smoke, export, a11y)
- `npm run audio:qa`: renders reference seeds offline and checks peak, loudness and silence
- `npm run logs:collect`: copies every Claude Code transcript for this repo into `ai-logs/`

## Architecture rules

- One source of truth: `RecursionTrace` (pure) → `Score` (pure) → { live playback, offline export, MIDI, visuals }. Visuals and export never re-derive music.
- `src/core/**` is pure TypeScript: no DOM, no Tone.js, no React. It is deterministic for a given (params, seed) and fully unit-tested.
- `src/audio/**` owns Tone.js. ONE rack factory, `createRack(context, mood)`, serves BOTH live playback and `Tone.Offline` export.
- `src/viz/**` owns canvas rendering. It never schedules audio; it reacts to note events the scheduler emits through `getDraw()`.
- `src/ui/**` holds React components; state lives in `src/state` (Zustand). No business logic in components.
- Randomness only from the seeded PRNG in `src/core/random.ts`. `Math.random` is banned outside tests.
- New recursion worlds plug in through the `WorldDefinition` interface. Never special-case a world in audio or export code.

## Definition of done (every task)

1. `npm run verify` passes, and new logic has tests.
2. UI change: open the app with the Playwright MCP, take screenshots at 1440×900 and 390×844, fix what looks off, and confirm zero console errors.
3. Audio change: tell the user exactly what to listen for. They are the ears; you cannot hear.
4. Accessibility: keyboard reachable, visible focus, real labels, `prefers-reduced-motion` respected, nothing flashes more than 3 times a second.
5. Commit in small steps with conventional messages (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`).
6. End every turn with: what changed · how to see or hear it · known issues · the next step.

## Relaxation rules (never break)

- No sudden loud sounds. Every start, stop and change ramps: at least 50 ms against clicks, 1–3 s for scene changes. Master limiter at -1 dBTP.
- Notes are always quantised to the active scale. Default tempo 58–72 BPM (raised from 48–64 after listening feedback that it felt slow). At most about 4 notes per second.
- Motion is slow: ambient loops last 6 s or longer, UI transitions 200–400 ms, no bounce, no shake, no flashing.
- Copy is short, warm and in the second person. No exclamation marks and no emoji in the UI.

## Scope discipline

Follow the MoSCoW list in `docs/SPEC.md` §3. Never start a Could before every Must is done and verified. Ask before adding a dependency that is not listed above. After 18:30 GMT+6 only fixes, docs and polish.

## AI logging (missing logs can disqualify us)

Hooks in `.claude/settings.json` log every prompt and response to `ai-logs/`. Never delete, rewrite or move anything in `ai-logs/`, and never disable or edit the hooks. If `ai-logs/.hook-errors.log` gains entries, tell the user immediately.

## Project skills and agents

- Skills: `verify` (runs before every commit), `sound-design` (music theory, Tone.js recipes, mixing), `calm-ux` (relaxation UX, motion, WCAG 2.2 AA), `/judge` (rubric review in a forked agent).
- Agents for independent review: `rubric-judge`, `a11y-auditor`, `music-director`. Use them after each major phase; do not grade your own work.
