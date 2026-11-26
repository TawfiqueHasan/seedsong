import { Headphones } from 'lucide-react';
import { begin } from '../../app/controller';
import { SeedGlyph } from './Glyph';

export function Landing({ leaving }: { leaving: boolean }) {
  const onBegin = () => void begin();
  return (
    <main className={`landing ${leaving ? 'is-leaving' : ''}`} aria-labelledby="title">
      <div className="landing-inner">
        <SeedGlyph className="seed-glyph" />
        <h1 id="title">Seedsong</h1>
        <p className="tagline">Plant a seed. Watch recursion grow. Listen to it bloom.</p>
        <p className="about">A recursive function grows a glowing tree, and its call tree becomes calm music: every branch a note, every leaf a bell, every return a resolution.</p>
        <button className="btn btn-primary begin" onClick={onBegin} autoFocus>
          Begin
        </button>
        <p className="hint">
          <Headphones aria-hidden="true" /> Best with headphones
        </p>
      </div>
      <p className="credit">Hub's Quest · Epoch 1 · Recursive Soundscapes</p>
    </main>
  );
}
