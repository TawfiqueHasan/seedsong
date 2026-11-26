import { useId, type ReactNode } from 'react';
import { Link, Play, RotateCcw, Shuffle, Trash2, X } from 'lucide-react';
import { AMBIENCE_LAYERS, getMood, MOOD_LIST } from '../../core/music/moods';
import { SCALE_NAMES } from '../../core/music/theory';
import { maxDepthFor } from '../../core/worlds/grove';
import { maxIterationsFor } from '../../core/worlds/lsystem';
import { getWorld, WORLD_LIST } from '../../core/worlds/registry';
import type { ParamSpec } from '../../core/worlds/types';
import { useApp, type Tab } from '../../state/store';
import { setAmbience, setSleepTimer } from '../../app/controller';

interface SliderProps {
  label: string;
  help?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

export function Slider({ label, help, min, max, step, value, format, onChange }: SliderProps) {
  const id = useId();
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="field">
      <div className="field-row">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{format(value)}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={format(value)}
        aria-describedby={help ? `${id}-help` : undefined}
        style={{ ['--fill' as string]: `${fill}%` }}
      />
      {help && (
        <p className="help" id={`${id}-help`}>
          {help}
        </p>
      )}
    </div>
  );
}

function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="switch">
      <span className="txt">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

const fmtParam = (p: ParamSpec, v: number) => {
  if (p.options) return p.options[Math.round(v)] ?? '';
  if (p.key === 'asymmetry') return v === 0 ? 'centred' : `${v < 0 ? 'left' : 'right'} ${Math.round(Math.abs(v) * 100)}%`;
  if (p.key === 'randomness') return `${Math.round(v * 100)}%`;
  if (p.key === 'ratio') return `${Math.round(v * 100)}% of parent`;
  if (p.key === 'bend') return `${v > 0 ? '+' : ''}${v}°`;
  if (p.unit === 'degrees') return `${Math.round(v)}°`;
  return `${v}${p.unit ? ` ${p.unit}` : ''}`;
};

function WorldTab() {
  const world = useApp((s) => s.world);
  const params = useApp((s) => s.params[s.world]);
  const seed = useApp((s) => s.seed);
  const trace = useApp((s) => s.trace);
  const { setWorld, setParam, resetParams, setSeed, newSeed } = useApp.getState();
  const def = getWorld(world);
  const seedId = useId();
  return (
    <>
      <div className="cards" role="radiogroup" aria-label="Recursion">
        {WORLD_LIST.map((w) => (
          <button key={w.id} className="card" role="radio" aria-checked={world === w.id} onClick={() => setWorld(w.id)}>
            <strong>{w.name}</strong>
            <span>{w.tagline}</span>
          </button>
        ))}
      </div>
      {def.params.map((p) => {
        let max = p.max;
        if (world === 'grove' && p.key === 'depth') max = maxDepthFor(params.branching ?? 2);
        if (world === 'lsystem' && p.key === 'iterations') max = maxIterationsFor(params.preset ?? 0);
        const value = params[p.key] ?? p.default;
        if (p.options) {
          const id = `opt-${p.key}`;
          return (
            <div className="field" key={p.key}>
              <label htmlFor={id}>{p.label}</label>
              <select id={id} className="select" value={value} onChange={(e) => setParam(p.key, Number(e.target.value))} aria-describedby={`${id}-help`}>
                {p.options.map((o, i) => (
                  <option key={o} value={i}>
                    {o}
                  </option>
                ))}
              </select>
              <p className="help" id={`${id}-help`}>
                {p.help}
              </p>
            </div>
          );
        }
        return <Slider key={p.key} label={p.label} help={p.help} min={p.min} max={max} step={p.step} value={Math.min(value, max)} format={(v) => fmtParam(p, v)} onChange={(v) => setParam(p.key, v)} />;
      })}
      <div className="field">
        <label htmlFor={seedId}>Seed</label>
        <div className="inline">
          <input id={seedId} className="text-input" value={seed} onChange={(e) => setSeed(e.target.value)} spellCheck={false} autoComplete="off" aria-describedby={`${seedId}-help`} />
          <button className="icon-btn" onClick={newSeed} aria-label="Random seed" title="Random seed">
            <Shuffle aria-hidden="true" />
          </button>
        </div>
        <p className="help" id={`${seedId}-help`}>
          Same seed, same song. Share it with a friend.
        </p>
      </div>
      <div className="inline">
        <button className="btn" onClick={resetParams}>
          <RotateCcw aria-hidden="true" width={16} height={16} /> Reset shape
        </button>
      </div>
      {trace && (
        <p className="muted">
          {trace.nodes.length} branches · {trace.maxDepth} levels deep · {trace.callCount} recursive calls
        </p>
      )}
    </>
  );
}

function SoundTab() {
  const mood = useApp((s) => s.mood);
  const bpm = useApp((s) => s.bpm);
  const transpose = useApp((s) => s.transpose);
  const score = useApp((s) => s.score);
  const mono = useApp((s) => s.settings.mono);
  const { setMood, setBpm, setTranspose, updateSettings } = useApp.getState();
  const m = getMood(mood);
  const auto = bpm === undefined;
  return (
    <>
      <div className="cards" role="radiogroup" aria-label="Mood">
        {MOOD_LIST.map((x) => (
          <button key={x.id} className="card" role="radio" aria-checked={mood === x.id} onClick={() => setMood(x.id)}>
            <strong>{x.name}</strong>
            <span>
              {x.keyName} {SCALE_NAMES[x.scale]}, {x.bpm} BPM
            </span>
          </button>
        ))}
      </div>
      <p className="muted">{m.description}</p>
      <Switch label="Automatic tempo" hint="Follows the mood and gently fits very long or short trees." checked={auto} onChange={(v) => setBpm(v ? undefined : Math.round(score?.bpm ?? m.bpm))} />
      {!auto && <Slider label="Tempo" help="Slower feels deeper; 80–100 BPM can feel relaxing too." min={40} max={96} step={1} value={bpm ?? m.bpm} format={(v) => `${v} BPM`} onChange={setBpm} />}
      <Slider label="Key" help="Moves the whole song higher or lower." min={-5} max={6} step={1} value={transpose} format={(v) => (v === 0 ? `${m.keyName} (home)` : `${v > 0 ? '+' : ''}${v} semitones`)} onChange={setTranspose} />
      <Switch label="Mono" hint="Sums left and right, for listening with one ear." checked={mono} onChange={(v) => updateSettings({ mono: v })} />
    </>
  );
}

