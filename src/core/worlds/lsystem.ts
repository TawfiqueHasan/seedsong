// World 2: L-System Garden. A recursive rewrite grow(symbol, depth) expands a tiny grammar into a plant;
// a turtle then walks it. "[" pushes the turtle (a branch begins, like a call) and "]" pops it
// (the branch returns), so the bracket structure is a call tree that plays through the same composer.

import { createRng, clamp } from '../random';
import { boundsOf, type RecursionTrace, type TraceEvent, type TraceNode, type WorldDefinition, type WorldParams } from './types';

const DEG = Math.PI / 180;
const STEP = 10;

export interface LPreset {
  name: string;
  axiom: string;
  rules: Record<string, string>;
  angle: number;
  iterations: number;
  maxIterations: number;
  /** initial heading, degrees; -90 is straight up */
  heading: number;
}

export const L_PRESETS: LPreset[] = [
  { name: 'Fern', axiom: 'X', rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' }, angle: 25, iterations: 4, maxIterations: 5, heading: -80 },
  { name: 'Willow', axiom: 'F', rules: { F: 'F[+F]F[-F]F' }, angle: 25.7, iterations: 4, maxIterations: 5, heading: -90 },
  { name: 'Sprig', axiom: 'X', rules: { X: 'F[+X][-X]FX', F: 'FF' }, angle: 25.7, iterations: 5, maxIterations: 6, heading: -90 },
  { name: 'Reed', axiom: 'F', rules: { F: 'F[+F]F[-F][F]' }, angle: 20, iterations: 4, maxIterations: 4, heading: -90 },
  { name: 'Bush', axiom: 'F', rules: { F: 'FF+[+F-F-F]-[-F+F+F]' }, angle: 22.5, iterations: 3, maxIterations: 4, heading: -90 },
  { name: 'Lantern', axiom: 'X', rules: { X: 'F-[[X]+X]+F[+FX]-X', F: 'FF' }, angle: 22.5, iterations: 4, maxIterations: 5, heading: -90 },
];

const defaults: WorldParams = { preset: 0, iterations: 4, bend: 0, randomness: 0.3, asymmetry: 0 };

function normalize(p: WorldParams): WorldParams {
  const preset = Math.round(clamp(p.preset ?? 0, 0, L_PRESETS.length - 1));
  const pr = L_PRESETS[preset];
  return {
    preset,
    iterations: Math.round(clamp(p.iterations ?? pr.iterations, 1, pr.maxIterations)),
    bend: clamp(p.bend ?? 0, -12, 12),
    randomness: clamp(p.randomness ?? 0.3, 0, 1),
    asymmetry: clamp(p.asymmetry ?? 0, -1, 1),
  };
}

/** The recursion: rewrite a symbol `depth` more times, writing terminal symbols to `out`. */
export function expand(symbol: string, depth: number, rules: Record<string, string>, out: string[], counter: { calls: number }): void {
  counter.calls++;
  const rule = rules[symbol];
  if (depth === 0 || rule === undefined) {
    out.push(symbol); // base case: a real stroke, turn or bracket
    return;
  }
  for (const s of rule) expand(s, depth - 1, rules, out, counter); // recursive case
}

interface RawNode {
  points: number[];
  length: number;
  strokes: number;
  turn: number;
  turnSet: boolean;
  branchHeading: number;
  children: RawNode[];
}

const raw = (branchHeading: number): RawNode => ({ points: [], length: 0, strokes: 0, turn: 0, turnSet: false, branchHeading, children: [] });

function generate(input: WorldParams, seed: string): RecursionTrace {
  const p = normalize(input);
  const pr = L_PRESETS[p.preset];
  const rng = createRng(`lsystem:${seed}`);
  const angle = pr.angle + p.bend;

  const symbols: string[] = [];
  const counter = { calls: 0 };
  for (const s of pr.axiom) expand(s, p.iterations, pr.rules, symbols, counter);

  // Turtle walk → raw bracket tree.
  const root = raw(pr.heading);
  let cur = root;
  let x = 0;
  let y = 0;
  let h = pr.heading + rng.jitter(4 * p.randomness);
  let lastWasStroke = false;
  let lastHeading = h;
  const stack: Array<{ x: number; y: number; h: number; node: RawNode }> = [];

  for (const s of symbols) {
    if (s === 'F' || s === 'G') {
      const nx = x + Math.cos(h * DEG) * STEP;
      const ny = y + Math.sin(h * DEG) * STEP;
      if (cur.points.length === 0) cur.points.push(x, y);
      if (!cur.turnSet) {
        cur.turn = clamp((h - cur.branchHeading) / (2 * angle), -1, 1);
        cur.turnSet = true;
      }
      if (lastWasStroke && Math.abs(h - lastHeading) < 1e-9 && cur.points.length >= 4) {
        cur.points[cur.points.length - 2] = nx;
        cur.points[cur.points.length - 1] = ny;
      } else {
        cur.points.push(nx, ny);
      }
      cur.length += STEP;
      cur.strokes++;
      x = nx;
      y = ny;
      lastWasStroke = true;
      lastHeading = h;
    } else if (s === '+') {
      h += angle * (1 + p.asymmetry * 0.25) + rng.jitter(angle * 0.35 * p.randomness);
      lastWasStroke = false;
    } else if (s === '-') {
      h -= angle * (1 - p.asymmetry * 0.25) + rng.jitter(angle * 0.35 * p.randomness);
      lastWasStroke = false;
    } else if (s === '[') {
      stack.push({ x, y, h, node: cur });
      const child = raw(h);
      cur.children.push(child);
      cur = child;
      lastWasStroke = false;
    } else if (s === ']') {
      const st = stack.pop();
      if (st) {
        x = st.x;
        y = st.y;
        h = st.h;
        cur = st.node;
      }
      lastWasStroke = false;
    }
  }

  // Compact: branches that never drew a stroke pass their children up to their parent.
  const nodes: TraceNode[] = [];
  const events: TraceEvent[] = [];
  let maxLen = 1;
  const visitLen = (r: RawNode) => {
    if (r.length > maxLen) maxLen = r.length;
    r.children.forEach(visitLen);
  };
  visitLen(root);

  const drawableChildren = (r: RawNode): RawNode[] =>
    r.children.flatMap((c) => (c.strokes > 0 ? [c] : drawableChildren(c)));

  function emit(r: RawNode, parent: TraceNode | null, depth: number, childIndex: number, siblingCount: number): TraceNode {
    const node: TraceNode = {
      id: nodes.length,
      parentId: parent ? parent.id : null,
      childIds: [],
      depth,
      childIndex,
      siblingCount,
      isLeaf: false,
      size: r.length / maxLen,
      turn: r.turn,
      args: { depth, strokes: r.strokes, length: r.length },
      points: r.points,
      width: 3.4 * Math.pow(0.72, depth) + 0.6,
      order: { call: events.length, ret: -1 },
    };
    nodes.push(node);
    parent?.childIds.push(node.id);
    events.push({ kind: 'call', nodeId: node.id });
    const kids = drawableChildren(r);
    kids.forEach((k, i) => emit(k, node, depth + 1, i, kids.length));
    node.isLeaf = kids.length === 0;
    node.order.ret = events.length;
    events.push({ kind: 'return', nodeId: node.id });
    return node;
  }
  emit(root.strokes > 0 ? root : { ...root, strokes: 1, points: [0, 0, 0, -STEP], length: STEP }, null, 0, 0, 1);

  let maxDepth = 0;
  for (const n of nodes) if (n.depth > maxDepth) maxDepth = n.depth;

  return {
    worldId: 'lsystem',
    seed,
    params: p,
    nodes,
    events,
    maxDepth,
    truncated: false,
    bounds: boundsOf(nodes),
    callCount: counter.calls,
  };
}

const codeSnippet = [
  'function grow(symbol, depth) {',
  '  if (depth === 0 || !rules[symbol]) {    // base case',
  '    turtle.do(symbol)   // F stroke · + − turn',
  '    return              // [ push branch · ] pop',
  '  }',
  '  for (const s of rules[symbol]) {        // recursive case',
  '    grow(s, depth - 1)',
  '  }',
  '}',
  '',
  '// "[" is a call: a branch begins (a note)',
  '// "]" is a return: the branch resolves',
];

const LINES: Record<string, number> = { call: 10, base: 2, recurse: 6, return: 11 };

export const lsystem: WorldDefinition = {
  id: 'lsystem',
  name: 'L-System Garden',
  tagline: 'A grammar that rewrites itself into ferns and willows.',
  params: [
    { key: 'preset', label: 'Plant', help: 'Which grammar to grow. Each plant has its own branching rhythm.', min: 0, max: L_PRESETS.length - 1, step: 1, default: 0, options: L_PRESETS.map((x) => x.name) },
    { key: 'iterations', label: 'Generations', help: 'How many times the grammar rewrites itself. More generations, a fuller plant and a longer song.', min: 1, max: 6, step: 1, default: 4, unit: 'rewrites' },
    { key: 'bend', label: 'Bend', help: 'Opens or closes every turn of the plant. Changes the shape of the melody.', min: -12, max: 12, step: 0.5, default: 0, unit: 'degrees' },
    { key: 'randomness', label: 'Wind', help: 'How much the wind bends each turn. Adds gentle variation.', min: 0, max: 1, step: 0.01, default: 0.3 },
    { key: 'asymmetry', label: 'Lean', help: 'Leans the plant left or right. Shifts the melody up or down.', min: -1, max: 1, step: 0.01, default: 0 },
  ],
  defaults,
  generate,
  codeSnippet,
  lineFor: (e) => LINES[e] ?? 0,
  frameLabel: (n) => `branch[ level ${n.depth}, ${n.args.strokes} strokes ]`,
  normalize,
};

/** iterations limit for the current preset (the slider max follows it) */
export const maxIterationsFor = (preset: number) => L_PRESETS[Math.round(clamp(preset, 0, L_PRESETS.length - 1))].maxIterations;
