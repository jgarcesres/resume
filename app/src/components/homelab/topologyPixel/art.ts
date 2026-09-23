// art.ts — procedural pixel textures for the pixel (RPG-mode) topology.
// Canvas-only: every face is painted at 10 texels per world unit and handed to
// scene.ts, which turns it into a nearest-filtered texture.
//
// Ported from the claude.ai/design "Homelab Topology Pixel" handoff.

import type { BoxNode } from '../topology3d/data';

export const P = {
  void: '#0a0e1a', deep: '#0f1628', panel: '#141c33', panel2: '#1c2745', steel: '#2a3a5c', steelL: '#3d5a8a', steelLL: '#5a7ab0',
  text: '#c8d6e5', bright: '#e8f0ff', dim: '#6b7fa3', cyan: '#00e5ff', mag: '#ff2daa', gold: '#ffd700', green: '#39ff14',
  red: '#ff3333', blue: '#4d8cff', etcd: '#7bb0ff', holo: '#4dd9ff', pcb: '#1d6b34', black: '#12141c',
} as const;

const TD = 10;
export const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, '0');
  return '#' + f(n >> 16 & 255) + f(n >> 8 & 255) + f(n & 255);
};
const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

type GlowMode = 'on' | 'blink' | 'slow';

/** A face = colour canvas + 3 emissive frames (LED activity flickers between them). */
export interface Face {
  w: number; h: number;
  c: HTMLCanvasElement;
  E: HTMLCanvasElement[];
  lit: boolean;
  r(x: number, y: number, ww: number, hh: number, col: string): Face;
  glow(x: number, y: number, ww: number, hh: number, col: string, mode?: GlowMode): Face;
  ring(x: number, y: number, col: string): Face;
  chassis(body: string, hi?: string, lo?: string): Face;
}

export function F(wu: number, hu: number, exact = false): Face {
  const w = exact ? wu : Math.max(3, Math.round(wu * TD)), h = exact ? hu : Math.max(3, Math.round(hu * TD));
  const c = mk(w, h), g = c.getContext('2d')!, E = [mk(w, h), mk(w, h), mk(w, h)], ge = E.map(e => e.getContext('2d')!);
  ge.forEach(x => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); });
  const f: Face = {
    w, h, c, E, lit: false,
    r(x, y, ww, hh, col) { g.fillStyle = col; g.fillRect(x, y, ww, hh); return f; },
    glow(x, y, ww, hh, col, mode = 'on') {
      f.lit = true;
      g.fillStyle = mode === 'on' ? col : shade(col, 0.42); g.fillRect(x, y, ww, hh);
      ge.forEach((e, i) => {
        const on = mode === 'on' || (mode === 'blink' && Math.random() < 0.55) || (mode === 'slow' && i !== 2);
        if (on) { e.fillStyle = col; e.fillRect(x, y, ww, hh); }
      });
      return f;
    },
    ring(x, y, col) { f.glow(x + 1, y, 2, 1, col); f.glow(x, y + 1, 1, 2, col); f.glow(x + 3, y + 1, 1, 2, col); f.glow(x + 1, y + 3, 2, 1, col); return f; },
    chassis(body, hi, lo) { f.r(0, 0, w, h, body); if (hi) f.r(0, 0, w, 1, hi); if (lo) f.r(0, h - 1, w, 1, lo); return f; },
  };
  return f;
}

export const plain = (w: number, h: number, body: string, hi?: string) => F(w, h).chassis(body, hi || shade(body, 1.6), shade(body, 0.6));

export interface Faces { front: Face; side: Face; top: Face; back?: Face; left?: Face }
type Painter = (n: BoxNode, size: [number, number, number]) => Faces;

