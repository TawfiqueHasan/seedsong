# Credits

## Libraries

| Library | Licence | Use |
| --- | --- | --- |
| [Tone.js](https://tonejs.github.io/) 15 | MIT | audio scheduling, synthesis, effects, offline rendering |
| [@tonejs/midi](https://github.com/Tonejs/Midi) | MIT | MIDI export |
| [@breezystack/lamejs](https://github.com/breezystack/lamejs) (a fork of lamejs) | LGPL-3.0 | MP3 encoding in a Web Worker; loaded as an unmodified, separate module |
| [React](https://react.dev/) 19 | MIT | UI |
| [Zustand](https://github.com/pmndrs/zustand) | MIT | state |
| [Lucide](https://lucide.dev/) | ISC | icons |
| [Vite](https://vite.dev/), [Vitest](https://vitest.dev/), [Playwright](https://playwright.dev/), [axe-core](https://github.com/dequelabs/axe-core), [oxlint](https://oxc.rs/) | MIT / Apache-2.0 / MPL-2.0 | build and tests |

## Fonts (self-hosted via Fontsource)

- Fraunces: SIL Open Font License 1.1
- Manrope: SIL Open Font License 1.1
- JetBrains Mono: SIL Open Font License 1.1

## Sound

Every sound in Seedsong (instruments, ambience, bells, birds, rain) is synthesised live in the browser with Tone.js. No recordings or samples are included.

## Algorithms and references

- Fractal tree recursion: classic `branch(length, angle, depth)` recursion.
- L-system plants: grammars adapted from Prusinkiewicz & Lindenmayer, *The Algorithmic Beauty of Plants* (1990).
- Karplus–Strong plucked-string synthesis (Karplus & Strong, 1983), via Tone.js `PluckSynth`.
- PRNG: `cyrb128` hash and `sfc32` generator (public domain, by bryc and Chris Doty-Humphrey).
- Relaxation research: Conrad et al., *medRxiv* preprint (2023); Hernández-Ruiz et al., *Psychology of Music* (2020).
