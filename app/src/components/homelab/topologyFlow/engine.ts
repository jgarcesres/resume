// engine.ts — canvas renderer for the live map. No React in here: the component
// hands it a scene (which flows are playing, which nodes are off) and it draws
// the geography, the links, the glyphs and the packets. Labels are DOM, drawn
// by the component on top, so text stays crisp, selectable and focusable.

import {
  HEARTBEATS, HULLS, LAYOUTS, NODES, STATIC_LINKS, nodeById, project,
  type Flow, type FlowKind, type FlowNode, type Kind, type Layout, type LayoutId,
} from './data';
import { LAND, isLandCell } from './land';

type XY = [number, number];

export interface Palette {
  bg: string;
  land: string;
  ink: string;
  dim: string;
  glyphFill: string;
  kinds: Record<Kind, string>;
  sites: { fl: string; mde: string };
  flows: Record<FlowKind, string>;
  tunnel: string;
  /** RPG mode: square dots and square packets. */
  square: boolean;
}

export interface Scene {
  flows: Flow[];
  /** Flows from earlier steps of the same story, left behind as a faint trace. */
  trail: Flow[];
  down: Set<string>;
  /** Lower bound for the step, so there is time to read the caption. */
  minSeconds: number;
}

interface Track { pts: XY[]; cum: number[]; len: number }

const EMPTY: Scene = { flows: [], trail: [], down: new Set(), minSeconds: 0 };
const SAMPLES = 26;

export function nodePos(layoutId: LayoutId, node: FlowNode): XY {
  if (node.geo) return project(LAYOUTS[layoutId], node.geo[0], node.geo[1]);
  const placed = node[layoutId];
  if (!placed) throw new Error(`topologyFlow: "${node.id}" has no ${layoutId} position`);
  return placed.at;
}

function hullRect(layoutId: LayoutId, id: string): [number, number, number, number] | undefined {
  return HULLS.find(h => h.id === id)?.[layoutId];
}

/** Where a link meets a node: the glyph centre, or the nearest edge of a host's outline. */
function anchor(layoutId: LayoutId, node: FlowNode, toward: XY): XY {
  const rect = node.kind === 'host' ? hullRect(layoutId, node.id) : undefined;
  if (!rect) return nodePos(layoutId, node);
  const [x, y, w, h] = rect;
  return [Math.max(x, Math.min(x + w, toward[0])), Math.max(y, Math.min(y + h, toward[1]))];
}

/** Sampled curve for one hop. Both directions share one curve, so a reply retraces the request. */
function hopPoints(layoutId: LayoutId, fromId: string, toId: string): XY[] {
  const flip = fromId > toId;
  const a = nodeById(flip ? toId : fromId);
  const b = nodeById(flip ? fromId : toId);
  const p0 = anchor(layoutId, a, nodePos(layoutId, b));
  const p1 = anchor(layoutId, b, nodePos(layoutId, a));
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
  const dist = Math.hypot(dx, dy) || 1;

  let bend = 0;
  if (a.kind === 'gateway' && b.kind === 'gateway') bend = 0.2;
  else if (a.site === 'net' || b.site === 'net') bend = 0.16;
  else if (dist > 130) bend = 0.1;
  // Perpendicular, flipped so the bulge always leans east (and north on ties).
  let nx = -dy / dist, ny = dx / dist;
  if (nx < 0 || (nx === 0 && ny > 0)) { nx = -nx; ny = -ny; }
  const cx = (p0[0] + p1[0]) / 2 + nx * dist * bend;
  const cy = (p0[1] + p1[1]) / 2 + ny * dist * bend;

  const pts: XY[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES, u = 1 - t;
    pts.push([u * u * p0[0] + 2 * u * t * cx + t * t * p1[0], u * u * p0[1] + 2 * u * t * cy + t * t * p1[1]]);
  }
  return flip ? pts.reverse() : pts;
}

