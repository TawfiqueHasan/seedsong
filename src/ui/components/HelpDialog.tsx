import { X } from 'lucide-react';
import { useApp } from '../../state/store';
import { Modal } from './Modal';

const SHORTCUTS: Array<[string, string]> = [
  ['Space', 'Play or pause'],
  ['N', 'Plant a new seed'],
  ['W', 'Switch Wander / Bloom'],
  ['1 – 5', 'Choose a mood'],
  ['← →', 'Back or forward 10 seconds'],
  ['↑ ↓', 'Volume'],
  ['M', 'Mute'],
  ['L', 'Recursion lens'],
  ['I / O', 'Step inside the playing branch / step back out'],
  ['E', 'Keep this song'],
  ['Z', 'Zen mode (any key brings the controls back)'],
  ['?', 'This help'],
  ['Esc', 'Close a panel'],
];

const MAPPING: Array<[string, string, string]> = [
  ['Trunk (first call)', 'The key', 'a root-and-fifth drone for the whole piece'],
  ['Boughs (depth 1)', 'Sections', 'each shifts the melody to a new register'],
  ['Depth 2 calls', 'Phrases', 'each phrase gets its own chord, voice-led'],
  ['Inner branches', 'Melody', 'longer branches play longer notes; left steps down, right climbs'],
  ['Twigs', 'Ornaments', 'quieter, higher grace notes'],
  ['Leaves (base case)', 'Bells', 'chord tones that ring and open a blossom'],
  ['Return from a phrase', 'Cadence', 'a breath of rest while the pad swells'],
  ['Return from the root', 'Ending', 'the home chord, then a long tail'],
];

export function HelpDialog() {
  const open = useApp((s) => s.helpOpen);
  const ui = useApp((s) => s.ui);
  const close = () => ui({ helpOpen: false });
  return (
    <Modal open={open} onClose={close} labelledBy="help-title">
      <div className="dialog-head">
        <h2 id="help-title">How Seedsong works</h2>
        <button className="icon-btn" onClick={close} aria-label="Close">
          <X aria-hidden="true" />
        </button>
      </div>
      <p className="muted">
        A recursive function calls itself to grow every branch. Seedsong records each call and return, and that call tree becomes the shape of the music. The same seed always grows the same song.
      </p>
      <table className="mapping">
        <caption className="sr-only">How each part of the recursion becomes music</caption>
        <thead>
          <tr>
            <th scope="col">Recursion</th>
            <th scope="col">Music</th>
            <th scope="col">You hear</th>
          </tr>
        </thead>
        <tbody>
          {MAPPING.map(([a, b, c]) => (
            <tr key={a}>
              <td>{a}</td>
              <td>{b}</td>
              <td>{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">
        <strong>Step inside a call.</strong> Every branch is itself a call of the same function, so its subtree is a complete, smaller song. Click any branch (or press I) to dive into it; the breadcrumb at the top shows the calls you are inside, and O steps back out. The bright path on the tree is the live call stack: trunk to the branch that is playing.
      </p>
      <p className="muted">
        <strong>Wander</strong> walks the tree depth-first: the melody climbs one branch to its leaf, returns, and climbs the next. <strong>Bloom</strong> walks it breadth-first: each level plays as one phrase, left to right, like a harp sweep.
      </p>
      <h3 className="section-title">Keyboard</h3>
      <dl className="shortcut-grid">
        {SHORTCUTS.map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}>
            <dt>
              <kbd>{k}</kbd>
            </dt>
            <dd style={{ margin: 0 }}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="muted">You can turn single-key shortcuts off in Session settings.</p>
    </Modal>
  );
}
