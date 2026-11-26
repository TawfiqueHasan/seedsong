// The five moods. One tap sets scale, tempo, harmony, instruments, ambience and colour together.
// Pure data: the audio rack and the renderer read these fields.

import type { Chord, ScaleId } from './theory';

export type MoodId = 'dawn' | 'rain' | 'ocean' | 'forest' | 'temple';
export type LeadId = 'epiano' | 'kalimba' | 'glass' | 'harp' | 'koto';
export type AmbienceId = 'rain' | 'ocean' | 'wind' | 'stream' | 'crickets' | 'fire' | 'birds' | 'chimes';

export const AMBIENCE_LAYERS: { id: AmbienceId; label: string }[] = [
  { id: 'rain', label: 'Rain' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'wind', label: 'Wind' },
  { id: 'stream', label: 'Stream' },
  { id: 'crickets', label: 'Crickets' },
  { id: 'birds', label: 'Birds' },
  { id: 'fire', label: 'Fire' },
  { id: 'chimes', label: 'Chimes' },
];

export interface Palette {
  bg0: string;
  bg1: string;
  horizon: string;
  trunk: string;
  tip: string;
  accent: string;
  accent2: string;
  blossom: string;
  firefly: string;
}

export interface Mood {
  id: MoodId;
  name: string;
  description: string;
  keyPc: number;
  keyName: string;
  scale: ScaleId;
  /** 7-note parent scale the pads borrow harmony from */
  harmonyScale: ScaleId;
  bpm: number;
  bpmRange: [number, number];
  progression: Chord[];
  tonic: Chord;
  lead: LeadId;
  /** Lydian: the raised 4th only as a short note on a weak beat */
  avoidPc?: number;
  maxNotesPerSecond: number;
  ambience: Partial<Record<AmbienceId, number>>;
  palette: Palette;
}