function buildTrack(layoutId: LayoutId, path: string[]): Track {
  const pts: XY[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const hop = hopPoints(layoutId, path[i], path[i + 1]);
    pts.push(...(i === 0 ? hop : hop.slice(1)));
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  return { pts, cum, len: cum[cum.length - 1] ?? 0 };
}

function pointAt(track: Track, d: number): XY {
  const { pts, cum } = track;
  if (d <= 0) return pts[0];
  if (d >= track.len) return pts[pts.length - 1];
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= d) lo = mid; else hi = mid;
  }
  const f = (d - cum[lo]) / (cum[hi] - cum[lo] || 1);
  return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * f, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * f];
}

function convexHull(points: XY[]): XY[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: XY, a: XY, b: XY) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (src: XY[]) => {
    const out: XY[] = [];
    for (const q of src) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop();
      out.push(q);
    }
    out.pop();
    return out;
  };
  return [...half(p), ...half(p.reverse())];
}

/**
 * The outline of a site: a rounded blob around its machines that tapers to a
 * point at the gateway, i.e. at the place on the map where the site really is.
 */
export function siteOutline(layoutId: LayoutId, site: 'fl' | 'mde', pad: number): XY[] {
  const pts: XY[] = [];
  const ring = (x: number, y: number) => {
    for (let a = 0; a < 24; a++) pts.push([x + Math.cos((a / 24) * Math.PI * 2) * pad, y + Math.sin((a / 24) * Math.PI * 2) * pad]);
  };
  for (const n of NODES) {
    if (n.site !== site) continue;
    if (n.kind === 'gateway') { pts.push(nodePos(layoutId, n)); continue; }
    const rect = n.kind === 'host' ? hullRect(layoutId, n.id) : undefined;
    if (rect) {
      const [x, y, w, h] = rect;
      ring(x, y); ring(x + w, y); ring(x, y + h); ring(x + w, y + h);
    } else {
      const [x, y] = nodePos(layoutId, n);
      // Leave room for the label under the glyph.
      ring(x, y); ring(x, y + 14);
    }
  }
  return convexHull(pts);
}

/** Midpoint of the tunnel between the gateways, for its label. */
export function tunnelMid(layoutId: LayoutId): XY {
  const track = buildTrack(layoutId, ['fl-gw', 'mde-gw']);
  return pointAt(track, track.len * 0.6);
}

const SPEED: Record<LayoutId, number> = { wide: 190, tall: 150 };
const GAP_SECONDS = 0.26;

export class FlowEngine {
  onProgress?: (fraction: number) => void;
  onStepEnd?: () => void;

  private ctx: CanvasRenderingContext2D | null = null;
  private land: HTMLCanvasElement | null = null;
  private layoutId: LayoutId = 'wide';
  private cssW = 0;
  private cssH = 0;
  private dpr = 1;
  private palette: Palette | null = null;

  private scene: Scene = EMPTY;
  private tracks: { flow: Flow; track: Track }[] = [];
  private trailTracks: { flow: Flow; track: Track }[] = [];
  private staticTracks: { kind: FlowKind; from: string; to: string; track: Track }[] = [];
  private beatTracks: { from: string; to: string; track: Track }[] = [];
  private tunnel: Track | null = null;
  private outlines: { site: 'fl' | 'mde'; pts: XY[] }[] = [];
  private active = new Set<string>();

  private stepT = 0;
  private clock = 0;
  private duration = 0;
  private ended = false;
  private running = false;
  private visible = true;
  private reduced = false;
  private raf = 0;
  private last = 0;

  constructor(private canvas: HTMLCanvasElement) {
    try { this.ctx = canvas.getContext('2d'); } catch { this.ctx = null; }
  }

  get supported(): boolean { return this.ctx !== null; }

