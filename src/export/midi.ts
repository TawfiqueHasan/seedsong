// MIDI export: one track per voice, tempo and track names, so musicians can open it in a DAW.

import { Midi } from '@tonejs/midi';
import type { Score, Voice } from '../core/music/score';

const TRACKS: Array<{ voice: Voice | 'pad'; name: string; channel: number; program: number }> = [
  { voice: 'drone', name: 'Drone (trunk)', channel: 0, program: 89 },
  { voice: 'pad', name: 'Pad (phrases)', channel: 1, program: 88 },
  { voice: 'bass', name: 'Bass (roots)', channel: 2, program: 32 },
  { voice: 'lead', name: 'Lead (branches)', channel: 3, program: 4 },
  { voice: 'ornament', name: 'Ornaments (twigs)', channel: 4, program: 108 },
  { voice: 'bell', name: 'Bells (leaves)', channel: 5, program: 14 },
];

export function scoreToMidi(score: Score, title: string): Uint8Array {
  const midi = new Midi();
  midi.name = title;
  midi.header.setTempo(score.bpm);
  for (const t of TRACKS) {
    const track = midi.addTrack();
    track.name = t.name;
    track.channel = t.channel;
    track.instrument.number = t.program;
    if (t.voice === 'pad') {
      for (const c of score.chords) for (const m of c.midis) track.addNote({ midi: m, time: c.time, duration: c.duration, velocity: 0.5 });
    } else {
      for (const n of score.notes) if (n.voice === t.voice) track.addNote({ midi: n.midi, time: n.time, duration: n.duration, velocity: n.velocity });
    }
  }
  return midi.toArray();
}
