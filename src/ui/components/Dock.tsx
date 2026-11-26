import { useMemo } from 'react';
import { Download, GitBranch, Layers, Pause, Play, Sprout, Volume2, VolumeX, ZoomIn } from 'lucide-react';
import { MOOD_LIST } from '../../core/music/moods';
import { totalLength } from '../../core/music/score';
import { getWorld } from '../../core/worlds/registry';
import { useApp } from '../../state/store';
import { seek, setVolume, stepIntoPlaying, toggleMute, togglePlay } from '../../app/controller';
import { fmtTime, usePosition } from '../hooks';

export function MoodChips() {
  const mood = useApp((s) => s.mood);
  const setMood = useApp((s) => s.setMood);
  return (
    <div className="moods" role="radiogroup" aria-label="Mood">
      {MOOD_LIST.map((m, i) => (
        <button
          key={m.id}
          className="mood-chip"
          role="radio"
          aria-checked={mood === m.id}
          onClick={() => setMood(m.id)}
          title={`${m.description} (${i + 1})`}
          style={{ ['--chip' as string]: m.palette.accent }}
        >
          <span className="dot" aria-hidden="true" />
          {m.name}
        </button>
      ))}
    </div>
  );
}

function Skyline() {
  const score = useApp((s) => s.score);
  const trace = useApp((s) => s.trace);
  const pos = usePosition(8);
  const total = score ? totalLength(score) : 1;

  // a stepped silhouette of call depth over time: the shape of the recursion
  const path = useMemo(() => {
    if (!score || !trace) return '';
    const D = Math.max(1, trace.maxDepth);
    const W = 1000;
    const H = 34;
    let d = `M0 ${H}`;
    let lastY = H;
    for (const e of score.events) {
      if (e.kind !== 'call') continue;
      const x = (e.time / total) * W;
      const y = H - 3 - ((e.depth + 1) / (D + 1)) * (H - 6);
      d += ` L${x.toFixed(1)} ${lastY.toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)}`;
      lastY = y;
    }
    d += ` L${((score.duration / total) * W).toFixed(1)} ${lastY.toFixed(1)} L${((score.duration / total) * W).toFixed(1)} ${H} Z`;
    return d;
  }, [score, trace, total]);

  const x = Math.min(1, pos / total) * 1000;
  const label = `${fmtTime(pos)} of ${fmtTime(total)}`;
  return (
    <div className="skyline">
      <svg viewBox="0 0 1000 34" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="sky-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.08" />
          </linearGradient>
          <clipPath id="played">
            <rect x="0" y="0" width={x} height="34" />
          </clipPath>
        </defs>
        <path d={path} fill="rgba(255,255,255,0.10)" />
        <path d={path} fill="url(#sky-fill)" clipPath="url(#played)" />
        <line x1={x} x2={x} y1="0" y2="34" stroke="var(--text-1)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <input
        type="range"
        min={0}
        max={Math.round(total)}
        step={1}
        value={Math.round(Math.min(pos, total))}
        onChange={(e) => seek(Number(e.target.value))}
        aria-label="Position in the song (the outline shows recursion depth over time)"
        aria-valuetext={label}
      />
    </div>
  );
}

function NowPlaying() {
  const score = useApp((s) => s.score);
  const trace = useApp((s) => s.trace);
  const pos = usePosition(5);
  if (!score || !trace) return null;
  // the latest call at or before the playhead
  let lo = 0;
  let hi = score.events.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (score.events[mid].time <= pos) {
      idx = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  let node = null;
  for (let i = idx; i >= 0; i--) if (score.events[i].kind === 'call') {
    node = trace.nodes[score.events[i].nodeId];
    break;
  }
  const text = node ? getWorld(trace.worldId).frameLabel(node) : `${trace.worldId === 'grove' ? 'branch' : 'grow'}(…)`;
  return (
    <span className="now-playing" aria-hidden="true">
      {text}
    </span>
  );
}

export function Transport() {
  const playback = useApp((s) => s.playback);
  const mode = useApp((s) => s.mode);
  const setMode = useApp((s) => s.setMode);
  const newSeed = useApp((s) => s.newSeed);
  const volume = useApp((s) => s.settings.volume);
  const muted = useApp((s) => s.settings.muted);
  const ended = useApp((s) => s.ended);
  const score = useApp((s) => s.score);
  const ui = useApp((s) => s.ui);
  const pos = usePosition(4);
  const playing = playback === 'playing';
  return (
    <section className="transport glass" aria-label="Playback">
      <button className="play-btn" onClick={() => void togglePlay()} aria-label={playing ? 'Pause (Space)' : ended ? 'Play again (Space)' : 'Play (Space)'}>
        {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
      </button>
      <div className="seg" role="radiogroup" aria-label="How the tree is walked">
        <button role="radio" aria-checked={mode === 'wander'} onClick={() => setMode('wander')} title="Wander: depth-first. The melody climbs one branch to its leaf, returns, and climbs the next. (W)">
          <GitBranch aria-hidden="true" /> Wander
        </button>
        <button role="radio" aria-checked={mode === 'bloom'} onClick={() => setMode('bloom')} title="Bloom: breadth-first. Each level of the tree plays as one phrase, left to right. (W)">
          <Layers aria-hidden="true" /> Bloom
        </button>
      </div>
      <div className="timeline">
        <div className="timeline-meta">
          <NowPlaying />
          <span>
            {fmtTime(pos)} / {fmtTime(score ? totalLength(score) : 0)}
          </span>
        </div>
        <Skyline />
      </div>
      <div className="vol">
        <button className="icon-btn" onClick={() => stepIntoPlaying()} aria-label="Step inside the branch that is playing (I)" title="Step inside the playing branch (I). Or click any branch.">
          <ZoomIn aria-hidden="true" />
        </button>
        <button className="icon-btn" onClick={newSeed} aria-label="Plant a new seed (N)" title="Plant a new seed (N)">
          <Sprout aria-hidden="true" />
        </button>
        <button className="icon-btn" onClick={toggleMute} aria-label={muted ? 'Unmute (M)' : 'Mute (M)'} title={muted ? 'Unmute (M)' : 'Mute (M)'}>
          {muted || volume === 0 ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Volume"
          aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)} percent`}
          style={{ ['--fill' as string]: `${(muted ? 0 : volume) * 100}%` }}
        />
      </div>
      <button className={`btn keep-btn ${ended ? 'is-ready' : ''}`} onClick={() => ui({ keepOpen: true })} aria-label="Keep this song: download or share (E)">
        <Download aria-hidden="true" width={18} height={18} />
        <span className="label">Keep this song</span>
      </button>
    </section>
  );
}

export function Dock() {
  return (
    <div className="dock">
      <MoodChips />
      <Transport />
    </div>
  );
}