// A rack/desk hypervisor: drive bays across the front.
function hypervisorFlat(n: BoxNode, [w, h, d]: [number, number, number]): Faces {
  const fr = F(w, h).chassis(P.panel2, P.steelL, P.void);
  fr.r(1, 2, 3, fr.h - 4, P.steel).glow(2, 3, 1, 1, P.green);
  if (n.id === 'mde-pve1') fr.glow(2, 5, 1, 1, P.blue, 'slow');
  const bays = n.bays || 4, bw = 4, x0 = 6;
  for (let i = 0; i < bays; i++) {
    const x = x0 + i * (bw + 1), bad = !!n.warn && i === 3;
    fr.r(x, 2, bw, fr.h - 4, P.void).r(x + 1, 3, bw - 2, fr.h - 6, bad ? '#3a2a14' : P.steel);
    for (let y = 4; y < fr.h - 4; y += 2) fr.r(x + 1, y, bw - 2, 1, bad ? '#2a1e10' : P.panel2);
    fr.glow(x + 1, fr.h - 4, 1, 1, bad ? P.gold : P.green, bad ? 'slow' : 'blink');
  }
  for (let x = x0 + bays * (bw + 1) + 1; x < fr.w - 3; x += 2) fr.r(x, 3, 1, fr.h - 6, P.deep);
  const tp = F(w, d).chassis(P.panel2, P.steelL);
  for (let y = 3; y < tp.h - 3; y += 3) tp.r(4, y, tp.w - 18, 1, P.deep);
  tp.r(tp.w - 11, 3, 8, 4, P.text).r(tp.w - 10, 4, 5, 1, P.dim).r(tp.w - 10, 6, 3, 1, P.steelL);
  const sd = F(d, h).chassis(P.panel, P.steelL, P.void);
  for (let x = 3; x < sd.w - 2; x += 4) sd.r(x, 3, 1, sd.h - 6, P.panel2);
  const bk = F(w, h).chassis(P.panel, P.steelL, P.void);
  bk.r(2, 2, 8, bk.h - 4, P.steel).r(3, 3, 6, 1, P.void);
  for (let i = 0; i < 6; i++) bk.r(14 + i * 3, 4, 2, 2, P.void);
  bk.glow(14, 8, 1, 1, P.green, 'blink').glow(17, 8, 1, 1, P.gold, 'blink');
  return { front: fr, side: sd, top: tp, back: bk };
}

// A workstation tower (fl-pve1): drive sleds stacked down the front.
function hypervisorTower(n: BoxNode, [w, h, d]: [number, number, number]): Faces {
  const fr = F(w, h).chassis(P.panel2, P.steelL, P.void);
  fr.r(2, 2, fr.w - 4, 3, P.steel).glow(3, 3, 1, 1, P.green).glow(5, 3, 1, 1, P.blue, 'slow');
  const bays = n.bays || 4, bh = 2, y0 = 7;
  for (let i = 0; i < bays; i++) {
    const y = y0 + i * (bh + 1), bad = !!n.warn && i === 3;
    fr.r(2, y, fr.w - 4, bh, P.void).r(3, y, fr.w - 8, 1, bad ? '#3a2a14' : P.steel);
    fr.glow(fr.w - 4, y, 1, 1, bad ? P.gold : P.green, bad ? 'slow' : 'blink');
  }
  for (let y = y0 + bays * (bh + 1) + 1; y < fr.h - 2; y += 2) fr.r(3, y, fr.w - 6, 1, P.deep);
  const tp = F(w, d).chassis(P.panel2, P.steelL);
  tp.r(3, 3, tp.w - 6, 2, P.steel);
  for (let y = 8; y < tp.h - 3; y += 3) tp.r(3, y, tp.w - 6, 1, P.deep);
  const sd = F(d, h).chassis(P.panel, P.steelL, P.void);
  sd.r(3, 3, sd.w - 6, sd.h - 6, P.panel2);
  for (let y = 5; y < sd.h - 5; y += 2) for (let x = 5; x < sd.w - 5; x += 2) sd.r(x, y, 1, 1, P.deep);
  const bk = F(w, h).chassis(P.panel, P.steelL, P.void);
  bk.r(2, 2, bk.w - 4, 5, P.steel).r(3, 3, 5, 3, P.void);
  for (let i = 0; i < 4; i++) bk.r(3, 10 + i * 3, bk.w - 6, 1, P.void);
  bk.glow(bk.w - 4, 4, 1, 1, P.green, 'blink').glow(bk.w - 6, 4, 1, 1, P.gold, 'blink');
  return { front: fr, side: sd, top: tp, back: bk };
}

