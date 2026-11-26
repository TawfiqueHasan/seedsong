import type { WorldId } from '../worlds/types';
import type { MoodId } from './moods';
import type { ScaleId } from './theory';

export type Voice = 'drone' | 'pad' | 'lead' | 'ornament' | 'bell' | 'bass';
export type Mode = 'wander' | 'bloom';

export interface ScoreNote {
  /** seconds from 0 */
  time: number;
  /** seconds */
  duration: number;
  midi: number;
  /** 0..1 */
  velocity: number;
  /** -1..1 */
  pan: number;
  voice: Voice;
  nodeId: number;
  depth: number;
}

export interface ScoreChord {
  time: number;
  duration: number;
  midis: number[];
  symbol: string;
}

export interface ScoreEvent {
  time: number;
  kind: 'call' | 'return' | 'cadence' | 'section';
  nodeId: number;
  depth: number;
}

export interface NodeTiming {
  /** when the branch starts growing (seconds) */
  start: number;
  /** how long it takes to grow */
  grow: number;
  /** true if the node has its own audible note */
  sounding: boolean;
}

export interface Score {
  version: 1;
  seed: string;
  worldId: WorldId;
  moodId: MoodId;
  mode: Mode;
  bpm: number;
  key: string;
  scale: ScaleId;
  /** seconds until the final chord has finished (the tail rings after this) */
  duration: number;
  /** seconds of reverb/drone tail after `duration` */
  tail: number;
  notes: ScoreNote[];
  chords: ScoreChord[];
  events: ScoreEvent[];
  nodeTimes: NodeTiming[];
  stats: { noteCount: number; nodeCount: number; maxDepth: number; droppedForDensity: number; thinned: number };
}

export const totalLength = (s: Score) => s.duration + s.tail;
