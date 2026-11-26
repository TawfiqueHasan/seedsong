import { ChevronRight, ZoomOut } from 'lucide-react';
import { getWorld } from '../../core/worlds/registry';
import { useApp } from '../../state/store';

/** where you are in the recursion when you have stepped inside a call: a breadcrumb of frames */
export function CallTrail() {
  const focus = useApp((s) => s.focus);
  const full = useApp((s) => s.fullTrace);
  const trace = useApp((s) => s.trace);
  const stepOut = useApp((s) => s.stepOut);
  if (!focus.length || !full || !trace) return null;
  const world = getWorld(full.worldId);
  const outTo = (level: number) => {
    // pop frames until `level` remain
    const s = useApp.getState();
    const pops = s.focus.length - level;
    if (pops >= s.focus.length) s.stepOut(true);
    else {
      useApp.setState({ focus: s.focus.slice(0, level) });
      s.grow();
    }
  };
  return (
    <nav className="call-trail glass" aria-label="Calls you are inside">
      <ol>
        <li>
          <button className="crumb" onClick={() => outTo(0)}>
            Whole tree
          </button>
        </li>
        {focus.map((id, i) => {
          const n = full.nodes[id];
          const last = i === focus.length - 1;
          return (
            <li key={`${id}-${i}`}>
              <ChevronRight aria-hidden="true" />
              {last ? (
                <span className="crumb current" aria-current="location">
                  {n ? world.frameLabel(n) : 'branch'}
                </span>
              ) : (
                <button className="crumb" onClick={() => outTo(i + 1)}>
                  {n ? world.frameLabel(n) : 'branch'}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <span className="trail-note">{trace.nodes.length} calls, a song of their own</span>
      <button className="icon-btn" onClick={() => stepOut()} aria-label="Step out to the calling branch (O)" title="Step out (O)">
        <ZoomOut aria-hidden="true" />
      </button>
    </nav>
  );
}