export const PAINT: Partial<Record<string, Painter>> = {
  hypervisor: (n, s) => (n.form === 'tower' ? hypervisorTower : hypervisorFlat)(n, s),
  nas(_n, [w, h, d]) {
    const body = '#171a24', fr = F(w, h).chassis(body, P.steel, P.void);
    fr.glow(2, 2, 1, 1, P.green).glow(4, 2, 1, 1, P.cyan, 'slow');
    for (let i = 0; i < 5; i++) { const x = 2 + i * 3; fr.r(x, 5, 3, fr.h - 7, P.void).r(x + 1, 6, 1, fr.h - 9, P.steel).glow(x + 1, 4, 1, 1, P.green, 'blink'); }
    const tp = F(w, d).chassis(body, P.steel); for (let y = 3; y < tp.h - 2; y += 3) tp.r(2, y, tp.w - 4, 1, P.void);
    const sd = F(d, h).chassis(body, P.steel, P.void); for (let y = 3; y < sd.h - 2; y += 3) for (let x = 3; x < sd.w - 2; x += 3) sd.r(x, y, 1, 1, P.void);
    return { front: fr, side: sd, top: tp };
  },
  mini(n, [w, h, d]) {
    const fanless = n.id === 'cp1-hw', body = fanless ? P.steel : n.id === 'cp3-hw' ? '#262633' : '#1f2638';
    const fr = F(w, h).chassis(body, shade(body, 1.7), P.void);
    fr.r(2, 3, 2, 1, P.void).r(5, 3, 2, 1, P.void).glow(fr.w - 3, 2, 1, 1, n.id === 'cp3-hw' ? P.gold : P.blue);
    const tp = F(w, d).chassis(body, shade(body, 1.7));
    if (fanless) for (let x = 1; x < tp.w - 1; x += 2) tp.r(x, 1, 1, tp.h - 2, P.steelL);
    else tp.r(2, 2, tp.w - 4, tp.h - 4, shade(body, 0.75)).r(tp.w / 2 - 1, tp.h / 2 - 1, 2, 2, shade(body, 1.5));
    const sd = F(d, h).chassis(body, shade(body, 1.7), P.void); for (let x = 2; x < sd.w - 2; x += 2) sd.r(x, 2, 1, Math.max(1, sd.h - 4), P.void);
    return { front: fr, side: sd, top: tp };
  },
  pi(n, [w, h, d]) {
    const tp = F(w, d).r(0, 0, 99, 99, P.pcb);
    if (n.hat) tp.r(0, 0, 99, 99, '#15171f').r(3, 1, 4, 4, P.steel).r(4, 2, 2, 2, P.void).r(1, tp.h - 2, tp.w - 2, 1, P.steelL);
    else {
      tp.r(3, 2, 3, 3, P.void).r(4, 3, 1, 1, P.steel);
      for (let x = 1; x < tp.w - 2; x += 2) tp.r(x, 0, 1, 1, '#d4b030');
      tp.r(tp.w - 2, 1, 2, 2, P.text).r(tp.w - 2, 4, 2, 2, P.text);
      if (n.id === 's3') tp.r(1, tp.h - 2, 4, 2, P.cyan);
    }
    const fr = F(w, h).r(0, 0, 99, 99, n.hat ? '#15171f' : P.pcb).r(1, 0, 3, 2, P.text).r(5, 0, 3, 2, P.text);
    fr.glow(fr.w - 1, 1, 1, 1, P.red).glow(fr.w - 2, 1, 1, 1, P.green, 'blink');
    const sd = F(d, h).r(0, 0, 99, 99, n.hat ? '#15171f' : P.pcb).r(2, 0, 2, 2, P.text);
    return { front: fr, side: sd, top: tp };
  },
  pizero(_n, [w, h, d]) {
    const tp = F(w, d).r(0, 0, 99, 99, P.pcb).r(3, 1, 2, 2, P.void); for (let x = 0; x < tp.w; x += 2) tp.r(x, 0, 1, 1, '#d4b030');
    const fr = F(w, h).r(0, 0, 99, 99, P.pcb).glow(1, 1, 1, 1, P.green, 'blink');
    return { front: fr, side: F(d, h).r(0, 0, 99, 99, P.pcb), top: tp };
  },
  router(_n, [w, h, d]) {
    const tp = F(w, d).chassis(P.black, P.steel); tp.r(2, 2, tp.w - 4, 1, P.steel).r(8, 5, 3, 2, P.steelL);
    const fr = F(w, h).chassis(P.black, P.steel).glow(2, 1, 1, 1, P.green).glow(4, 1, 1, 1, P.green, 'blink').glow(6, 1, 1, 1, P.blue);
    for (let i = 0; i < 4; i++) fr.r(10 + i * 2, 1, 1, 1, P.void);
    return { front: fr, side: F(d, h).chassis(P.black, P.steel), top: tp };
  },
  switch(_n, [w, h, d]) {
    const body = '#d7e1ee', tp = F(w, d).chassis(body, '#f0f5fb', '#aebcd0').r(7, 4, 3, 2, '#8da3c1');
    const fr = F(w, h).chassis(body, '#f0f5fb', '#8da3c1');
    for (let i = 0; i < 8; i++) fr.r(1 + i * 2, 1, 1, 2, P.void).glow(1 + i * 2, 0, 1, 1, i < 4 ? P.gold : P.green, 'blink');
    return { front: fr, side: F(d, h).chassis(body, '#f0f5fb', '#8da3c1'), top: tp };
  },
  kvm(_n, [w, h, d]) {
    const body = '#2c3346', tp = F(w, d).chassis(body, P.steelL).r(2, 2, 5, 3, P.void).glow(3, 3, 3, 1, P.cyan, 'slow');
    const fr = F(w, h).chassis(body, P.steelL).glow(1, 1, 1, 1, P.green).r(4, 1, 2, 1, P.void);
    return { front: fr, side: F(d, h).chassis(body, P.steelL), top: tp };
  },
  ups(n, [w, h, d]) {
    // An unwired UPS (n.warn) shows a dark display and no power LED.
    const dark = !!n.warn;
    const fr = F(w, h).chassis(P.black, P.steel, P.void);
    fr.r(2, 2, 7, 4, '#062a30');
    if (!dark) fr.glow(3, 3, 4, 1, P.cyan).glow(3, 4, 2, 1, P.cyan, 'slow');
    fr.r(3, 7, 1, 1, P.steelL).r(5, 7, 1, 1, P.steelL).r(7, 7, 1, 1, P.steelL).r(2, 11, 7, 1, P.void);
    if (dark) fr.r(2, 9, 1, 1, '#3a2a14'); else fr.glow(2, 9, 1, 1, P.green);
    const sd = F(d, h).chassis(P.black, P.steel, P.void); for (let x = 3; x < sd.w - 2; x += 2) sd.r(x, 3, 1, sd.h - 6, P.void);
    return { front: fr, side: sd, top: F(w, d).chassis(P.black, P.steel).r(3, 2, 5, 1, P.void) };
  },
  desktop(_n, [w, h, d]) {
    const body = '#141722', fr = F(w, h).chassis(body, P.steel, P.void);
    for (let y = 4; y < fr.h - 1; y += 2) for (let x = 2; x < fr.w - 1; x += 2) fr.r(x, y, 1, 1, P.void);
    fr.glow(fr.w / 2 | 0, 2, 1, 1, P.bright);
    const sd = F(d, h).chassis(body, P.steel, P.void).r(1, 1, 999, 999, '#0b0f1c').chassis('#0b0f1c', P.steel, P.void);
    sd.ring(2, 2, P.cyan).ring(2, 7, P.mag).ring(sd.w - 6, 2, P.cyan);
    sd.r(3, sd.h - 6, sd.w - 5, 2, P.steel).glow(3, sd.h - 4, sd.w - 5, 1, P.mag);
    return { front: fr, side: sd, left: F(d, h).chassis(body, P.steel, P.void), top: F(w, d).chassis(body, P.steel) };
  },
  vm(n, [w, h, d]) {
    const face = (a: number, b: number, meters: boolean) => {
      const f = F(a, b).r(0, 0, 999, 999, '#0e2550');
      for (let y = 2; y < f.h - 1; y += 2) f.r(1, y, f.w - 2, 1, '#11306a');
      f.glow(0, 0, f.w, 1, P.holo).glow(0, f.h - 1, f.w, 1, P.holo).glow(0, 0, 1, f.h, P.holo).glow(f.w - 1, 0, 1, f.h, P.holo);
      if (meters) for (let i = 0; i < 5; i++) { f.glow(2 + i * 2, f.h - 3, 1, 1, P.cyan, 'blink'); f.glow(2 + i * 2, f.h - 4, 1, 1, P.cyan, 'blink'); }
      if (meters && n.meta?.GPU) f.glow(f.w - 5, 2, 3, 2, P.green, 'slow');
      return f;
    };
    return { front: face(w, h, true), side: face(d, h, false), top: face(w, d, false) };
  },
};

