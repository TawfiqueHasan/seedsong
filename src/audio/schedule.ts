import type * as Tone from 'tone';
import type { Rack } from './rack';
import type { Score } from '../core/music/score';

type Transport = ReturnType<typeof Tone.getTransport>;

/**
 * Schedule every note and pad chord of a score on a transport (live or offline).
 * Audio is always triggered with the `time` the transport passes in — never from timers.
 */
export function scheduleScore(transport: Transport, rack: Rack, score: Score, from = 0): void {
  for (const note of score.notes) {
    if (note.time < from - 1e-6) continue;
    transport.schedule((time) => rack.play(note, time), note.time);
  }
  for (const chord of score.chords) {
    if (chord.time < from - 1e-6) continue;
    transport.schedule((time) => rack.playChord(chord, time), chord.time);
  }
}
