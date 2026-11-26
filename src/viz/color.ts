import type { Palette } from '../core/music/moods';

export type RGB = [number, number, number];

export const hexToRgb = (hex: string): RGB => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const mixRgb = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export const rgba = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

export type PaletteRGB = Record<keyof Palette, RGB>;

export const paletteRgb = (p: Palette): PaletteRGB =>
  Object.fromEntries(Object.entries(p).map(([k, v]) => [k, hexToRgb(v)])) as PaletteRGB;

export const mixPalette = (a: PaletteRGB, b: PaletteRGB, t: number): PaletteRGB =>
  Object.fromEntries(Object.keys(a).map((k) => [k, mixRgb(a[k as keyof Palette], b[k as keyof Palette], t)])) as PaletteRGB;
