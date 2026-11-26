import { describe, expect, it } from 'vitest';
import { grove } from './worlds/grove';
import { lsystem } from './worlds/lsystem';
import { enterableAncestor, focusTrace, focusTraceChecked, subtreeHeight, subtreeTrace, MIN_SUBTREE_LEVELS } from './worlds/subtree';
import type { RecursionTrace } from './worlds/types';
import { composeScore } from './music/compose';
import { SCALES, mod } from './music/theory';
import { MOODS } from './music/moods';

const nested = (t: RecursionTrace) => {
  const stack: number[] = [];
  for (const e of t.events) {
    if (e.kind === 'call') stack.push(e.nodeId);
    else if (stack.pop() !== e.nodeId) return false;
  }
  return stack.length === 0;
};

describe('stepping inside a call', () => {
  const full = grove.generate(grove.defaults, 'still-lake-07'); // branching 2, depth 7

  it('a depth-d branch is a complete binary call tree of depth D − d', () => {
    const branch = full.nodes.find((n) => n.depth === 2)!;
    const sub = subtreeTrace(full, branch.id);
    expect(sub.maxDepth).toBe(full.maxDepth - 2);
    expect(sub.nodes.length).toBe(2 ** (sub.maxDepth + 1) - 1);
    expect(sub.nodes[0].parentId).toBeNull();
    expect(sub.nodes[0].depth).toBe(0);
    expect(sub.nodes[0].size).toBe(1);
    expect(nested(sub)).toBe(true);
    sub.nodes.forEach((n, i) => {
      expect(n.id).toBe(i);
      expect(sub.events[n.order.call]).toEqual({ kind: 'call', nodeId: i });
      expect(sub.events[n.order.ret]).toEqual({ kind: 'return', nodeId: i });
      if (n.parentId !== null) expect(sub.nodes[n.parentId].childIds).toContain(i);
    });
    // the branch stands upright around its own base: it becomes the new trunk
    const [x1, y1, x2, y2] = sub.nodes[0].points;
    expect([x1, y1]).toEqual([branch.points[0], branch.points[1]]);
    expect(Math.abs(x2 - x1)).toBeLessThan(1e-9);
    expect(y2).toBeLessThan(y1);
    expect(Math.hypot(x2 - x1, y2 - y1)).toBeCloseTo(Math.hypot(branch.points[2] - branch.points[0], branch.points[3] - branch.points[1]), 9);
    expect(sub.originIds?.[0]).toBe(branch.id);
  });

  it('the sub-call composes into its own in-key song with an ending', () => {
    const branch = full.nodes.find((n) => n.depth === 1)!;
    const sub = subtreeTrace(full, branch.id);
    const score = composeScore(sub, { moodId: 'rain', mode: 'wander' });
    const mood = MOODS.rain;
    for (const n of score.notes) {
      if (n.voice === 'lead' || n.voice === 'bell') expect(SCALES[mood.scale]).toContain(mod(n.midi - mood.keyPc, 12));
    }
    expect(score.duration).toBeGreaterThan(30);
    expect(score.chords.at(-1)?.symbol).toBe(mood.tonic.symbol);
  });

  it('only branches with enough recursion below them can be entered', () => {
    const leaf = full.nodes.find((n) => n.isLeaf)!;
    const target = enterableAncestor(full, leaf.id)!;
    expect(full.maxDepth - full.nodes[target].depth).toBe(MIN_SUBTREE_LEVELS);
    expect(enterableAncestor(full, 0)).toBeNull();
  });

  it('nested steps follow origin ids back to the full tree', () => {
    const a = full.nodes.find((n) => n.depth === 1)!;
    const sub1 = subtreeTrace(full, a.id);
    const childLocal = sub1.nodes.find((n) => n.depth === 1)!.id;
    const sub2 = subtreeTrace(sub1, childLocal);
    expect(focusTrace(full, [a.id, sub1.originIds![childLocal]])).toEqual(sub2);
    expect(sub2.originIds![0]).toBe(sub1.originIds![childLocal]);
    expect(full.nodes[sub2.originIds![0]].parentId).toBe(a.id);
  });

  it('uses each branch own height in uneven trees, and trims stale focus paths', () => {
    const t = lsystem.generate(lsystem.defaults, 'fern');
    for (const n of t.nodes) {
      const target = enterableAncestor(t, n.id);
      if (target !== null) expect(subtreeHeight(t, target)).toBeGreaterThanOrEqual(MIN_SUBTREE_LEVELS);
    }
    expect(focusTraceChecked(full, [999999]).steps).toBe(0);
    const ok = full.nodes.find((n) => n.depth === 1)!.id;
    expect(focusTraceChecked(full, [ok, 999999]).steps).toBe(1);
  });

  it('works for the L-system garden too', () => {
    const t = lsystem.generate(lsystem.defaults, 'fern');
    const id = enterableAncestor(t, t.nodes.find((n) => n.isLeaf && n.depth >= 3)!.id);
    expect(id).not.toBeNull();
    const sub = subtreeTrace(t, id!);
    expect(nested(sub)).toBe(true);
    expect(composeScore(sub, { moodId: 'forest', mode: 'bloom' }).notes.length).toBeGreaterThan(3);
  });
});
