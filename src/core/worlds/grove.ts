// World 1: Fractal Grove. The classic recursive tree: branch() draws one branch and calls itself
// for each child. Its call tree is the musical form (see src/core/music/compose.ts).

import { createRng, clamp } from '../random';
import { boundsOf, type RecursionTrace, type TraceEvent, type TraceNode, type WorldDefinition, type WorldParams } from './types';

const DEG = Math.PI / 180;
const TRUNK = 100;

/** keep the full tree within a 2,047-node budget: never truncate a tree halfway */
export function maxDepthFor(branching: number): number {
  if (branching <= 2) return 10;
  if (branching === 3) return 6;
  return 5;
}

const defaults: WorldParams = {
  depth: 7,
  branching: 2,
  spread: 24,
  ratio: 0.72,
  randomness: 0.25,
  asymmetry: 0,
};

function normalize(p: WorldParams): WorldParams {
  const branching = Math.round(clamp(p.branching ?? defaults.branching, 2, 4));
  return {
    depth: Math.round(clamp(p.depth ?? defaults.depth, 1, maxDepthFor(branching))),
    branching,
    spread: clamp(p.spread ?? defaults.spread, 5, 60),
    ratio: clamp(p.ratio ?? defaults.ratio, 0.55, 0.82),
    randomness: clamp(p.randomness ?? defaults.randomness, 0, 1),
    asymmetry: clamp(p.asymmetry ?? defaults.asymmetry, -1, 1),
  };
}

function generate(input: WorldParams, seed: string): RecursionTrace {
  const p = normalize(input);
  const rng = createRng(`grove:${seed}`);
  const nodes: TraceNode[] = [];
  const events: TraceEvent[] = [];

  // The recursive function itself. Angles are in degrees, -90 points straight up.
  function branch(x: number, y: number, angle: number, length: number, depth: number, parent: TraceNode | null, childIndex: number, siblingCount: number, turn: number): void {
    const x2 = x + Math.cos(angle * DEG) * length;
    const y2 = y + Math.sin(angle * DEG) * length;
    const node: TraceNode = {
      id: nodes.length,
      parentId: parent ? parent.id : null,
      childIds: [],
      depth,
      childIndex,
      siblingCount,
      isLeaf: depth >= p.depth,
      size: length / TRUNK,
      turn,
      args: { depth, length: Math.round(length * 10) / 10, angle: Math.round(angle + 90) },
      points: [x, y, x2, y2],
      width: 12 * Math.pow(p.ratio, depth * 1.15) + 0.6,
      order: { call: events.length, ret: -1 },
    };
    nodes.push(node);
    parent?.childIds.push(node.id);
    events.push({ kind: 'call', nodeId: node.id }); // a note begins

    if (depth < p.depth) {
      // recursive case: grow every child from this branch's tip
      for (let i = 0; i < p.branching; i++) {
        const offset = p.branching === 1 ? 0 : p.spread * ((2 * i) / (p.branching - 1) - 1);
        const jitter = (rng() - 0.5) * 2 * p.randomness * p.spread * 0.6;
        const lean = p.asymmetry * p.spread * 0.5;
        const next = length * p.ratio * (1 + (rng() - 0.5) * p.randomness * 0.4);
        const childTurn = clamp((offset + jitter + lean) / Math.max(p.spread, 1), -1.5, 1.5) / 1.5;
        branch(x2, y2, angle + offset + jitter + lean, next, depth + 1, node, i, p.branching, childTurn);
      }
    }
    // base case falls through: a leaf, which rings as a bell
    node.order.ret = events.length;
    events.push({ kind: 'return', nodeId: node.id }); // the phrase resolves
  }

  branch(0, 0, -90, TRUNK, 0, null, 0, 1, 0);

  return {
    worldId: 'grove',
    seed,
    params: p,
    nodes,
    events,
    maxDepth: p.depth,
    truncated: false,
    bounds: boundsOf(nodes),
    callCount: nodes.length,
  };
}

const codeSnippet = [
  'function branch(x, y, angle, length, depth) {',
  '  const tip = grow(x, y, angle, length)    // a note begins',
  '  if (depth === maxDepth) {               // base case',
  '    blossom(tip)                          // a leaf rings a bell',
  '    return',
  '  }',
  '  for (let i = 0; i < branching; i++) {   // recursive case',
  '    const turn = spread * side(i) + wind()',
  '    branch(tip.x, tip.y, angle + turn,',
  '           length * ratio, depth + 1)',
  '  }',
  '  return                                  // the phrase resolves',
  '}',
];

const LINES: Record<string, number> = { call: 1, base: 3, recurse: 8, return: 11 };

export const grove: WorldDefinition = {
  id: 'grove',
  name: 'Fractal Grove',
  tagline: 'A tree that calls itself. Every branch is a note, every leaf a bell.',
  params: [
    { key: 'depth', label: 'Depth', help: 'How many times each branch splits. Deeper trees make longer songs.', min: 1, max: 10, step: 1, default: 7, unit: 'levels' },
    { key: 'branching', label: 'Branches', help: 'How many new branches grow from each tip. More branches, richer harmony.', min: 2, max: 4, step: 1, default: 2, unit: 'per tip' },
    { key: 'spread', label: 'Spread', help: 'How wide the branches open. Wider trees sound more spacious.', min: 5, max: 60, step: 1, default: 24, unit: 'degrees' },
    { key: 'ratio', label: 'Taper', help: 'How much shorter each branch is than its parent. Shorter branches make quicker notes.', min: 0.55, max: 0.82, step: 0.01, default: 0.72 },
    { key: 'randomness', label: 'Wind', help: 'How much the wind bends each branch. Adds gentle variation to the melody.', min: 0, max: 1, step: 0.01, default: 0.25 },
    { key: 'asymmetry', label: 'Lean', help: 'Leans the tree left or right. Shifts the melody up or down.', min: -1, max: 1, step: 0.01, default: 0 },
  ],
  defaults,
  generate,
  codeSnippet,
  lineFor: (e) => LINES[e] ?? 0,
  frameLabel: (n) => `branch(depth ${n.depth}, len ${Math.round(n.args.length)}, θ ${n.args.angle}°)`,
  normalize,
};