  resize(layoutId: LayoutId, cssW: number): void {
    const layout = LAYOUTS[layoutId];
    this.layoutId = layoutId;
    this.cssW = cssW;
    this.cssH = Math.round((cssW * layout.h) / layout.w);
    this.dpr = Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.cssW * this.dpr);
    this.canvas.height = Math.round(this.cssH * this.dpr);
    this.rebuildGeometry();
    this.land = null;
    this.setScene(this.scene, false);
    this.kick();
  }

  setPalette(palette: Palette): void {
    this.palette = palette;
    this.land = null;
    this.kick();
  }

  setReducedMotion(reduced: boolean): void {
    this.reduced = reduced;
    this.kick();
  }

  /** Starts a new step. `restart: false` keeps the step clock (used on resize). */
  setScene(scene: Scene, restart = true): void {
    this.scene = scene;
    this.tracks = scene.flows.map(flow => ({ flow, track: buildTrack(this.layoutId, flow.path) }));
    this.trailTracks = scene.trail.map(flow => ({ flow, track: buildTrack(this.layoutId, flow.path) }));
    this.active = new Set(scene.flows.flatMap(f => f.path));
    const speed = SPEED[this.layoutId];
    let travel = 0;
    for (const { flow, track } of this.tracks) travel = Math.max(travel, (flow.delay ?? 0) + track.len / speed);
    this.duration = Math.max(scene.minSeconds, travel + 1.6);
    if (restart) { this.stepT = 0; this.ended = false; }
    this.kick();
  }

  setRunning(running: boolean): void {
    this.running = running;
    this.kick();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.kick();
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.onProgress = undefined;
    this.onStepEnd = undefined;
  }

  // ── loop ───────────────────────────────────────────────────────────────

  private get animating(): boolean {
    return this.ctx !== null && this.visible && this.running && !this.reduced && this.cssW > 0;
  }

  private kick(): void {
    if (!this.ctx || this.cssW === 0) return;
    if (this.animating) {
      if (!this.raf) { this.last = 0; this.raf = requestAnimationFrame(this.frame); }
    } else {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.draw();
    }
  }

  private frame = (now: number): void => {
    this.raf = 0;
    if (!this.animating) { this.draw(); return; }
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0;
    this.last = now;
    this.clock += dt;
    this.stepT += dt;
    this.draw();
    this.onProgress?.(this.duration ? Math.min(1, this.stepT / this.duration) : 0);
    if (!this.ended && this.duration > 0 && this.stepT >= this.duration) {
      this.ended = true;
      this.onStepEnd?.();
    }
    if (this.animating && !this.raf) this.raf = requestAnimationFrame(this.frame);
  };

  // ── geometry ───────────────────────────────────────────────────────────

  private rebuildGeometry(): void {
    const id = this.layoutId;
    this.staticTracks = STATIC_LINKS.map(l => ({ ...l, track: buildTrack(id, [l.from, l.to]) }));
    this.beatTracks = HEARTBEATS.map(([from, to]) => ({ from, to, track: buildTrack(id, [from, to]) }));
    this.tunnel = buildTrack(id, ['fl-gw', 'mde-gw']);
    this.outlines = (['fl', 'mde'] as const).map(site => ({ site, pts: siteOutline(id, site, id === 'wide' ? 30 : 24) }));
  }

  private get scale(): number { return this.cssW / LAYOUTS[this.layoutId].w; }

  /** Glyph radius in design units, so it stays about the same size on screen. */
  private get r(): number { return Math.max(8, Math.min(11.5, 10.5 * this.scale)) / this.scale; }

  // ── land layer ─────────────────────────────────────────────────────────

  private buildLand(): HTMLCanvasElement | null {
    if (!this.palette || typeof document === 'undefined') return null;
    const layout: Layout = LAYOUTS[this.layoutId];
    const c = document.createElement('canvas');
    c.width = this.canvas.width;
    c.height = this.canvas.height;
    const g = c.getContext('2d');
    if (!g) return null;
    const k = this.scale * this.dpr;
    g.setTransform(k, 0, 0, k, 0, 0);
    g.fillStyle = this.palette.land;

    // Thin the dots out under the machines and their labels.
    const quiet: [number, number, number][] = [];
    for (const n of NODES) {
      if (n.kind === 'gateway' || n.kind === 'host') continue;
      const [x, y] = nodePos(this.layoutId, n);
      quiet.push([x, y + 8, 34]);
    }
    const rects = HULLS.map(h => h[this.layoutId]);

    const pitch = layout.ppd * LAND.step;
    const dot = pitch * 0.22;
    const c0 = Math.max(0, Math.floor((layout.lon0 - LAND.lon0) / LAND.step) - 1);
    const c1 = Math.min(LAND.cols, c0 + Math.ceil(layout.w / pitch) + 3);
    const r0 = Math.max(0, Math.floor((LAND.lat1 - layout.latTop) / LAND.step) - 1);
    const r1 = Math.min(LAND.rows, r0 + Math.ceil(layout.h / pitch) + 3);
    for (let row = r0; row < r1; row++) {
      for (let col = c0; col < c1; col++) {
        if (!isLandCell(row, col)) continue;
        const [x, y] = project(layout, LAND.lon0 + (col + 0.5) * LAND.step, LAND.lat1 - (row + 0.5) * LAND.step);
        let a = 1;
        for (const [qx, qy, qr] of quiet) {
          const d = Math.hypot(x - qx, y - qy);
          if (d < qr + 16) a = Math.min(a, d < qr ? 0.28 : 0.28 + (0.72 * (d - qr)) / 16);
        }
        for (const [rx, ry, rw, rh] of rects) {
          if (x > rx - 6 && x < rx + rw + 6 && y > ry - 6 && y < ry + rh + 6) a = Math.min(a, 0.28);
        }
        g.globalAlpha = a;
        if (this.palette.square) g.fillRect(x - dot, y - dot, dot * 2, dot * 2);
        else { g.beginPath(); g.arc(x, y, dot, 0, Math.PI * 2); g.fill(); }
      }
    }
    return c;
  }

  // ── drawing ────────────────────────────────────────────────────────────

  private strokeTrack(g: CanvasRenderingContext2D, track: Track): void {
    g.beginPath();
    g.moveTo(track.pts[0][0], track.pts[0][1]);
    for (let i = 1; i < track.pts.length; i++) g.lineTo(track.pts[i][0], track.pts[i][1]);
    g.stroke();
  }

  private draw(): void {
    const g = this.ctx, P = this.palette;
    if (!g || !P || this.cssW === 0) return;
    if (!this.land) this.land = this.buildLand();
    const s = this.scale, k = s * this.dpr, px = 1 / s;
    const down = this.scene.down;
    const playing = this.tracks.length > 0;

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = P.bg;
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.land) g.drawImage(this.land, 0, 0);
    g.setTransform(k, 0, 0, k, 0, 0);
    g.lineCap = 'round';
    g.lineJoin = 'round';

    // Site outlines.
    for (const { site, pts } of this.outlines) {
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      g.fillStyle = P.sites[site];
      g.globalAlpha = 0.045;
      g.fill();
      g.strokeStyle = P.sites[site];
      g.globalAlpha = 0.3;
      g.lineWidth = px;
      g.stroke();
    }

    // Proxmox hosts: a dashed box around the VMs they run.
    g.setLineDash([3 * px, 4 * px]);
    g.lineWidth = px;
    for (const hull of HULLS) {
      const [x, y, w, h] = hull[this.layoutId];
      g.globalAlpha = this.active.has(hull.id) ? 0.95 : 0.5;
      g.strokeStyle = P.kinds.host;
      g.strokeRect(x, y, w, h);
    }
    g.setLineDash([]);

    // Standing links.
    for (const l of this.staticTracks) {
      const off = down.has(l.from) || down.has(l.to);
      g.strokeStyle = off ? P.dim : P.flows[l.kind];
      g.globalAlpha = off ? 0.18 : 0.3;
      g.lineWidth = px;
      this.strokeTrack(g, l.track);
    }

    // The WireGuard tunnel between the two gateways.
    if (this.tunnel) {
      const used = this.tracks.some(({ flow }) => flow.path.includes('fl-gw') && flow.path.includes('mde-gw'));
      g.strokeStyle = P.tunnel;
      g.globalAlpha = used ? 0.3 : 0.16;
      g.lineWidth = (used ? 7 : 5) * px;
      this.strokeTrack(g, this.tunnel);
      g.globalAlpha = used ? 0.95 : 0.7;
      g.lineWidth = 1.25 * px;
      g.setLineDash([2 * px, 7 * px]);
      g.lineDashOffset = -this.clock * 22 * px;
      this.strokeTrack(g, this.tunnel);
      g.setLineDash([]);
      g.lineDashOffset = 0;
    }

    // Earlier steps of this story.
    for (const { flow, track } of this.trailTracks) {
      g.strokeStyle = P.flows[flow.kind];
      g.globalAlpha = 0.2;
      g.lineWidth = 1.25 * px;
      this.strokeTrack(g, track);
    }

    // The step that is playing.
    const speed = SPEED[this.layoutId];
    const gap = speed * GAP_SECONDS;
    for (const { flow, track } of this.tracks) {
      const color = P.flows[flow.kind];
      g.strokeStyle = color;
      g.globalAlpha = 0.55;
      g.lineWidth = 1.5 * px;
      this.strokeTrack(g, track);

      g.fillStyle = color;
      if (this.reduced) {
        // No motion: beads along the route show the direction of travel by size.
        const beads = Math.max(2, Math.floor(track.len / 22));
        for (let i = 1; i <= beads; i++) {
          const [x, y] = pointAt(track, (i / (beads + 1)) * track.len);
          g.globalAlpha = 0.35 + 0.6 * (i / beads);
          this.dot(g, x, y, (1.2 + 1.6 * (i / beads)) * px);
        }
        continue;
      }
      const t = this.stepT - (flow.delay ?? 0);
      if (t <= 0) continue;
      const lead = t * speed;
      for (let d = lead % gap; d <= Math.min(lead, track.len); d += gap) {
        for (let j = 5; j >= 0; j--) {
          const [x, y] = pointAt(track, d - j * 3.2);
          if (d - j * 3.2 < 0) continue;
          g.globalAlpha = j === 0 ? 1 : 0.5 * (1 - j / 6);
          this.dot(g, x, y, (j === 0 ? 2.7 : 2.2 - j * 0.25) * px);
        }
        const [hx, hy] = pointAt(track, d);
        g.globalAlpha = 0.16;
        this.dot(g, hx, hy, 6.5 * px);
      }
      // Ripples where the packets land.
      const arrived = t - track.len / speed;
      if (arrived > 0) {
        const [ex, ey] = track.pts[track.pts.length - 1];
        const phase = (arrived / (GAP_SECONDS * 3)) % 1;
        g.strokeStyle = color;
        g.globalAlpha = 0.7 * (1 - phase);
        g.lineWidth = 1.25 * px;
        g.beginPath();
        g.arc(ex, ey, this.r + 3 * px + phase * 13 * px, 0, Math.PI * 2);
        g.stroke();
      }
    }

    // etcd heartbeats round the control-plane triangle.
    if (!this.reduced) {
      g.fillStyle = P.flows.cluster;
      this.beatTracks.forEach(({ from, to, track }, i) => {
        if (down.has(from) || down.has(to)) return;
        const phase = (this.clock * 0.55 + i / 3) % 1;
        const [x, y] = pointAt(track, phase * track.len);
        g.globalAlpha = (playing ? 0.45 : 0.9) * Math.sin(phase * Math.PI);
        this.dot(g, x, y, 1.7 * px);
      });
    }

    // Glyphs.
    for (const n of NODES) {
      if (n.kind === 'host') continue;
      const [x, y] = nodePos(this.layoutId, n);
      const isDown = down.has(n.id);
      const isActive = this.active.has(n.id) && !isDown;
      const color = isDown ? P.dim : P.kinds[n.kind];
      if (n.kind === 'gateway' && !this.reduced) {
        const phase = (this.clock * 0.42 + (n.site === 'mde' ? 0.5 : 0)) % 1;
        g.strokeStyle = color;
        g.globalAlpha = 0.5 * (1 - phase);
        g.lineWidth = px;
        g.beginPath();
        g.arc(x, y, this.r * (0.9 + phase * 1.9), 0, Math.PI * 2);
        g.stroke();
      }
      if (isActive) {
        g.fillStyle = color;
        g.globalAlpha = 0.16;
        g.beginPath();
        g.arc(x, y, this.r * 1.9, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = isDown ? 0.55 : playing && !isActive ? 0.62 : 1;
      this.glyph(g, n.kind, x, y, color, isActive, isDown);
    }
    g.globalAlpha = 1;
  }

  private dot(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    if (this.palette?.square) { g.fillRect(x - r, y - r, r * 2, r * 2); return; }
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  private glyph(g: CanvasRenderingContext2D, kind: Kind, x: number, y: number, color: string, active: boolean, off: boolean): void {
    const P = this.palette!;
    const r = this.r, px = 1 / this.scale;
    g.fillStyle = P.glyphFill;
    g.strokeStyle = color;
    g.lineWidth = (active ? 2 : 1.4) * px;
    if (off) g.setLineDash([2 * px, 3 * px]);

    const poly = (pts: XY[]) => {
      g.beginPath();
      pts.forEach(([a, b], i) => (i ? g.lineTo(x + a * r, y + b * r) : g.moveTo(x + a * r, y + b * r)));
      g.closePath();
      g.fill();
      g.stroke();
    };
    const mark = (draw: () => void) => {
      if (off) return;
      g.fillStyle = color;
      g.lineWidth = 1.2 * px;
      draw();
    };

    switch (kind) {
      case 'gateway':
        poly([[0, -1.05], [1.05, 0], [0, 1.05], [-1.05, 0]]);
        mark(() => { g.beginPath(); g.arc(x, y, r * 0.3, 0, Math.PI * 2); g.fill(); });
        break;
      case 'cp':
      case 'worker': {
        const hex: XY[] = [];
        for (let i = 0; i < 6; i++) hex.push([Math.cos((i / 6) * Math.PI * 2 + Math.PI / 6), Math.sin((i / 6) * Math.PI * 2 + Math.PI / 6)]);
        poly(hex);
        mark(() => {
          if (kind === 'cp') { g.beginPath(); g.arc(x, y, r * 0.34, 0, Math.PI * 2); g.fill(); }
          else g.fillRect(x - r * 0.42, y - r * 0.12, r * 0.84, r * 0.24);
        });
        break;
      }
      case 'nas':
        poly([[-0.95, -0.8], [0.95, -0.8], [0.95, 0.8], [-0.95, 0.8]]);
        mark(() => {
          g.beginPath();
          for (const dy of [-0.32, 0.22]) { g.moveTo(x - r * 0.55, y + dy * r); g.lineTo(x + r * 0.55, y + dy * r); }
          g.stroke();
        });
        break;
      case 'pi':
        poly([[-0.72, -0.72], [0.72, -0.72], [0.72, 0.72], [-0.72, 0.72]]);
        mark(() => { g.fillRect(x - r * 0.2, y - r * 0.2, r * 0.4, r * 0.4); });
        break;
      case 'ups':
        poly([[-0.95, -0.62], [0.78, -0.62], [0.78, -0.24], [1.02, -0.24], [1.02, 0.24], [0.78, 0.24], [0.78, 0.62], [-0.95, 0.62]]);
        mark(() => { g.fillRect(x - r * 0.62, y - r * 0.3, r * 0.82, r * 0.6); });
        break;
      case 'net':
      default:
        g.beginPath();
        g.arc(x, y, r * 0.86, 0, Math.PI * 2);
        g.fill();
        g.setLineDash([2.5 * px, 2.5 * px]);
        g.stroke();
        g.setLineDash([]);
        mark(() => { g.beginPath(); g.arc(x, y, r * 0.26, 0, Math.PI * 2); g.fill(); });
        break;
    }
    g.setLineDash([]);
  }
}
