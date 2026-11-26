import { useRef, useState } from 'react';
import { BookmarkPlus, FileMusic, Image, Link, X } from 'lucide-react';
import { getMood } from '../../core/music/moods';
import { totalLength } from '../../core/music/score';
import { renderScore } from '../../export/offline';
import { encodeWav, measure, toDb } from '../../export/wav';
import { scoreToMidi } from '../../export/midi';
import { encodeMp3 } from '../../export/mp3';
import { renderCover } from '../../export/cover';
import { downloadBytes, songFilename } from '../../export/download';
import { useApp } from '../../state/store';
import { fmtTime } from '../hooks';
import { Modal } from './Modal';

type Stage = 'idle' | 'rendering' | 'encoding' | 'done' | 'error';

export function KeepDialog() {
  const open = useApp((s) => s.keepOpen);
  const ui = useApp((s) => s.ui);
  const score = useApp((s) => s.score);
  const trace = useApp((s) => s.trace);
  const seed = useApp((s) => s.seed);
  const version = useApp((s) => s.version);
  const ambience = useApp((s) => s.settings.ambience);
  const mono = useApp((s) => s.settings.mono);
  const { shareUrl, saveToGarden, toast } = useApp.getState();
  const [stage, setStage] = useState<Stage>('idle');
  const [pct, setPct] = useState(0);
  const [msg, setMsg] = useState('');
  const [bits, setBits] = useState<16 | 24>(16);
  const [withAmb, setWithAmb] = useState(true);
  const cache = useRef<{ key: string; buffer: AudioBuffer } | null>(null);
  const job = useRef(0);

  const close = () => {
    job.current++; // cancels any running export
    setStage('idle');
    ui({ keepOpen: false, exporting: false });
  };

  if (!score || !trace) return null;
  const mood = getMood(score.moodId);
  const busy = stage === 'rendering' || stage === 'encoding';

  async function getBuffer(myJob: number): Promise<AudioBuffer | null> {
    if (!score) return null;
    const key = `${version}:${withAmb}:${mono}:${JSON.stringify(ambience)}`;
    if (cache.current?.key === key) return cache.current.buffer;
    setStage('rendering');
    setMsg('Growing your song offline. Keep this tab open, it only takes a moment.');
    setPct(2);
    const buffer = await renderScore(score, seed, {
      ambience,
      withAmbience: withAmb,
      mono,
      onProgress: (p) => {
        if (myJob === job.current) setPct(2 + p * 90);
      },
    });
    if (myJob !== job.current) return null;
    cache.current = { key, buffer };
    return buffer;
  }

  const run = async (kind: 'wav' | 'mp3') => {
    const myJob = ++job.current;
    ui({ exporting: true });
    try {
      const buffer = await getBuffer(myJob);
      if (!buffer || myJob !== job.current) return;
      setStage('encoding');
      setPct(94);
      setMsg(kind === 'wav' ? 'Writing the WAV file…' : 'Encoding MP3…');
      await new Promise((r) => setTimeout(r, 30));
      const channels = [buffer.getChannelData(0), buffer.getChannelData(buffer.numberOfChannels > 1 ? 1 : 0)];
      const { rms } = measure(channels);
      if (toDb(rms) < -60) throw new Error('The render was silent.');
      const title = `Seedsong · ${mood.name} · ${seed}`;
      if (kind === 'wav') {
        const bytes = encodeWav(
          { sampleRate: buffer.sampleRate, channels },
          { bitDepth: bits, normalizeDb: -1, fadeOut: 3, info: { INAM: title, IART: 'Seedsong', ICMT: shareUrl(), ISFT: 'Seedsong 1.0 (Tone.js)', ICRD: new Date().toISOString().slice(0, 10) } },
        );
        if (myJob !== job.current) return;
        downloadBytes(bytes, songFilename(mood.id, seed, 'wav'), 'audio/wav');
      } else {
        const blob = await encodeMp3(buffer.sampleRate, channels[0], channels[1], (p) => setPct(94 + p * 5));
        if (myJob !== job.current) return;
        downloadBytes(blob, songFilename(mood.id, seed, 'mp3'), 'audio/mpeg');
      }
      setPct(100);
      setStage('done');
      setMsg('Your song is ready. It is in your downloads.');
    } catch (e) {
      if (myJob !== job.current) return;
      setStage('error');
      setMsg(`${e instanceof Error ? e.message : 'Something went quiet.'} You can try again.`);
    } finally {
      if (myJob === job.current) ui({ exporting: false });
    }
  };

  const midi = () => {
    downloadBytes(scoreToMidi(score, `Seedsong · ${mood.name} · ${seed}`), songFilename(mood.id, seed, 'mid'), 'audio/midi');
    toast('MIDI saved: one track per voice.');
  };

  const cover = async () => {
    try {
      const blob = await renderCover(trace, score, seed);
      downloadBytes(blob, songFilename(mood.id, seed, 'png'), 'image/png');
      toast('Cover art saved.');
    } catch {
      toast('The cover could not be drawn here. Try again.');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      toast('Link copied. Anyone who opens it hears this exact song.');
    } catch {
      history.replaceState(null, '', shareUrl());
      toast('Copying is blocked here. The link is now in the address bar.');
    }
  };

  return (
    <Modal open={open} onClose={close} labelledBy="keep-title">
      <div className="dialog-head">
        <div>
          <h2 id="keep-title">Keep this song</h2>
          <p className="muted">
            {mood.name} · {score.key} · {Math.round(score.bpm)} BPM · {fmtTime(totalLength(score))} · seed <span translate="no">{seed}</span>
          </p>
        </div>
        <button className="icon-btn" onClick={close} aria-label="Close">
          <X aria-hidden="true" />
        </button>
      </div>

      <div className="formats">
        <div className="format">
          <div>
            <strong>WAV audio</strong>
            <small>Rendered offline with the same instruments you heard. Opens anywhere.</small>
          </div>
          <button className="btn btn-primary" onClick={() => run('wav')} disabled={busy}>
            Download WAV
          </button>
        </div>
        <div className="format">
          <div>
            <strong>MP3 audio</strong>
            <small>Smaller file, 192 kbps. Good for phones and sharing.</small>
          </div>
          <button className="btn" onClick={() => run('mp3')} disabled={busy}>
            Download MP3
          </button>
        </div>
        <div className="format">
          <div>
            <strong>MIDI</strong>
            <small>One track per voice (drone, pad, bass, lead, ornaments, bells) for your DAW.</small>
          </div>
          <button className="btn" onClick={midi} disabled={busy} aria-label="Download MIDI">
            <FileMusic aria-hidden="true" width={18} height={18} /> MIDI
          </button>
        </div>
        <div className="format">
          <div>
            <strong>Cover art</strong>
            <small>A 1600 × 1600 picture of your finished tree.</small>
          </div>
          <button className="btn" onClick={cover} disabled={busy} aria-label="Download cover art">
            <Image aria-hidden="true" width={18} height={18} /> PNG
          </button>
        </div>
      </div>

      <div className="inline" style={{ flexWrap: 'wrap', gap: 16 }}>
        <label className="switch" style={{ flex: 1, minWidth: 200 }}>
          <span className="txt">
            <span>Include atmosphere</span>
            <small>Rain, wind and the other layers you chose.</small>
          </span>
          <input type="checkbox" role="switch" checked={withAmb} onChange={(e) => setWithAmb(e.target.checked)} disabled={busy} />
        </label>
        <div className="field" style={{ minWidth: 140 }}>
          <label htmlFor="bits">WAV quality</label>
          <select id="bits" className="select" value={bits} onChange={(e) => setBits(Number(e.target.value) as 16 | 24)} disabled={busy}>
            <option value={16}>16-bit (CD)</option>
            <option value={24}>24-bit (studio)</option>
          </select>
        </div>
      </div>

      <div role="status" aria-live="polite">
        {stage !== 'idle' && (
          <div style={{ display: 'grid', gap: 8 }}>
            <div className="progress" aria-hidden="true">
              <div style={{ width: `${pct}%` }} />
            </div>
            <div className="inline" style={{ justifyContent: 'space-between' }}>
              <span className="muted">{msg}</span>
              {busy && (
                <button className="btn" onClick={() => {
                  job.current++;
                  setStage('idle');
                  ui({ exporting: false });
                }}>
                  Cancel
                </button>
              )}
              {stage === 'error' && (
                <button className="btn" onClick={() => run('wav')}>
                  Try again
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="inline" style={{ flexWrap: 'wrap' }}>
        <button className="btn" onClick={copy}>
          <Link aria-hidden="true" width={16} height={16} /> Copy share link
        </button>
        <button className="btn" onClick={saveToGarden}>
          <BookmarkPlus aria-hidden="true" width={16} height={16} /> Save to my garden
        </button>
      </div>
    </Modal>
  );
}