export function floor(wu: number, du: number): Face {
  const f = F(wu, du), T = TD;
  f.r(0, 0, f.w, f.h, '#101729');
  for (let j = 0; j < f.h / T; j++) for (let i = 0; i < f.w / T; i++) {
    const x = i * T, y = j * T;
    f.r(x, y, T, T, (i + j) % 2 ? '#141c33' : '#111930').r(x, y, T, 1, '#1a2440').r(x, y, 1, T, '#1a2440');
    if ((i * 7 + j * 3) % 11 === 0) for (let k = 2; k < T - 2; k += 2) f.r(x + 2, y + k, T - 4, 1, '#0c1222');
  }
  f.r(0, 0, f.w, 1, P.steelL).r(0, f.h - 1, f.w, 1, P.steelL).r(0, 0, 1, f.h, P.steelL).r(f.w - 1, 0, 1, f.h, P.steelL);
  f.r(3, 3, f.w - 6, 1, P.steel).r(3, f.h - 4, f.w - 6, 1, P.steel).r(3, 3, 1, f.h - 6, P.steel).r(f.w - 4, 3, 1, f.h - 6, P.steel);
  return f;
}

export function slabSide(lu: number, hu: number, col: string, tier: number): Face {
  const f = F(lu, hu).r(0, 0, 9999, 99, tier ? '#0b1120' : P.deep);
  for (let x = 5; x < f.w; x += 10) f.r(x, 1, 1, f.h - 2, tier ? '#0f1628' : P.panel2);
  if (!tier) {
    f.glow(0, 0, f.w, 1, col).r(0, 1, f.w, 1, P.steel);
    for (let x = 10; x < f.w - 4; x += 10) f.r(x, 6, 1, 1, P.steelL);
    for (let x = 14; x < f.w - 6; x += 20) f.glow(x, 9, 3, 1, col, 'slow');
  } else for (let x = 7; x < f.w - 4; x += 16) f.glow(x, f.h - 3, 1, 1, shade(col, 0.8), 'slow');
  f.r(0, f.h - 1, f.w, 1, P.void);
  return f;
}

