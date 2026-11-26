// Canvas 2D renderer for the garden. It never schedules audio: every frame it reads the audible
// time and derives what has grown, what is sounding and which blossoms have opened from the Score,
// so sight and sound cannot drift apart (and seeking just works).

import { createRng } from '../core/random';
import type { Palette } from '../core/music/moods';
import type { Score } from '../core/music/score';
import type { RecursionTrace } from '../core/worlds/types';
import { mixPalette, paletteRgb, rgba, mixRgb, type PaletteRGB, type RGB } from './color';

interface SceneNode {
  pts: Float32Array;
  cum: Float32Array;
  total: number;
  depth: number;
  width: number;
  start: number;
  grow: number;
  leaf: boolean;
  /** time of this node's own attacked note (lead, ornament, bell), or -1 */
  noteTime: number;
  noteVel: number;
  bellTime: number;
  /** parent index, or -1 for the trunk */
  parent: number;
  /** nodes in this branch's sub-call (itself included); they are contiguous in call order */
  span: number;
}

interface Scene {
  trace: RecursionTrace;
  nodes: SceneNode[];
  byDepth: number[][];
  maxDepth: number;
  bounds: RecursionTrace['bounds'];
  end: number;
  bornAt: number;
  fadeOutAt: number | null;
  /** node ids sorted by when they start (for finding the call that is running now) */
  byStart: number[];
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
}

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

export class GardenRenderer {
  private ctx: CanvasRenderingContext2D;
  private w = 1;
  private h = 1;
  private dpr = 1;
  private scene: Scene | null = null;
  private prev: Scene | null = null;
  private palFrom: PaletteRGB;
  private palTo: PaletteRGB;
  private palChangedAt = -10;
  private pal: PaletteRGB;
  private blossomSprite: HTMLCanvasElement | null = null;
  private glowSprite: HTMLCanvasElement | null = null;
  private spriteKey = '';
  private stars: Array<{ x: number; y: number; r: number; p: number; f: number }> = [];
  private flies: Array<{ x: number; y: number; ax: number; ay: number; fx: number; fy: number; p: number; f: number; r: number }> = [];
  private sparks: Spark[] = [];
  private lastT = 0;
  private insets: Insets = { top: 72, right: 24, bottom: 180, left: 24 };
  private cam = { s: 1, x: 0, y: 0, ready: false };
  reducedMotion = false;
  /** the branch whose sub-call is under the pointer (its whole subtree glows) */
  hover: number | null = null;

  /** the grown branch nearest to a screen point (CSS px), or null */
  pick(px: number, py: number, t: number): number | null {
    const scene = this.scene;
    if (!scene) return null;
    const cam = this.cam;
    const wx = (px - cam.x) / cam.s;
    const wy = (py - cam.y) / cam.s;
    const reach = 14 / cam.s;
    let best: number | null = null;
    let bestD = Infinity;
    scene.nodes.forEach((n, id) => {
      if (t < n.start) return;
      for (let k = 1; k < n.cum.length; k++) {
        const x1 = n.pts[k * 2 - 2];
        const y1 = n.pts[k * 2 - 1];
        const x2 = n.pts[k * 2];
        const y2 = n.pts[k * 2 + 1];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len2 = dx * dx + dy * dy || 1;
        const u = Math.max(0, Math.min(1, ((wx - x1) * dx + (wy - y1) * dy) / len2));
        const d = Math.hypot(wx - (x1 + u * dx), wy - (y1 + u * dy)) - n.width / 2;
        if (d < bestD) {
          bestD = d;
          best = id;
        }
      }
    });
    return bestD <= reach ? best : null;
  }

