// Cover art: a 1600×1600 still of the finished tree with the title, mood and seed.

import { getMood } from '../core/music/moods';
import { SCALE_NAMES } from '../core/music/theory';
import type { Score } from '../core/music/score';
import type { RecursionTrace } from '../core/worlds/types';
import { GardenRenderer } from '../viz/renderer';

export async function renderCover(trace: RecursionTrace, score: Score, seed: string): Promise<Blob> {
  const size = 1600;
  const canvas = document.createElement('canvas');
  const mood = getMood(score.moodId);
  const r = new GardenRenderer(canvas, mood.palette, { maxDpr: 1, staticMode: true });
  r.resize(size, size);
  r.setInsets({ top: 150, right: 140, bottom: 330, left: 140 });
  r.setPalette(mood.palette, true);
  r.setScene(trace, score);
  r.drawStill();
  const ctx = canvas.getContext('2d');
  if (ctx) {
    await document.fonts?.ready;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#EEF1F8';
    ctx.font = '400 118px "Fraunces Variable", Georgia, serif';
    ctx.fillText('Seedsong', size / 2, size - 180);
    ctx.fillStyle = mood.palette.accent;
    ctx.font = '600 38px "Manrope Variable", system-ui, sans-serif';
    ctx.fillText(`${mood.name}  ·  ${score.key} ${SCALE_NAMES[score.scale]}  ·  ${Math.round(score.bpm)} BPM`, size / 2, size - 112);
    ctx.fillStyle = '#AAB3C8';
    ctx.font = '400 30px "JetBrains Mono Variable", monospace';
    ctx.fillText(`seed: ${seed}  ·  ${trace.nodes.length} branches, ${trace.maxDepth} levels`, size / 2, size - 62);
  }
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw the cover.'))), 'image/png'));
}