export function coin(): Face {
  const f = F(11, 11, true).r(0, 0, 11, 11, '#8a6c00').r(1, 1, 9, 9, P.gold).r(2, 2, 7, 7, '#e6c200');
  for (let y = 3; y <= 7; y += 2) for (let x = 3; x <= 7; x += 2) f.r(x, y, 1, 1, '#6b5500');
  return f;
}

export function sprite(rows: string[], pal: Record<string, string>, mirror = false): HTMLCanvasElement {
  const h = rows.length, w = rows[0].length, c = mk(w, h), g = c.getContext('2d')!;
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(mirror ? w - 1 - x : x, y, 1, 1); } }));
  return c;
}

const CAT_PAL = { d: '#6b7fa3', b: '#8899b3', c: P.cyan, p: '#ff9fba' };
export const SPR: Record<'pointer' | 'bang' | 'catA' | 'catB', [string[], Record<string, string>]> = {
  pointer: [['ddddddd', 'dgggggd', '.dgggd.', '..dgd..', '...d...'], { d: P.void, g: P.gold }],
  bang: [['.ddddddd.', 'dgggggggd', 'dgggdgggd', 'dgggdgggd', 'dgggdgggd', 'dgggggggd', 'dgggdgggd', 'dgggggggd', '.dddgddd.', '...dgd...', '....d....'], { d: P.void, g: P.gold }],
  catA: [['.d...d......', '.dbbbd......', '.bcbcb.....d', '.bbpbb....d.', 'bbbbbbbbbbd.', 'bbbbbbbbbb..', '.bbbbbbbbb..', '.d.d...d.d..', '.d.d...d.d..'], CAT_PAL],
  catB: [['.d...d......', '.dbbbd......', '.bcbcb......', '.bbpbb.....d', 'bbbbbbbbbbd.', 'bbbbbbbbbb..', '.bbbbbbbbb..', '..d.d...d.d.', '..d.d...d.d.'], CAT_PAL],
};
