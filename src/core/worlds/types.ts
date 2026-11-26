// Shared model for every recursion "world". A world runs a real recursive function and records its
// call tree (nodes + call/return events). Everything downstream (music, visuals, export) reads the trace.

export type WorldId = 'grove' | 'lsystem';

export interface ParamSpec {
  key: string;
  label: string;
  /** one plain-language sentence explaining the musical effect */
  help: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
  /** a select instead of a slider; value is the option index */
  options?: string[];
}

export type WorldParams = Record<string, number>;

export interface TraceNode {
  id: number;
  parentId: number | null;
  childIds: number[];
  depth: number;
  childIndex: number;
  siblingCount: number;
  isLeaf: boolean;
  /** size relative to the root, 0..1 (drives note length and loudness) */
  size: number;
  /** -1..1, how far this branch turns away from its parent (drives the melodic step) */
  turn: number;
  /** arguments shown in the recursion lens, e.g. { depth: 3, length: 37, angle: -102 } */
  args: Record<string, number>;
  /** polyline in world units, [x0, y0, x1, y1, ...]; y grows downward like the canvas */
  points: number[];
  /** stroke width in world units */
  width: number;
  /** indices of this node's call and return in `events` */
  order: { call: number; ret: number };
}

export interface TraceEvent {
  kind: 'call' | 'return';
  nodeId: number;
}

export interface RecursionTrace {
  worldId: WorldId;
  seed: string;
  params: WorldParams;
  /** in call order: nodes[i].id === i */
  nodes: TraceNode[];
  events: TraceEvent[];
  maxDepth: number;
  truncated: boolean;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** total recursive calls, including ones that do not draw (for the lens counters) */
  callCount: number;
}

export type CodeLine = 'call' | 'recurse' | 'base' | 'return';

export interface WorldDefinition {
  id: WorldId;
  name: string;
  tagline: string;
  params: ParamSpec[];
  defaults: WorldParams;
  /** pure: same params + seed always give a deep-equal trace */
  generate(params: WorldParams, seed: string): RecursionTrace;
  /** 10–14 lines shown in the code view */
  codeSnippet: string[];
  /** 0-based line to highlight in the code view */
  lineFor(event: CodeLine): number;
  /** text for one frame of the call stack, e.g. "branch(depth 3, len 37, θ -102°)" */
  frameLabel(node: TraceNode): string;
  /** clamp params that depend on each other (e.g. depth limit per branching factor) */
  normalize(params: WorldParams): WorldParams;
}

export function boundsOf(nodes: TraceNode[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    for (let i = 0; i < n.points.length; i += 2) {
      const x = n.points[i];
      const y = n.points[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!Number.isFinite(minX)) return { minX: -1, minY: -1, maxX: 1, maxY: 1 };
  return { minX, minY, maxX, maxY };
}
