# Build decisions (and where they differ from the spec)

The spec (`docs/SPEC.md`) was written before any code. These are the places the build deliberately differs, and why.

| Spec | Build | Why |
| --- | --- | --- |
| Tailwind CSS 4 + Radix UI + Motion | Plain CSS with design tokens (`src/styles/app.css`), native elements (`<input type="range">`, `<dialog>`, `role="tablist"`), CSS animations | Fewer moving parts in a 24-hour build, a smaller bundle (181 KB gzipped JS), and native controls are accessible by default (keyboard, focus trap, `aria-valuetext`). The visual token system from SPEC §7.1 is unchanged. |
| `compose.worker.ts` (generate + compose off the main thread) | Main thread | The largest tree (2,047 nodes) generates and composes in about 8 ms, well under the 50 ms budget, so a worker adds complexity for no gain. |
| Visual sync via `getDraw().schedule()` events | The renderer reads the audible transport time every frame and derives growth, highlights and blossoms from the Score | Same audio clock, no drift, and seeking or pausing needs no event replay. The renderer still never schedules audio. |
| Pause by stopping the transport | Pause fades out, then suspends the AudioContext | Every envelope and the transport freeze exactly where they are, so resuming is seamless (no re-triggering). |
| Crossfade two racks on regenerate | Dip-crossfade: fade out 1.1 s, swap, fade in 1.6 s | Half the CPU, and it still never cuts. Mood changes build the new rack before the old one is released, and old racks are disposed after their reverb tails. |
| `Tone.Offline()` for export | A hand-built `OfflineContext` with the same steps | Tone's clock loop yields with `setTimeout` once per second of audio, which background tabs throttle to about 1 s per yield. This loop yields with a `MessageChannel`, and `OfflineAudioContext.suspend()` checkpoints give a real progress bar. |
| Reverb decay 9 s, pad `fattriangle` × 3 | Decay 7 s, × 2 | Offline rendering was dominated by these nodes; this keeps the sound lush and makes export noticeably faster. |
| Hanoi Music Box (Could) | Not built | Two recursions (Grove and L-System) cover “more than one recursion”; time went to sound, UX and tests instead. |
| L-System presets include Koch, Dragon, Sierpinski, Hilbert | Branching plants only (Fern, Willow, Sprig, Reed, Bush, Lantern) | The music is built from the bracket tree (`[` = call, `]` = return). Curves without brackets have no branching structure, so they would be one long phrase. “Garden” plants keep the mapping honest. |

## Timing safety (a bug found by the e2e tests)

When the song regrows, notes from the old transport that were already handed to the audio graph (inside the 0.12 s look-ahead) can still start after the new transport begins. A voice could then receive a start time earlier than one it already had, and Tone throws. The engine now releases voices and restarts the transport only after the look-ahead window (`settled()`, `startOffset` in `src/audio/engine.ts`).

## Listening feedback round 1 (26 Nov): "a glitch in the music" and "it feels slow"

An independent review (the kit's `music-director` agent) traced both reports to specific code. Changes:

| Problem | Cause | Fix |
| --- | --- | --- |
| Crackles and late notes | 'interactive' audio latency and a 0.12 s look-ahead: any main-thread pause over ~60 ms (canvas, React) made notes late | AudioContext with `latencyHint: 'playback'`, 0.2 s look-ahead, 30 ms update interval; the playhead subtracts output latency so visuals stay in sync |
| Fizzy, metallic bells | FM index 6 with sustained modulation, bells up to MIDI 88–90 | index 3, no modulation sustain, low-pass 4.5 kHz, bells capped at MIDI 84 |
| Buzz in Night Forest | square-wave LFOs hard-gating 4.3 kHz crickets (~60 clicks/s) | sine trill and a smoothed pulse |
| Beepy birds (Dawn Mist) | 70 ms pure sines up to 5.7 kHz | softer envelope, lower pitch range, 5 kHz low-pass, −4 dB |
| Ringing notes sliding left/right | shared panner moved quickly for each new note | narrower, slower pan glide |
| Double dips when changing mood then seed | crossfades queued, not merged | a generation counter skips stale crossfades |
| Feels slow | chords changed only every 44–55 s; 4-beat trunk intro; 6 s drone and 2.5 s pad attacks; tempos 48–60 | a new chord every 8+ beats inside long phrases (≈ every 6–8 s), 2-beat intro, 3 s / 1.2 s attacks, tempos 58–72 BPM, denser Bloom |

## Signature feature: step inside a call (26 Nov)

A subtree of a recursive function is itself a call of that function, so `subtreeTrace()` (`src/core/worlds/subtree.ts`) lifts any branch out as a full `RecursionTrace`: re-indexed, depth-shifted, sizes rescaled so the sub-song keeps full-length phrasing, and stood upright about its own base so the branch becomes the new trunk. The composer, audio, export, MIDI and visuals need no changes: a sub-call is just another trace. `originIds` map nodes back to the whole tree, so nested steps and share links (`f=` in the URL) work. Only branches with at least two levels below them can be entered, so every step gives a real piece of music. The renderer adds picking (nearest grown segment), a glow over the hovered sub-call and the live call path (trunk → running branch, one bead per frame).
