---
name: sound-design
description: Music theory, Tone.js v15 recipes, mixing targets and listening-feedback translation for Seedsong. Use whenever you touch src/core/music, src/audio or src/export, design a mood or patch, or turn the user's listening feedback into parameter changes.
---

# Sound design for Seedsong

The goal is relaxing ambient music that sounds intentional. You cannot hear the output, so follow these rules exactly and always tell the user what to listen for.

## Tone.js v15 rules

- Call `await Tone.start()` only inside a user gesture (the Begin button). On unlock, set `navigator.audioSession.type = 'playback'` when it exists (iOS plays even with the silent switch on).
- Use `getTransport()`, `getDestination()`, `getDraw()`, `getContext()`. Never use the deprecated `Tone.Transport`, `Tone.Destination`, `Tone.Draw` or `Tone.context`.
- Schedule with the `time` argument the Transport passes to callbacks: `getTransport().schedule((time) => synth.triggerAttackRelease(note, dur, time, vel), t)`. Never trigger audio from `setTimeout` or `requestAnimationFrame`.
- Visual sync: inside the scheduled callback, call `getDraw().schedule(() => bus.emit(evt), time)`.
- Every parameter change ramps: `param.rampTo(value, 0.05)` minimum, 1–3 s for scene changes. Fade masters in and out; never `stop()` a sounding voice without a release.
- `PolySynth`: set `maxPolyphony: 16`. Release all voices (`releaseAll(time)`) before disposing.
- Dispose everything you create (`node.dispose()`), including `Part`s and scheduled events (`transport.cancel()`), on regenerate and unmount. Check the live-node count after 10 crossfades.
- `Tone.Reverb` generates its impulse response asynchronously: `await reverb.ready` before playing or rendering. Changing `decay` or `preDelay` regenerates it; await `ready` again.
- `Tone.Offline(async ({ transport }) => { … }, seconds, 2, 44100)`: create the whole rack INSIDE the callback (nodes bind to the offline context), await reverb and sample readiness, schedule on the passed `transport`, then call `transport.start(0)`. The promise resolves to a `ToneAudioBuffer`; `.get()` gives the `AudioBuffer`.
- Load samples before rendering (`ToneAudioBuffers` or `Sampler` with `onload`); reuse decoded buffers between live and offline racks.
- `Tone.Recorder` records the live output (`getDestination().connect(recorder)`); `mimeType` depends on the browser (WebM/Opus in Chromium and Firefox, MP4/AAC in Safari).

## Music theory quick reference

- Work in scale degrees, not semitones. `degreeToMidi(deg, scale, rootMidi)` = `rootMidi + 12 * floor(deg / n) + scale[mod(deg, n)]` with n = scale length. Every melody note is in the scale by construction.
- Scales: majorPentatonic `[0,2,4,7,9]`, minorPentatonic `[0,3,5,7,10]`, yo `[0,2,5,7,9]`, lydian `[0,2,4,6,7,9,11]`, dorian `[0,2,3,5,7,9,10]`, aeolian `[0,2,3,5,7,8,10]`, ionian `[0,2,4,5,7,9,11]`.
- Pads use the 7-note parent scale for harmony (for example D major under D major pentatonic). Calm voicings: add9, sus2, sus4, maj7, m7, open fifths. Avoid minor seconds inside a voicing, and keep the bottom two notes at least a fifth apart below MIDI 52.
- Voice-leading: for each new chord, try every inversion and octave placement in the pad range (MIDI 48–72) and pick the voicing with the smallest summed movement from the previous voicing.
- Melody: mostly steps (1 degree), occasional leaps of 2–3 degrees followed by a step back. Chord tones on strong beats and at phrase starts and ends. No pitch repeated more than 3 times in a row. Range MIDI 60–84.
- Form: phrases of 2 or 4 bars, a cadence at each phrase end (a pad swell and one beat of rest), a final resolution to the tonic chord, and an 8–12 s tail.
- Tempo 48–64 BPM by default; the user's tempo slider runs 40–96 (a listening study found medium tempos of 80–100 bpm relaxing too). Density at most about 3.5 notes per second whatever the tempo; silence is part of the music.
- Humanise: onsets ±10–20 ms, velocity ±8%. Never quantise bells to the grid exactly.

## Mix targets

| Voice | Level | Notes |
| --- | --- | --- |
| Drone | -24 dB | root + fifth, 6 s attack, slow amplitude LFO |
| Pad | -18 dB | high-pass 150 Hz, low-pass 1.2–1.6 kHz with a slow LFO, chorus |
| Lead (keys, kalimba, pluck) | -12 to -15 dB | high-pass 180 Hz, gentle low-pass 4–5 kHz |
| Bells | -22 dB | high-pass 400 Hz, heavy reverb send |
| Bass (optional) | -20 dB | sine only, chord roots |
| Ambience layers | -24 to -34 dB | never louder than the pad |

- Sends: reverb decay 7–10 s, pre-delay 30–50 ms, low-cut 200 Hz on the return; delay `'4n.'`, feedback 0.25–0.35, wet 0.15–0.25.
- Master: EQ3 (high -3 dB) → Compressor (threshold -20, ratio 2.5, attack 30 ms, release 300 ms) → Limiter(-1).
- Targets: peak ≤ -1 dBFS, integrated loudness about -18 to -16 LUFS, no energy above 8 kHz that stands out, nothing panned harder than ±0.7.

## Turning listening feedback into changes

| The user says | Likely cause | Change |
| --- | --- | --- |
| harsh, tinny, piercing | FM index too high, bells too loud, too much top end | lower `modulationIndex`, low-pass the lead at 3–4 kHz, bells -3 dB, master high shelf -2 dB |
| muddy, boomy | low-mid build-up from pads and bass | high-pass pads at 150–180 Hz, drop the bass, low-cut the reverb return at 250 Hz |
| busy, cluttered, anxious | too many notes | lower `maxNotesPerSecond` to 2.5, drop ornaments, lengthen lead notes |
| boring, static, samey | harmony not moving, flat contour | make the progression advance every phrase, add register changes per section, vary step sizes |
| aimless, random | melody not anchored | snap phrase starts and strong beats to chord tones, reduce jitter-driven steps |
| thin, small | not enough sustain | pad +2 dB, add the drone, reverb decay +2 s, slight chorus |
| washy, blurry | too much reverb | reverb wet 0.25, decay 6 s, shorter bell release |
| clicks, pops | instant envelopes or parameter jumps | attack ≥ 5 ms, ramp every change ≥ 50 ms, fade starts and stops |
| too loud, tiring | loudness too high | master -2 dB, aim for -18 LUFS |
| lost on phone speakers | too little midrange | lead +2 dB, a small 1–2 kHz lift, less sub |
| robotic, mechanical | rigid timing | humanise ±15 ms, velocity spread ±10% |
| sad or dark when it should be calm | minor mode or low register | major pentatonic or Lydian mood, raise the lead register |
| ends abruptly | no outro | final cadence + 10 s tail + 3 s fade |

After every change, tell the user the exact mood, seed and moment to listen to, and what should now sound different.

## Export checklist

1. Render with the same `createRack()` used live, inside `Tone.Offline`.
2. Await reverb and sample readiness before `transport.start(0)`.
3. Length = score duration + tail. Apply a 3 s fade at the end.
4. Optional peak normalise to -1 dBFS; then dither to 16-bit (TPDF) or write 24-bit.
5. Verify in a test that the file is not silent (RMS above -45 dBFS) and the header length matches the data.