  /** the call running at time t: the latest node to have started */
  private currentNode(scene: Scene, t: number): number {
    const order = scene.byStart;
    let lo = 0;
    let hi = order.length - 1;
    let found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (scene.nodes[order[mid]].start <= t) {
        found = order[mid];
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return found;
  }

  constructor(private canvas: HTMLCanvasElement, palette: Palette, private opts: { maxDpr?: number; staticMode?: boolean } = {}) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D is not available.');
    this.ctx = ctx;
    this.pal = this.palFrom = this.palTo = paletteRgb(palette);
    const rng = createRng('sky');
    this.stars = Array.from({ length: 90 }, () => ({ x: rng(), y: rng() * 0.75, r: rng.range(0.4, 1.3), p: rng() * Math.PI * 2, f: rng.range(0.08, 0.25) }));
    this.flies = Array.from({ length: 56 }, () => ({
      x: rng(),
      y: rng.range(0.15, 0.95),
      ax: rng.range(0.02, 0.07),
      ay: rng.range(0.015, 0.05),
      fx: rng.range(0.012, 0.035),
      fy: rng.range(0.01, 0.03),
      p: rng() * Math.PI * 2,
      f: rng.range(0.1, 0.3),
      r: rng.range(0.8, 1.8),
    }));
  }

  setInsets(i: Insets) {
    this.insets = i;
  }