function AtmosphereTab() {
  const amb = useApp((s) => s.settings.ambience);
  return (
    <>
      <p className="muted">Natural sounds under the music. They are made live in your browser, so they never loop.</p>
      {AMBIENCE_LAYERS.map((l) => (
        <Slider key={l.id} label={l.label} min={0} max={1} step={0.01} value={amb[l.id] ?? 0} format={(v) => (v === 0 ? 'off' : `${Math.round(v * 100)}%`)} onChange={(v) => setAmbience(l.id, v)} />
      ))}
    </>
  );
}

function SessionTab() {
  const settings = useApp((s) => s.settings);
  const sleepEndsAt = useApp((s) => s.sleepEndsAt);
  const garden = useApp((s) => s.garden);
  const { updateSettings, saveToGarden, removeFromGarden, loadSong, grow, shareUrl, toast } = useApp.getState();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      toast('Link copied. Anyone who opens it hears this exact song.');
    } catch {
      toast('Copying is blocked here. The link is in the address bar.');
      history.replaceState(null, '', shareUrl());
    }
  };
  return (
    <>
      <Switch label="Breathing companion" hint="A ring that grows for 4 seconds and settles for 6." checked={settings.breathing} onChange={(v) => updateSettings({ breathing: v })} />
      <div className="field">
        <label htmlFor="sleep">Sleep timer</label>
        <select id="sleep" className="select" value={sleepEndsAt ? 'on' : '0'} onChange={(e) => setSleepTimer(e.target.value === '0' ? null : Number(e.target.value))}>
          <option value="0">Off</option>
          {sleepEndsAt && <option value="on">Fading at {new Date(sleepEndsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</option>}
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
          <option value="60">60 minutes</option>
        </select>
        <p className="help">The music fades out over a minute, then rests.</p>
      </div>
      <Switch label="Endless garden" hint="When a song ends, a new seed is planted." checked={settings.endless} onChange={(v) => updateSettings({ endless: v })} />
      <div className="field">
        <label htmlFor="motion">Motion</label>
        <select id="motion" className="select" value={settings.motion} onChange={(e) => updateSettings({ motion: e.target.value as typeof settings.motion })}>
          <option value="system">Follow my system</option>
          <option value="reduce">Reduce motion (fades only)</option>
          <option value="full">Full motion</option>
        </select>
      </div>
      <Switch label="Keyboard shortcuts" hint="Single keys like Space, N and 1–5. Press ? to see them all." checked={settings.shortcuts} onChange={(v) => updateSettings({ shortcuts: v })} />

      <p className="section-title">Your garden</p>
      <div className="inline">
        <button className="btn" onClick={saveToGarden}>
          Save this seed
        </button>
        <button className="btn" onClick={copy}>
          <Link aria-hidden="true" width={16} height={16} /> Copy link
        </button>
      </div>
      {garden.length === 0 ? (
        <p className="muted">Seeds you save appear here, ready to regrow.</p>
      ) : (
        <ul className="garden-list">
          {garden.map((g) => (
            <li key={g.id}>
              <span title={g.name}>{g.name}</span>
              <button
                className="icon-btn"
                aria-label={`Regrow ${g.name}`}
                onClick={() => {
                  loadSong(g.song);
                  grow();
                }}
              >
                <Play aria-hidden="true" />
              </button>
              <button className="icon-btn" aria-label={`Remove ${g.name}`} onClick={() => removeFromGarden(g.id)}>
                <Trash2 aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const TABS: Array<{ id: Tab; label: string; render: () => ReactNode }> = [
  { id: 'world', label: 'World', render: () => <WorldTab /> },
  { id: 'sound', label: 'Sound', render: () => <SoundTab /> },
  { id: 'atmosphere', label: 'Atmosphere', render: () => <AtmosphereTab /> },
  { id: 'session', label: 'Session', render: () => <SessionTab /> },
];

export function Drawer() {
  const tab = useApp((s) => s.tab);
  const ui = useApp((s) => s.ui);
  const onKey = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
      ui({ tab: next.id });
      document.getElementById(`tab-${next.id}`)?.focus();
    }
  };
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];
  return (
    <aside id="drawer" className="drawer glass" aria-label="Shape your garden">
      <div className="drawer-head">
        <h2>Shape your garden</h2>
        <button className="icon-btn" onClick={() => ui({ drawerOpen: false })} aria-label="Close (Esc)">
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="tabs" role="tablist" aria-label="Settings" onKeyDown={onKey}>
        {TABS.map((t) => (
          <button key={t.id} id={`tab-${t.id}`} role="tab" aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} tabIndex={tab === t.id ? 0 : -1} onClick={() => ui({ tab: t.id })}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="tab-panel" role="tabpanel" id={`panel-${current.id}`} aria-labelledby={`tab-${current.id}`}>
        {current.render()}
      </div>
    </aside>
  );
}