export const MOODS: Record<MoodId, Mood> = {
  dawn: {
    id: 'dawn',
    name: 'Dawn Mist',
    description: 'Warm electric piano over a soft pad, with birds and a light breeze.',
    keyPc: 2,
    keyName: 'D',
    scale: 'majorPentatonic',
    harmonyScale: 'ionian',
    bpm: 60,
    bpmRange: [48, 72],
    progression: [
      { symbol: 'Dadd9', tones: [0, 4, 7, 14] },
      { symbol: 'Bm7', tones: [9, 12, 16, 19] },
      { symbol: 'Gmaj7', tones: [5, 9, 12, 16] },
      { symbol: 'Asus4', tones: [7, 12, 14] },
    ],
    tonic: { symbol: 'Dadd9', tones: [0, 4, 7, 14] },
    lead: 'epiano',
    maxNotesPerSecond: 3.5,
    ambience: { birds: 0.45, wind: 0.3 },
    palette: { bg0: '#0B1020', bg1: '#1A1838', horizon: '#F5B38A', trunk: '#4A3550', tip: '#FFD98A', accent: '#F5B38A', accent2: '#F28FB0', blossom: '#F7B7C8', firefly: '#FFE3A8' },
  },
  rain: {
    id: 'rain',
    name: 'Rain Garden',
    description: 'Kalimba drops and a hushed pad under steady rain.',
    keyPc: 9,
    keyName: 'A',
    scale: 'minorPentatonic',
    harmonyScale: 'aeolian',
    bpm: 56,
    bpmRange: [46, 68],
    progression: [
      { symbol: 'Am(add9)', tones: [0, 3, 7, 14] },
      { symbol: 'Fmaj7', tones: [8, 12, 15, 19] },
      { symbol: 'C', tones: [3, 7, 10] },
      { symbol: 'G', tones: [10, 14, 17] },
    ],
    tonic: { symbol: 'Am(add9)', tones: [0, 3, 7, 14] },
    lead: 'kalimba',
    maxNotesPerSecond: 3.5,
    ambience: { rain: 0.6 },
    palette: { bg0: '#0A1118', bg1: '#142430', horizon: '#7FD1C7', trunk: '#2E4A4A', tip: '#BFEBDF', accent: '#7FD1C7', accent2: '#A8C5A0', blossom: '#B9E4D6', firefly: '#D6F5EC' },
  },
  ocean: {
    id: 'ocean',
    name: 'Deep Ocean',
    description: 'Slow pad swells and glass bells over distant waves.',
    keyPc: 0,
    keyName: 'C',
    scale: 'lydian',
    harmonyScale: 'lydian',
    bpm: 50,
    bpmRange: [42, 64],
    progression: [
      { symbol: 'Cmaj7', tones: [0, 4, 7, 11] },
      { symbol: 'D/C', tones: [0, 2, 6, 9] },
      { symbol: 'Em7', tones: [4, 7, 11, 14] },
      { symbol: 'Cmaj7(♯11)', tones: [0, 4, 7, 11, 18] },
    ],
    tonic: { symbol: 'Cmaj7', tones: [0, 4, 7, 11] },
    lead: 'glass',
    avoidPc: 6,
    maxNotesPerSecond: 3,
    ambience: { ocean: 0.6 },
    palette: { bg0: '#07101F', bg1: '#0C1D36', horizon: '#6FD6F0', trunk: '#1F3B5C', tip: '#B5ECFA', accent: '#6FD6F0', accent2: '#8FB8FF', blossom: '#A9D8FF', firefly: '#CFF4FF' },
  },
  forest: {
    id: 'forest',
    name: 'Night Forest',
    description: 'A harp-like pluck among crickets and a quiet stream.',
    keyPc: 6,
    keyName: 'F♯',
    scale: 'minorPentatonic',
    harmonyScale: 'aeolian',
    bpm: 54,
    bpmRange: [44, 66],
    progression: [
      { symbol: 'F♯m', tones: [0, 3, 7] },
      { symbol: 'D', tones: [8, 12, 15] },
      { symbol: 'A', tones: [3, 7, 10] },
      { symbol: 'Esus2', tones: [10, 12, 17] },
    ],
    tonic: { symbol: 'F♯m(add9)', tones: [0, 3, 7, 14] },
    lead: 'harp',
    maxNotesPerSecond: 3.5,
    ambience: { crickets: 0.4, stream: 0.4 },
    palette: { bg0: '#08120F', bg1: '#10231C', horizon: '#7EE0A1', trunk: '#2C4436', tip: '#C9F2D3', accent: '#7EE0A1', accent2: '#F4E27A', blossom: '#E9F2A0', firefly: '#F4E27A' },
  },
  temple: {
    id: 'temple',
    name: 'Temple',
    description: 'A koto-like pluck over a singing-bowl drone, wind and distant chimes.',
    keyPc: 2,
    keyName: 'D',
    scale: 'yo',
    harmonyScale: 'yo',
    bpm: 48,
    bpmRange: [40, 60],
    progression: [
      { symbol: 'D5', tones: [0, 7, 12] },
      { symbol: 'G5', tones: [5, 12, 17] },
      { symbol: 'E5', tones: [2, 9, 14] },
      { symbol: 'A5', tones: [7, 14, 19] },
    ],
    tonic: { symbol: 'D5', tones: [0, 7, 12, 19] },
    lead: 'koto',
    maxNotesPerSecond: 3,
    ambience: { wind: 0.4, chimes: 0.35 },
    palette: { bg0: '#140C16', bg1: '#24152A', horizon: '#F2B45A', trunk: '#4A2E3A', tip: '#FFD9A0', accent: '#F2B45A', accent2: '#E8875B', blossom: '#F6C98A', firefly: '#FFD9A0' },
  },
};

export const MOOD_LIST: Mood[] = [MOODS.dawn, MOODS.rain, MOODS.ocean, MOODS.forest, MOODS.temple];
export const getMood = (id: MoodId): Mood => MOODS[id] ?? MOODS.dawn;
