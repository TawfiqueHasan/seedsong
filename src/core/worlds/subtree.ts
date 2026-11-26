// "Step inside a call": any branch of a recursion tree is itself a complete call of the same
// recursive function, so its subtree can be lifted out as a RecursionTrace of its own and played
// as a smaller, self-similar song. Pure and deterministic.

import { boundsOf, type RecursionTrace, type TraceNode } from './types';

/** how many levels a branch must have below it to be worth stepping into */
export const MIN_SUBTREE_LEVELS = 2;

/** the deepest ancestor-or-self of `nodeId` that still has at least MIN_SUBTREE_LEVELS below it */
export function enterableAncestor(trace: RecursionTrace, nodeId: number): number | null {
  let n: TraceNode | undefined = trace.nodes[nodeId];
  while (n && trace.maxDepth - n.depth < MIN_SUBTREE_LEVELS) n = n.parentId === null ? undefined : trace.nodes[n.parentId];
  // a real step needs to go below the current root and keep some recursion under it
  if (!n || n.depth === 0) return null;
  return n.id;
}

/** the subtree rooted at `nodeId`, re-indexed from 0, depths shifted so the branch becomes the trunk */
export function subtreeTrace(trace: RecursionTrace, nodeId: number): RecursionTrace {
  const root = trace.nodes[nodeId];
  if (!root) return trace;
  const { call, ret } = root.order;
  const events = trace.events.slice(call, ret + 1);
  // nodes in call order are exactly the nodes whose call event lies inside the root's call/return pair
  const ids = events.filter((e) => e.kind === 'call').map((e) => e.nodeId);
  const map = new Map<number, number>(ids.map((id, i) => [id, i]));
  const scale = root.size > 0 ? 1 / root.size : 1;
  // stand the branch upright around its base, so the call you stepped into becomes the new trunk
  const bx = root.points[0];
  const by = root.points[1];
  const ex = root.points[root.points.length - 2];
  const ey = root.points[root.points.length - 1];
  const rot = -Math.PI / 2 - Math.atan2(ey - by, ex - bx);
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const upright = (pts: number[]) => {
    const out = pts.slice();
    for (let k = 0; k < out.length; k += 2) {
      const dx = pts[k] - bx;
      const dy = pts[k + 1] - by;
      out[k] = bx + dx * cos - dy * sin;
      out[k + 1] = by + dx * sin + dy * cos;
    }
    return out;
  };
  const nodes: TraceNode[] = ids.map((id, i) => {
    const n = trace.nodes[id];
    return {
      ...n,
      id: i,
      parentId: id === nodeId || n.parentId === null ? null : (map.get(n.parentId) ?? null),
      childIds: n.childIds.map((c) => map.get(c)).filter((c): c is number => c !== undefined),
      depth: n.depth - root.depth,
      childIndex: id === nodeId ? 0 : n.childIndex,
      siblingCount: id === nodeId ? 1 : n.siblingCount,
      // relative to the new trunk, so the sub-song keeps full-length phrasing
      size: Math.min(1, n.size * scale),
      turn: id === nodeId ? 0 : n.turn,
      args: { ...n.args, depth: n.depth - root.depth },
      points: upright(n.points),
      order: { call: 0, ret: 0 },
    };
  });
  const remapped = events.map((e) => ({ kind: e.kind, nodeId: map.get(e.nodeId) ?? 0 }));
  remapped.forEach((e, i) => {
    if (e.kind === 'call') nodes[e.nodeId].order.call = i;
    else nodes[e.nodeId].order.ret = i;
  });
  let maxDepth = 0;
  for (const n of nodes) if (n.depth > maxDepth) maxDepth = n.depth;
  const parentOrigin = trace.originIds;
  return {
    ...trace,
    nodes,
    events: remapped,
    maxDepth,
    bounds: boundsOf(nodes),
    callCount: nodes.length,
    originIds: ids.map((id) => (parentOrigin ? parentOrigin[id] : id)),
  };
}

/** follow a path of origin ids (outermost first) from a full trace into nested sub-calls */
export function focusTrace(full: RecursionTrace, path: number[]): RecursionTrace {
  let t = full;
  for (const originId of path) {
    const local = t.originIds ? t.originIds.indexOf(originId) : originId;
    if (local <= 0 || !t.nodes[local]) break;
    t = subtreeTrace(t, local);
  }
  return t;
}