  resize(width: number, height: number) {
    this.dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDpr ?? 2);
    this.w = Math.max(1, width);
    this.h = Math.max(1, height);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
  }

  setPalette(p: Palette, instant = false) {
    const target = paletteRgb(p);
    this.palFrom = this.pal;
    this.palTo = target;
    this.palChangedAt = instant ? -10 : performance.now() / 1000;
    if (instant) this.pal = this.palFrom = target;
  }

  setScene(trace: RecursionTrace, score: Score) {
    const now = performance.now() / 1000;
    if (this.scene) {
      this.prev = this.scene;
      this.prev.fadeOutAt = now;
    }
    const nodes: SceneNode[] = trace.nodes.map((n) => {
      const pts = Float32Array.from(n.points);
      const cum = new Float32Array(pts.length / 2);
      let total = 0;
      for (let i = 1; i < cum.length; i++) {
        total += Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1]);
        cum[i] = total;
      }
      const timing = score.nodeTimes[n.id] ?? { start: 0, grow: 1, sounding: false };
      return {
        pts,
        cum,
        total,
        depth: n.depth,
        width: n.width,
        start: timing.start,
        grow: Math.max(0.3, timing.grow),
        leaf: n.isLeaf,
        noteTime: -1,
        noteVel: 0,
        bellTime: -1,
        parent: n.parentId ?? -1,
        span: (n.order.ret - n.order.call + 1) / 2,
      };
    });
    for (const note of score.notes) {
      const sn = nodes[note.nodeId];
      if (!sn) continue;
      if (note.voice === 'bell') {
        if (sn.bellTime < 0) sn.bellTime = note.time;
      } else if ((note.voice === 'lead' || note.voice === 'ornament') && sn.noteTime < 0) {
        sn.noteTime = note.time;
        sn.noteVel = note.velocity;
      }
    }
    const byDepth: number[][] = Array.from({ length: trace.maxDepth + 1 }, () => []);
    trace.nodes.forEach((n) => byDepth[n.depth].push(n.id));
    const byStart = nodes.map((_, i) => i).sort((a, b) => nodes[a].start - nodes[b].start || a - b);
    this.scene = { trace, nodes, byDepth, maxDepth: trace.maxDepth, bounds: trace.bounds, end: score.duration, bornAt: now, fadeOutAt: null, byStart };
    this.hover = null;
    this.sparks = [];
  }

  clearScene() {
    if (this.scene) {
      this.prev = this.scene;
      this.prev.fadeOutAt = performance.now() / 1000;
    }
    this.scene = null;
  }

  private ensureSprites() {
    const key = rgba(this.palTo.blossom) + rgba(this.palTo.firefly);
    if (key === this.spriteKey && this.blossomSprite) return;
    this.spriteKey = key;
    const mk = (size: number, draw: (c: CanvasRenderingContext2D, s: number) => void) => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      const c = cv.getContext('2d');
      if (c) draw(c, size);
      return cv;
    };
    const b = this.palTo.blossom;
    const tip = this.palTo.tip;
    this.blossomSprite = mk(64, (c, s) => {
      const r = s / 2;
      const g = c.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, rgba(mixRgb(b, [255, 255, 255], 0.6), 0.95));
      g.addColorStop(0.25, rgba(b, 0.8));
      g.addColorStop(0.6, rgba(b, 0.18));
      g.addColorStop(1, rgba(b, 0));
      c.fillStyle = g;
      c.fillRect(0, 0, s, s);
      // five soft petals
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const px = r + Math.cos(a) * r * 0.32;
        const py = r + Math.sin(a) * r * 0.32;
        const pg = c.createRadialGradient(px, py, 0, px, py, r * 0.3);
        pg.addColorStop(0, rgba(tip, 0.35));
        pg.addColorStop(1, rgba(tip, 0));
        c.fillStyle = pg;
        c.beginPath();
        c.arc(px, py, r * 0.3, 0, Math.PI * 2);
        c.fill();
      }
    });
    const f = this.palTo.firefly;
    this.glowSprite = mk(32, (c, s) => {
      const r = s / 2;
      const g = c.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, rgba(mixRgb(f, [255, 255, 255], 0.5), 1));
      g.addColorStop(0.2, rgba(f, 0.6));
      g.addColorStop(1, rgba(f, 0));
      c.fillStyle = g;
      c.fillRect(0, 0, s, s);
    });
  }

  /** draw one frame. `t` is the audible score time in seconds; `wall` is performance.now()/1000 */
  frame(t: number, wall: number, playing: boolean) {
    const { ctx } = this;
    const rm = this.reducedMotion;
    // palette crossfade over 3 s
    const pm = clamp01((wall - this.palChangedAt) / 3);
    this.pal = pm >= 1 ? this.palTo : mixPalette(this.palFrom, this.palTo, easeInOut(pm));
    this.ensureSprites();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawSky(wall);

    if (this.prev) {
      const a = 1 - clamp01((wall - (this.prev.fadeOutAt ?? wall)) / 1.4);
      if (a <= 0) this.prev = null;
      else this.drawScene(this.prev, Infinity, wall, a, false);
    }
    if (this.scene) {
      const a = clamp01((wall - this.scene.bornAt) / 0.9);
      // detect bells that just rang, for sparks (ignore jumps from seeking)
      if (playing && !rm && t > this.lastT && t - this.lastT < 0.5) this.spawnSparks(this.scene, this.lastT, t, wall);
      this.drawScene(this.scene, t, wall, a, true);
    }
    this.lastT = t;
    this.drawSparks(wall);
    this.drawFireflies(wall);
    this.drawVignette();
  }

  private camera(scene: Scene, wall: number) {
    const b = scene.bounds;
    const bw = Math.max(1, b.maxX - b.minX);
    const bh = Math.max(1, b.maxY - b.minY);
    const i = this.insets;
    const aw = Math.max(80, this.w - i.left - i.right);
    const ah = Math.max(80, this.h - i.top - i.bottom);
    let s = Math.min(aw / bw, ah / bh) * 0.92;
    if (!this.reducedMotion && !this.opts.staticMode) s *= 1 + 0.01 * Math.sin((wall * Math.PI * 2) / 10);
    const cx = i.left + aw / 2 - (b.minX + bw / 2) * s;
    const cy = i.top + ah / 2 - (b.minY + bh / 2) * s;
    // ease the camera toward the target so opening panels shifts the tree gently
    if (!this.cam.ready || this.opts.staticMode) this.cam = { s, x: cx, y: cy, ready: true };
    else {
      const k = 0.06;
      this.cam.s += (s - this.cam.s) * k;
      this.cam.x += (cx - this.cam.x) * k;
      this.cam.y += (cy - this.cam.y) * k;
    }
    return this.cam;
  }

  private drawSky(wall: number) {
    const { ctx, w, h, pal } = this;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(pal.bg0));
    g.addColorStop(0.65, rgba(pal.bg1));
    g.addColorStop(1, rgba(mixRgb(pal.bg1, pal.horizon, 0.12)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // horizon glow, breathing on a 10 s cycle
    const breathe = this.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin((wall * Math.PI * 2) / 10);
    const hg = ctx.createRadialGradient(w / 2, h * 1.08, 0, w / 2, h * 1.08, Math.max(w, h) * 0.75);
    hg.addColorStop(0, rgba(pal.horizon, 0.2 + 0.05 * breathe));
    hg.addColorStop(0.45, rgba(pal.horizon, 0.06));
    hg.addColorStop(1, rgba(pal.horizon, 0));
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, w, h);
    // stars, slowly twinkling
    for (const s of this.stars) {
      const tw = this.reducedMotion ? 0.6 : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(wall * s.f * Math.PI * 2 + s.p));
      ctx.fillStyle = `rgba(238,241,248,${0.5 * tw})`;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // ground mist
    const mg = ctx.createLinearGradient(0, h * 0.78, 0, h);
    mg.addColorStop(0, rgba(pal.bg1, 0));
    mg.addColorStop(1, rgba(mixRgb(pal.bg1, pal.horizon, 0.08), 0.85));
    ctx.fillStyle = mg;
    ctx.fillRect(0, h * 0.78, w, h * 0.22);
  }

  private drawScene(scene: Scene, t: number, wall: number, alpha: number, live: boolean) {
    const { ctx, pal } = this;
    const cam = live ? this.camera(scene, wall) : this.cam;
    const b = scene.bounds;
    const height = Math.max(1, b.maxY - b.minY);
    const baseY = b.maxY;
    const amp = this.reducedMotion || this.opts.staticMode ? 0 : height * 0.011;
    const T = wall;
    const swayX = (x: number, y: number) => {
      if (amp === 0) return 0;
      const hh = clamp01((baseY - y) / height);
      return (Math.sin(T * 0.78 + y * 0.011) * 0.65 + Math.sin(T * 0.43 + x * 0.013 + 1.7) * 0.35) * amp * Math.pow(hh, 1.6);
    };
    const sx = (x: number, y: number) => (x + swayX(x, y)) * cam.s + cam.x;
    const sy = (y: number) => y * cam.s + cam.y;
    const D = Math.max(1, scene.maxDepth);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const paths: Path2D[] = [];
    const widths: number[] = [];
    const active: Array<{ i: number; glow: number }> = [];
    for (let d = 0; d <= scene.maxDepth; d++) {
      const path = new Path2D();
      let any = false;
      let wsum = 0;
      let wcount = 0;
      for (const id of scene.byDepth[d]) {
        const n = scene.nodes[id];
        const raw = (t - n.start) / n.grow;
        if (raw <= 0) continue;
        const p = easeOutCubic(clamp01(raw));
        const target = p * n.total;
        const pts = n.pts;
        path.moveTo(sx(pts[0], pts[1]), sy(pts[1]));
        for (let k = 1; k < n.cum.length; k++) {
          if (n.cum[k] <= target) {
            path.lineTo(sx(pts[k * 2], pts[k * 2 + 1]), sy(pts[k * 2 + 1]));
          } else {
            const seg = n.cum[k] - n.cum[k - 1];
            const f = seg > 0 ? (target - n.cum[k - 1]) / seg : 1;
            const x = pts[k * 2 - 2] + (pts[k * 2] - pts[k * 2 - 2]) * f;
            const y = pts[k * 2 - 1] + (pts[k * 2 + 1] - pts[k * 2 - 1]) * f;
            path.lineTo(sx(x, y), sy(y));
            break;
          }
        }
        any = true;
        wsum += n.width;
        wcount++;
        if (n.noteTime >= 0 && t >= n.noteTime && t - n.noteTime < 2.2) {
          const x = t - n.noteTime;
          const env = x < 0.08 ? x / 0.08 : Math.exp(-(x - 0.08) / 0.7);
          active.push({ i: id, glow: env * (0.5 + n.noteVel) });
        }
      }
      paths.push(any ? path : new Path2D());
      widths.push(wcount ? wsum / wcount : 1);
    }

    // trunk-to-tip colour; a wide, low-alpha 'lighter' pass adds the glow
    ctx.globalAlpha = alpha;
    for (let d = 0; d < paths.length; d++) {
      const f = d / D;
      ctx.strokeStyle = rgba(mixRgb(pal.trunk, pal.tip, 0.16 + 0.84 * Math.pow(f, 0.9)), 0.96);
      ctx.lineWidth = Math.max(0.7, widths[d] * cam.s * 0.9);
      ctx.stroke(paths[d]);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let d = 1; d < paths.length; d++) {
      const f = d / D;
      ctx.strokeStyle = rgba(mixRgb(pal.accent, pal.tip, f), 0.045 + 0.075 * f);
      ctx.lineWidth = Math.min(14, Math.max(2.5, widths[d] * cam.s * 1.7 + 3));
      ctx.stroke(paths[d]);
    }
    // the branches whose notes are sounding brighten with the note's loudness
    for (const a of active) {
      const n = scene.nodes[a.i];
      const pts = n.pts;
      ctx.beginPath();
      ctx.moveTo(sx(pts[0], pts[1]), sy(pts[1]));
      for (let k = 1; k < n.cum.length; k++) ctx.lineTo(sx(pts[k * 2], pts[k * 2 + 1]), sy(pts[k * 2 + 1]));
      ctx.strokeStyle = rgba(mixRgb(pal.tip, [255, 255, 255], 0.35), 0.35 * a.glow);
      ctx.lineWidth = Math.max(2, n.width * cam.s * 1.6 + 2);
      ctx.stroke();
    }

    if (live) {
      const stroke = (i: number) => {
        const n = scene.nodes[i];
        const pts = n.pts;
        ctx.moveTo(sx(pts[0], pts[1]), sy(pts[1]));
        for (let k = 1; k < n.cum.length; k++) ctx.lineTo(sx(pts[k * 2], pts[k * 2 + 1]), sy(pts[k * 2 + 1]));
      };
      // the sub-call under the pointer: its whole subtree glows
      if (this.hover !== null && scene.nodes[this.hover]) {
        const h = scene.nodes[this.hover];
        ctx.beginPath();
        for (let i = this.hover; i < this.hover + h.span; i++) if (t >= scene.nodes[i].start) stroke(i);
        ctx.strokeStyle = rgba(mixRgb(pal.accent, [255, 255, 255], 0.25), 0.28);
        ctx.lineWidth = Math.max(5, h.width * cam.s * 1.2 + 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sx(h.pts[0], h.pts[1]), sy(h.pts[1]), 7, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(pal.accent, 0.9);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      // the live call stack, drawn on the tree: trunk → … → the branch that is running now
      const cur = this.currentNode(scene, t);
      if (cur >= 0 && t < scene.end + 1) {
        ctx.beginPath();
        for (let i = cur; i >= 0; i = scene.nodes[i].parent) stroke(i);
        ctx.strokeStyle = rgba(mixRgb(pal.accent2, [255, 255, 255], 0.35), 0.55);
        ctx.lineWidth = 2.2;
        ctx.stroke();
        // one bead per stack frame, at the start of each call
        ctx.fillStyle = rgba(mixRgb(pal.accent2, [255, 255, 255], 0.5), 0.9);
        for (let i = cur; i >= 0; i = scene.nodes[i].parent) {
          const n = scene.nodes[i];
          ctx.beginPath();
          ctx.arc(sx(n.pts[0], n.pts[1]), sy(n.pts[1]), i === cur ? 3.6 : 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // blossoms open when their bell rings, then breathe slowly
    if (this.blossomSprite) {
      const sprite = this.blossomSprite;
      const base = Math.max(7, Math.min(18, cam.s * (scene.trace.worldId === 'grove' ? 3.2 : 4.5)));
      for (let i = 0; i < scene.nodes.length; i++) {
        const n = scene.nodes[i];
        if (!n.leaf) continue;
        const open = n.bellTime >= 0 ? n.bellTime : n.start + n.grow;
        const x = t - open;
        if (x <= 0) continue;
        const s = easeOutCubic(clamp01(x / 1.4));
        const breathe = this.reducedMotion ? 0.85 : 0.7 + 0.3 * (0.5 + 0.5 * Math.sin((wall * Math.PI * 2) / (6 + (i % 5)) + i * 0.7));
        const ring = n.bellTime >= 0 && x < 2.5 ? Math.exp(-x / 0.9) * 0.6 : 0;
        const size = base * (n.bellTime >= 0 ? 1 : 0.6) * s * (1 + ring);
        const k = n.pts.length - 2;
        const px = sx(n.pts[k], n.pts[k + 1]);
        const py = sy(n.pts[k + 1]);
        ctx.globalAlpha = alpha * Math.min(1, breathe + ring);
        ctx.drawImage(sprite, px - size, py - size, size * 2, size * 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  private spawnSparks(scene: Scene, t0: number, t1: number, wall: number) {
    const cam = this.cam;
    for (const n of scene.nodes) {
      if (n.bellTime < 0 || n.bellTime <= t0 || n.bellTime > t1) continue;
      const k = n.pts.length - 2;
      const rng = createRng(`spark:${n.bellTime}`);
      const count = rng.int(3, 5);
      for (let i = 0; i < count && this.sparks.length < 120; i++) {
        this.sparks.push({
          x: n.pts[k] * cam.s + cam.x,
          y: n.pts[k + 1] * cam.s + cam.y,
          vx: rng.range(-9, 9),
          vy: rng.range(-16, -5),
          born: wall,
          life: rng.range(1.6, 2.6),
        });
      }
    }
  }

  private drawSparks(wall: number) {
    if (!this.glowSprite || this.sparks.length === 0) return;
    const { ctx } = this;
    ctx.globalCompositeOperation = 'lighter';
    this.sparks = this.sparks.filter((s) => wall - s.born < s.life);
    for (const s of this.sparks) {
      const age = wall - s.born;
      const a = Math.sin(Math.PI * clamp01(age / s.life)) * 0.8;
      const x = s.x + s.vx * age;
      const y = s.y + s.vy * age;
      ctx.globalAlpha = a;
      ctx.drawImage(this.glowSprite, x - 6, y - 6, 12, 12);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawFireflies(wall: number) {
    if (!this.glowSprite) return;
    const { ctx, w, h } = this;
    ctx.globalCompositeOperation = 'lighter';
    for (const f of this.flies) {
      const T = this.reducedMotion ? 0 : wall;
      const x = (f.x + Math.sin(T * f.fx * Math.PI * 2 + f.p) * f.ax) * w;
      const y = (f.y + Math.cos(T * f.fy * Math.PI * 2 + f.p * 1.3) * f.ay) * h;
      const glow = this.reducedMotion ? 0.35 : Math.pow(0.5 + 0.5 * Math.sin(wall * f.f * Math.PI * 2 + f.p), 3);
      ctx.globalAlpha = 0.12 + 0.55 * glow;
      const s = 6 + f.r * 4;
      ctx.drawImage(this.glowSprite, x - s, y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawVignette() {
    const { ctx, w, h } = this;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.8);
    g.addColorStop(0, 'rgba(5,8,16,0)');
    g.addColorStop(1, 'rgba(5,8,16,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  /** a still frame of the fully grown tree, for cover art */
  drawStill() {
    this.prev = null;
    this.frame(1e9, (this.scene?.bornAt ?? 0) + 30, false);
  }

  get tipColor(): RGB {
    return this.pal.tip;
  }
}
