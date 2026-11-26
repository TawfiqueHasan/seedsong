import { X } from 'lucide-react';
import { getWorld } from '../../core/worlds/registry';
import type { TraceNode } from '../../core/worlds/types';
import { roleOf } from '../../core/music/compose';
import { useApp } from '../../state/store';
import { usePosition } from '../hooks';

const ROLE_TEXT: Record<string, string> = {
  trunk: 'the trunk: the drone that holds the key',
  section: 'a bough: a new section begins',
  phrase: 'a phrase: the harmony changes',
  lead: 'a branch: a melody note',
  twig: 'a twig: a small ornament',
  leaf: 'a leaf: the base case rings a bell',
};

/** live call stack, counters and the running line of code */
export function Lens() {
  const score = useApp((s) => s.score);
  const trace = useApp((s) => s.trace);
  const mode = useApp((s) => s.mode);
  const ui = useApp((s) => s.ui);
  const pos = usePosition(8);
  if (!score || !trace) return null;
  const world = getWorld(trace.worldId);

  // last event at or before the playhead
  let lo = 0;
  let hi = score.events.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (score.events[mid].time <= pos + 1e-3) {
      idx = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  const ev = idx >= 0 ? score.events[idx] : null;
  let calls = 0;
  for (let i = 0; i <= idx; i++) if (score.events[i].kind === 'call') calls++;
  // the open frame: after a return (depth-first), control is back in the parent
  let current: TraceNode | null = null;
  if (ev) {
    const n = trace.nodes[ev.nodeId];
    const returned = ev.kind === 'return' || ev.kind === 'cadence';
    current = returned && mode === 'wander' && n.parentId !== null ? trace.nodes[n.parentId] : n;
  }
  // the call stack is the chain of ancestors (exactly the stack in Wander, the lineage in Bloom)
  const stack: TraceNode[] = [];
  for (let n: TraceNode | null = current; n; n = n.parentId === null ? null : trace.nodes[n.parentId]) stack.unshift(n);
  const top = stack[stack.length - 1] ?? null;
  const role = top ? roleOf(top, trace.maxDepth, trace.maxDepth >= 4 ? 2 : 1) : null;
  const line = !ev ? -1 : ev.kind === 'return' || ev.kind === 'cadence' ? world.lineFor('return') : top?.isLeaf ? world.lineFor('base') : world.lineFor('call');
  const shown = stack.slice(-9);

  return (
    <aside className="lens glass" aria-label="Recursion lens">
      <div className="drawer-head">
        <h2>Recursion lens</h2>
        <button className="icon-btn" onClick={() => ui({ lensOpen: false })} aria-label="Close the lens (L)">
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="lens-body">
        <div className="counters" aria-live="off">
          <div className="counter">
            <b>{calls}</b>
            <small>calls so far</small>
          </div>
          <div className="counter">
            <b>{top ? top.depth : 0}</b>
            <small>current depth</small>
          </div>
          <div className="counter">
            <b>{trace.maxDepth}</b>
            <small>max depth</small>
          </div>
        </div>
        <div>
          <p className="section-title">{mode === 'wander' ? 'Call stack (depth-first)' : 'Lineage (breadth-first)'}</p>
          <ol className="stack" aria-label="Call stack">
            {stack.length > shown.length && <li>… {stack.length - shown.length} more frames</li>}
            {shown.map((n, i) => (
              <li key={n.id} className={i === shown.length - 1 ? 'top' : ''} style={{ paddingLeft: `${Math.min(i, 8) * 10}px` }}>
                {world.frameLabel(n)}
              </li>
            ))}
          </ol>
          {role && <p className="muted">Now: {ROLE_TEXT[role]}.</p>}
        </div>
        <div>
          <p className="section-title">The running code</p>
          <pre className="code" tabIndex={0} aria-label={`Code for ${world.name}`}>
            {world.codeSnippet.map((l, i) => (
              <span key={i} className={i === line ? 'on' : ''}>
                {l || ' '}
              </span>
            ))}
          </pre>
        </div>
        <dl className="legend">
          <dt>call</dt>
          <dd>a note begins</dd>
          <dt>base case</dt>
          <dd>a leaf rings a bell</dd>
          <dt>return</dt>
          <dd>the phrase resolves</dd>
        </dl>
      </div>
    </aside>
  );
}
