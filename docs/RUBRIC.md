# Official rubric (Hub's Quest Epoch 1, "Recursive Soundscapes")

Source: the challenge brief PDF. Solo, 24 hours, any AI coding agent allowed, but the repo must contain the full prompt chain and the agent's response to each prompt.

## Mandatory deliverables (all six must work in the deployed build)

1. A functional recursive algorithm with configurable parameters.
2. An interactive simulation or visualization.
3. A procedural music-generation system that uses the recursive process.
4. A user interface with parameter controls and audio playback.
5. A working audio export feature.
6. A polished, accessible experience designed around relaxation and enjoyment.

Guiding principle from the brief: "Make recursion audible. Make simulation beautiful. Make the experience relaxing."

## Scoring weights and what a 10/10 looks like

| Criterion | Weight | 10/10 looks like | Common ways to lose points |
| --- | --- | --- | --- |
| Relaxation & user experience | 35% | Within 10 seconds a stranger feels calmer. One tap to a finished piece. Nothing startles: fades everywhere, soft colours, slow motion. Works on a phone. Breathing, zen and sleep-timer tools feel native. | Abrupt starts or stops, clicks, loud peaks, busy UI, walls of sliders up front, tiny targets, broken mobile layout, jargon |
| Musical quality | 25% | Sounds like intentional ambient music: consonant harmony that moves, a melody with shape, phrases that breathe and resolve, warm timbres, a clean mix, no fatigue after 10 minutes. | Random pitches, out-of-key notes, square-wave harshness, mud in the low end, too many notes, no form, clipping |
| Creative use of recursion | 15% | The recursion's structure is audibly the musical structure (form, phrases, cadences on returns). Users can see which call is playing and hear depth-first vs breadth-first. More than one recursion. | Recursion only used to produce a list of numbers mapped to pitch; recursion invisible in the UI |
| Visual design | 10% | A coherent, distinctive look (tokens, type, palette per mood); the simulation is beautiful and synced to sound; 60 fps. | Generic template look, default component styling, desync, jank, flashing |
| Interaction & usability | 10% | Obvious controls with plain-language help, presets, keyboard shortcuts, shareable seeds, undo-safe changes, helpful empty and error states. | Unlabelled sliders, hidden features, no feedback on long actions (export), lost settings |
| Technical execution | 5% | Clean architecture, tests and CI, deployed demo, reliable export, no console errors, good performance, clear README. | Crashes, export that fails or is silent, memory leaks, no README |

## Self-check before submitting

- [ ] All six mandatory deliverables work on the deployed URL in a fresh browser profile.
- [ ] First minute: Begin → drone fades in → tree grows in sync → piece resolves. No console errors.
- [ ] Every mood sounds calm and consonant for 5 minutes on headphones and on phone speakers.
- [ ] Export WAV and MIDI work; the files open in a normal player or DAW.
- [ ] Keyboard-only run-through works; axe reports 0 serious/critical violations; reduced motion works.
- [ ] README has the live link, video link, mapping table, deliverables list, credits and AI-usage section.
- [ ] `ai-logs/` contains PROMPT_LOG.md, transcripts for every session, INDEX.md and the planning session.
