// scene.ts — the HD-2D pixel topology behind TopologyPixel (RPG mode's 3D
// view). A low-res toon render with depth/normal outlines, integer-upscaled,
// then a soft bloom + tilt-shift pass on top. Framework-free like the pro 3D
// scene: the component hands it a stage and a labels element and drives it
// through the returned API; dispose() tears everything down.
//
// Ported from the claude.ai/design "Homelab Topology Pixel" handoff. The
// model is shared with the pro 3D view (../topology3d/data).

import * as THREE from 'three';
import { CHIPS, LINKS, LINK_KINDS, NODES, SITES } from '../topology3d/data';
import type { BoxNode, Chip, LinkDef, LinkKind, LinkKindDef, Site, SiteId, TopoNode } from '../topology3d/data';
import * as A from './art';

const { P } = A;
const V3 = THREE.Vector3;
type Vec3 = THREE.Vector3;

export type AnyNode = TopoNode | Chip;
export type ViewName = 'overview' | 'fl' | 'mde';
export const isChip = (n: AnyNode): n is Chip => 'hosts' in n;
const isBox = (n: AnyNode): n is BoxNode => !isChip(n) && n.tier !== 'k3s';

export const LINKC: Record<LinkKind, string> = { etcd: P.etcd, kube: P.text, storage: P.green, tailnet: P.gold, backup: P.cyan, lan: P.dim, runs: P.steelLL, power: P.mag };
export const SITEC: Record<SiteId, string> = { fl: P.cyan, mde: P.gold };
const TAGC: Partial<Record<string, string>> = { vm: P.holo, cp: P.etcd, worker: P.green, ingress: P.gold, egress: P.gold, router: P.dim, switch: P.dim, kvm: P.dim, ups: P.dim, desktop: P.mag };
export const dotColor = (n: AnyNode) => TAGC[n.kind] || (!isChip(n) && n.tier === 'phys' ? SITEC[n.site] : P.text);

export const BY_ID: Record<string, AnyNode> = Object.fromEntries([...NODES, ...CHIPS].map(n => [n.id, n]));
export const defaultLayers = (): Record<LinkKind, boolean> =>
  Object.fromEntries(Object.entries(LINK_KINDS).map(([k, v]) => [k, !v.off])) as Record<LinkKind, boolean>;

/** Public, read-only view of a link (for the status window's link list). */
export interface PxLinkInfo extends LinkDef { chip: boolean; K: LinkKindDef }

export interface PixelSceneApi {
  links: readonly PxLinkInfo[];
  select(id: string | null): void;
  hover(id: string | null): void;
  setView(name: ViewName): void;
  rotate(dir: 1 | -1): void;
  setLayer(k: LinkKind, on: boolean): void;
  setInsets(i: { left?: number; right?: number; bottom?: number }): void;
  setInteractive(on: boolean): void;
  dispose(): void;
}
export interface PixelSceneCallbacks {
  onSelect?(id: string | null): void;
  onHover?(id: string | null): void;
  onView?(v: ViewName): void;
}

// fl-pve1 is a 2.6-unit tower, so the VM floor floats above it.
const Y = { vm: 3.6, k3s: 6.2, ts: 9.2 };
const ELEV = Math.PI / 6;
const OPTS = { px: 3, bloom: 1, tilt: 0.55, dither: true, crt: true, outline: true, traffic: 1 };
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const bounce = (t: number) => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};

const crystalR = (n: TopoNode) => (n.tier === 'k3s' ? n.r : 1) * 0.55;
const dims = (n: AnyNode): [number, number, number] =>
  isChip(n) ? [0.84, 0.84, 0.12] : n.tier === 'k3s' ? [crystalR(n) * 2, crystalR(n) * 2.9, crystalR(n) * 2] : n.size;
const center = (n: AnyNode) =>
  new V3(n.pos[0], isChip(n) ? Y.ts : n.tier === 'k3s' ? Y.k3s : n.tier === 'vm' ? Y.vm : n.size[1] / 2, n.pos[1]);
const topOf = (n: AnyNode) => center(n).add(new V3(0, dims(n)[1] / 2, 0));
const botOf = (n: AnyNode) => center(n).sub(new V3(0, dims(n)[1] / 2, 0));

interface Obj {
  n: AnyNode; g: THREE.Group; mesh: THREE.Mesh; base: Vec3; i: number;
  mats: { m: THREE.MeshToonMaterial; c: THREE.Color; e: number }[];
  f: number; blinkT: number; spin?: number; pip?: THREE.Mesh; light?: THREE.PointLight; floats: boolean; phase: number;
}
interface Link extends PxLinkInfo {
  pts: Vec3[]; cum: number[]; len: number; line: THREE.Line; mat: THREE.LineBasicMaterial | THREE.LineDashedMaterial;
  pk: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>[]; u: number; op: number;
}
interface Label { el: HTMLElement; n?: AnyNode; site?: Site; pri: number; w: number; h: number }

export function createPixelScene(
  stage: HTMLElement,
  labelsEl: HTMLElement,
  init: { reducedMotion?: boolean } = {},
  cb: PixelSceneCallbacks = {},
): PixelSceneApi {
  const reduced = !!init.reducedMotion;
  const opts = { ...OPTS, traffic: reduced ? 0 : OPTS.traffic };
  const layersOn = defaultLayers();

  // The palette is authored as raw display values, so colour management stays
  // off while this scene is alive (restored on dispose — the pro 3D view,
  // which never coexists with this one, relies on it).
  const prevCM = THREE.ColorManagement.enabled;
  THREE.ColorManagement.enabled = false;

  // ── Renderer + targets ─────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.BasicShadowMap; renderer.shadowMap.autoUpdate = false;
  renderer.autoClear = false;
  stage.prepend(renderer.domElement);
  const canvas = renderer.domElement;
  let cssW = 1, cssH = 1, dpr = 1, ps = 3, lowW = 1, lowH = 1;
  const rt: { main?: THREE.WebGLRenderTarget; norm?: THREE.WebGLRenderTarget; a?: THREE.WebGLRenderTarget; b?: THREE.WebGLRenderTarget; c?: THREE.WebGLRenderTarget; d?: THREE.WebGLRenderTarget; hw: number; hh: number; qw: number; qh: number } = { hw: 1, hh: 1, qw: 1, qh: 1 };

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 300);
  cam.layers.enableAll();

  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(x: T): T => { disposables.push(x); return x; };

  const grad = track(new THREE.DataTexture(new Uint8Array([60, 150, 255]), 3, 1, THREE.RedFormat));
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  const toon = (o: THREE.MeshToonMaterialParameters) => track(new THREE.MeshToonMaterial({ gradientMap: grad, ...o }));
  const texOf = (c: HTMLCanvasElement) => {
    const t = track(new THREE.CanvasTexture(c));
    t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t;
  };
  const faceTex = new Map<A.Face, { map: THREE.Texture; em: THREE.Texture[] | null }>();
  const faceMat = (f: A.Face) => {
    let tx = faceTex.get(f);
    if (!tx) { tx = { map: texOf(f.c), em: f.lit ? f.E.map(texOf) : null }; faceTex.set(f, tx); }
    const m = toon({ map: tx.map, emissive: tx.em ? 0xffffff : 0, emissiveMap: tx.em ? tx.em[0] : null });
    m.userData.frames = tx.em; return m;
  };

  scene.add(new THREE.AmbientLight(0x4a64a0, 1.5));
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.4);
  sun.position.set(-8, 22, 14); sun.target.position.set(1.5, 0, 0.5);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 18, bottom: -18, near: 1, far: 70 });
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0015; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  const L1 = <T extends THREE.Object3D>(o: T): T => { o.layers.set(1); return o; };
  const pickables: THREE.Object3D[] = [];

  // ── Islands ────────────────────────────────────────────────────────
  const islands: THREE.Group[] = [];
  (['fl', 'mde'] as SiteId[]).forEach(id => {
    const s = SITES[id], w = s.x1 - s.x0, d = s.z1 - s.z0, col = SITEC[id];
    const g = new THREE.Group(); g.position.set((s.x0 + s.x1) / 2, 0, (s.z0 + s.z1) / 2);
    const slab = (ww: number, hh: number, dd: number, y: number, tier: number) => {
      const sx = faceMat(A.slabSide(dd, hh, col, tier)), sz = faceMat(A.slabSide(ww, hh, col, tier));
      const topM = tier ? toon({ color: '#0b1120' }) : faceMat(A.floor(ww, dd));
      const m = new THREE.Mesh(track(new THREE.BoxGeometry(ww, hh, dd)), [sx, sx, topM, toon({ color: P.void }), sz, sz]);
      m.position.y = y; m.receiveShadow = true; m.castShadow = !tier; g.add(m);
    };
    slab(w, 1.2, d, -0.6, 0); slab(w - 1.6, 0.9, d - 1.6, -1.65, 1); slab(w - 4.2, 0.7, d - 4.2, -2.45, 1);
    scene.add(g); islands.push(g);
  });

  // ── Nodes ──────────────────────────────────────────────────────────
  const objs: Record<string, Obj> = {};
  const crystalGeo = track(new THREE.OctahedronGeometry(1, 0)); crystalGeo.scale(1, 1.45, 1);
  const pipGeo = track(new THREE.OctahedronGeometry(0.13, 0)), pipMat = track(new THREE.MeshBasicMaterial({ color: P.gold }));
  const coinTex = texOf(A.coin().c);
  const chipGeo = track(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 14).rotateX(Math.PI / 2));

  [...NODES, ...CHIPS].forEach((n, i) => {
    const g = new THREE.Group(), base = center(n);
    let mesh: THREE.Mesh, spin: number | undefined, light: THREE.PointLight | undefined;
    if (isChip(n)) {
      const side = toon({ color: '#b08a00', emissive: P.gold, emissiveIntensity: 0.15 }), face = toon({ map: coinTex, emissive: P.gold, emissiveIntensity: 0.25 });
      mesh = new THREE.Mesh(chipGeo, [side, face, face]);
      spin = 1.6;
    } else if (n.tier === 'k3s') {
      const c = n.kind === 'cp' ? P.etcd : P.green;
      mesh = new THREE.Mesh(crystalGeo, toon({ color: A.shade(c, 0.62), emissive: c, emissiveIntensity: 0.16 }));
      mesh.scale.setScalar(crystalR(n));
      light = new THREE.PointLight(c, 2.6, 6.5, 1); light.position.y = -0.6; g.add(light);
      spin = 0.7;
    } else {
      const painter = A.PAINT[n.kind];
      const faces: A.Faces = painter ? painter(n, n.size)
        : { front: A.plain(n.size[0], n.size[1], P.panel2), side: A.plain(n.size[2], n.size[1], P.panel2), top: A.plain(n.size[0], n.size[2], P.panel2) };
      const cache = new Map<A.Face, THREE.MeshToonMaterial>();
      const fm = (f: A.Face) => { let m = cache.get(f); if (!m) { m = faceMat(f); cache.set(f, m); } return m; };
      mesh = new THREE.Mesh(track(new THREE.BoxGeometry(...n.size)),
        [fm(faces.side), fm(faces.left || faces.side), fm(faces.top), toon({ color: P.void }), fm(faces.front), fm(faces.back || faces.front)]);
    }
    mesh.castShadow = true; mesh.receiveShadow = isBox(n);
    mesh.userData.id = n.id; pickables.push(mesh);
    g.add(mesh);
    let pip: THREE.Mesh | undefined;
    if (n.ts) {
      pip = new THREE.Mesh(pipGeo, pipMat); pip.position.set(0, dims(n)[1] / 2 + 0.32, 0);
      if (isBox(n) && n.tier === 'phys' && n.size[0] > 2) pip.position.x = n.size[0] / 2 - 0.4;
      g.add(pip);
    }
    const ms = (Array.isArray(mesh.material) ? [...new Set(mesh.material)] : [mesh.material]) as THREE.MeshToonMaterial[];
    const o: Obj = {
      n, g, mesh, base, i, spin, pip, light, f: 1, blinkT: Math.random(),
      mats: ms.map(m => ({ m, c: m.color.clone(), e: m.emissiveIntensity ?? 0 })),
      floats: isChip(n) || n.tier !== 'phys', phase: Math.random() * 6.28,
    };
    g.position.copy(base); scene.add(g); objs[n.id] = o;
  });

  // ── Links ──────────────────────────────────────────────────────────
  const siteC = (s: SiteId) => new V3((SITES[s].x0 + SITES[s].x1) / 2, Y.ts, (SITES[s].z0 + SITES[s].z1) / 2);
  const halo = (s: SiteId) => { const S = SITES[s]; return { c: siteC(s), rx: (S.x1 - S.x0) / 2 + 0.9, rz: (S.z1 - S.z0) / 2 + 0.9 }; };
  const HF = halo('fl'), HM = halo('mde');
  const bridgeA = new V3(HF.c.x + HF.rx, Y.ts, HF.c.z), bridgeB = new V3(HM.c.x - HM.rx, Y.ts, HM.c.z);
  const bridgePts: Vec3[] = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; bridgePts.push(new V3().lerpVectors(bridgeA, bridgeB, t).setY(Y.ts + Math.sin(t * Math.PI) * 1.3)); }
  const KOFF: Partial<Record<LinkKind, number>> = { lan: 0, power: 0.2, backup: -0.2, storage: 0.12, tailnet: 0 };
  const floorPt = (x: number, z: number, o: number) => new V3(x + o, 0.04, z + o);
  const floorL = (ax: number, az: number, bx: number, bz: number, o: number) => [floorPt(ax, az, o), floorPt(bx, az, o), floorPt(bx, bz, o)];
  function route(a: AnyNode, b: AnyNode, kind: LinkKind): Vec3[] {
    if (kind === 'runs') return [topOf(a), botOf(b)];
    const o = KOFF[kind] || 0;
    if (isChip(a)) return [center(a), new V3(b.pos[0], Y.ts, b.pos[1]), topOf(b)];
    if (a.site !== b.site) {
      const A0 = center(a), B0 = center(b), br = a.site === 'fl' ? bridgePts : bridgePts.slice().reverse();
      return [A0, A0.clone().setY(Y.ts), ...br, B0.clone().setY(Y.ts), B0];
    }
    const ap = !isChip(a) && a.tier === 'phys', bp = !isChip(b) && b.tier === 'phys';
    if (ap && bp) return floorL(a.pos[0], a.pos[1], b.pos[0], b.pos[1], o);
    if (ap) return [...floorL(a.pos[0], a.pos[1], b.pos[0], b.pos[1], o), botOf(b)];
    if (bp) return [botOf(a), ...floorL(a.pos[0], a.pos[1], b.pos[0], b.pos[1], o)];
    return [center(a), center(b)];
  }
  const defs: (LinkDef & { chip: boolean })[] = LINKS.map(l => ({ ...l, chip: false }));
  CHIPS.forEach(c => {
    c.hosts.forEach(h => defs.push({ from: c.id, to: h, kind: 'tailnet', label: 'ProxyGroup replica', chip: true }));
    if (c.target) defs.push({ from: c.id, to: c.target, kind: c.targetKind ?? 'tailnet', label: 'egress target', chip: true });
  });
  const pkGeo = track(new THREE.BoxGeometry(0.17, 0.17, 0.17));
  const links: Link[] = defs.map(l => {
    const a = BY_ID[l.from], b = BY_ID[l.to], K = LINK_KINDS[l.kind], pts = route(a, b, l.kind);
    const geo = track(new THREE.BufferGeometry().setFromPoints(pts));
    const dashed = l.kind === 'runs' || l.chip;
    const mat = track(dashed
      ? new THREE.LineDashedMaterial({ color: LINKC[l.kind], dashSize: 0.14, gapSize: 0.16, transparent: true, depthWrite: false })
      : new THREE.LineBasicMaterial({ color: LINKC[l.kind], transparent: true, depthWrite: false }));
    const line = L1(new THREE.Line(geo, mat)); if (dashed) line.computeLineDistances(); scene.add(line);
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    return { ...l, K, pts, cum, len: cum[cum.length - 1], line, mat, pk: [], u: Math.random(), op: 1 };
  });
  function at(L: Link, s: number, out: Vec3) {
    const d = s * L.len; let i = 1; while (i < L.cum.length - 1 && L.cum[i] < d) i++;
    const seg = L.cum[i] - L.cum[i - 1] || 1; return out.lerpVectors(L.pts[i - 1], L.pts[i], (d - L.cum[i - 1]) / seg);
  }
  function syncPackets() {
    links.forEach(L => {
      const n = L.K.traffic && opts.traffic > 0 ? Math.max(1, Math.round(L.K.traffic * opts.traffic * clamp(L.len / 7, 0.6, 3))) : 0;
      while (L.pk.length < n) {
        const m = L1(new THREE.Mesh(pkGeo, track(new THREE.MeshBasicMaterial({ color: L.kind === 'kube' ? P.bright : LINKC[L.kind], depthWrite: false }))));
        scene.add(m); L.pk.push(m);
      }
      L.pk.forEach((m, i) => { m.userData.on = i < n; m.userData.off = i / Math.max(1, n); m.userData.rev = L.K.bidir && i % 2 === 1; });
    });
  }
  syncPackets();

  // ── Tailnet halos + bridge (dotted, rippling) ──────────────────────
  const dots: { p: Vec3; ph: number; k: number }[] = [];
  [HF, HM].forEach(h => {
    const per = 2 * Math.PI * Math.sqrt((h.rx * h.rx + h.rz * h.rz) / 2), n = Math.round(per / 0.62);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; dots.push({ p: new V3(h.c.x + Math.cos(a) * h.rx, Y.ts, h.c.z + Math.sin(a) * h.rz), ph: i / n, k: 0 }); }
  });
  for (let i = 0; i <= 22; i++) { const t = i / 22; dots.push({ p: new V3().lerpVectors(bridgeA, bridgeB, t).setY(Y.ts + Math.sin(t * Math.PI) * 1.3), ph: t, k: 1 }); }
  const dotGeo = track(new THREE.BufferGeometry().setFromPoints(dots.map(d => d.p)));
  const dotCol = new Float32Array(dots.length * 3); dotGeo.setAttribute('color', new THREE.BufferAttribute(dotCol, 3));
  const dotMat = track(new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false }));
  scene.add(L1(new THREE.Points(dotGeo, dotMat)));
  const gDim = new THREE.Color('#3a3006'), gHi = new THREE.Color('#fff2a8'), gMid = new THREE.Color(P.gold), tmpC = new THREE.Color();

  // ── Void dust ──────────────────────────────────────────────────────
  const DUST = 420, dustPos = new Float32Array(DUST * 3), dustCol = new Float32Array(DUST * 3);
  const dustPal = ['#1c2745', '#2a3a5c', '#3d5a8a', '#006b7a', '#7a6800'].map(c => new THREE.Color(c));
  for (let i = 0; i < DUST; i++) {
    dustPos.set([(Math.random() - 0.5) * 110, -26 + Math.random() * 48, (Math.random() - 0.5) * 80], i * 3);
    const c = dustPal[Math.random() * (Math.random() < 0.8 ? 3 : 5) | 0]; dustCol.set([c.r, c.g, c.b], i * 3);
  }
  const dustGeo = track(new THREE.BufferGeometry());
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3)); dustGeo.setAttribute('color', new THREE.BufferAttribute(dustCol, 3));
  scene.add(L1(new THREE.Points(dustGeo, track(new THREE.PointsMaterial({ size: 1, sizeAttenuation: false, vertexColors: true, depthWrite: false })))));

  // ── Sprites: pointer, warning bubbles, cat ─────────────────────────
  const sprTex = (k: keyof typeof A.SPR, mirror = false) => texOf(A.sprite(A.SPR[k][0], A.SPR[k][1], mirror));
  const mkSprite = (tex: THREE.Texture, w: number, h: number) => {
    const s = L1(new THREE.Sprite(track(new THREE.SpriteMaterial({ map: tex, alphaTest: 0.5 }))));
    s.scale.set(w * 0.1, h * 0.1, 1); s.center.set(0.5, 0); scene.add(s); return s;
  };
  const pointer = mkSprite(sprTex('pointer'), 7, 5); pointer.visible = false;
  const bangTex = sprTex('bang');
  const bangs = NODES.filter(isBox).filter(n => n.warn).map(n => {
    const s = mkSprite(bangTex, 9, 11); s.userData.id = n.id; pickables.push(s);
    return { s, n, base: new V3(n.pos[0] - n.size[0] / 2 + 0.4, n.size[1] + 0.25, n.pos[1] + n.size[2] / 2 - 0.3) };
  });
  const catT = { L: [sprTex('catA'), sprTex('catB')], R: [sprTex('catA', true), sprTex('catB', true)] };
  const cat = mkSprite(catT.L[0], 12, 9); cat.userData.id = '__cat'; pickables.push(cat);
  const catS = { x: 19, z: 5.1, dir: -1, pause: 0, meow: 0 };

  // ── Post-processing ────────────────────────────────────────────────
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), fsScene = new THREE.Scene();
  const fsQuad = new THREE.Mesh(track(new THREE.PlaneGeometry(2, 2))); fsScene.add(fsQuad);
  const VS = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const BG = 'vec3 bgCol(vec2 uv){return mix(vec3(.027,.035,.075),vec3(.085,.115,.215),uv.y*uv.y);}';
  const sm = (u: Record<string, THREE.IUniform>, fs: string) =>
    track(new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: fs, depthTest: false, depthWrite: false }));
  const blurM = sm({ tIn: { value: null }, uDir: { value: new THREE.Vector2() } }, 'uniform sampler2D tIn;uniform vec2 uDir;varying vec2 vUv;void main(){vec3 c=texture2D(tIn,vUv).rgb*.227027;c+=(texture2D(tIn,vUv+uDir*1.3846).rgb+texture2D(tIn,vUv-uDir*1.3846).rgb)*.316216;c+=(texture2D(tIn,vUv+uDir*3.2308).rgb+texture2D(tIn,vUv-uDir*3.2308).rgb)*.07027;gl_FragColor=vec4(c,1.);}');
  const copyM = sm({ tIn: { value: null } }, BG + 'uniform sampler2D tIn;varying vec2 vUv;void main(){vec4 c=texture2D(tIn,vUv);gl_FragColor=vec4(c.rgb+bgCol(vUv)*(1.-c.a),1.);}');
  const brightM = sm({ tIn: { value: null } }, 'uniform sampler2D tIn;varying vec2 vUv;void main(){vec3 c=texture2D(tIn,vUv).rgb;float m=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(.68,1.,m),1.);}');
  const finalM = sm({
    tColor: { value: null }, tDepth: { value: null }, tNormal: { value: null }, tDof: { value: null }, tBloom: { value: null },
    uLow: { value: new THREE.Vector2() }, uOff: { value: new THREE.Vector2() }, uPs: { value: 3 }, uK: { value: 800 },
    uDither: { value: 1 }, uTilt: { value: 0.5 }, uBloom: { value: 1 }, uScan: { value: 1 }, uOutline: { value: 1 },
  }, BG + `
uniform sampler2D tColor,tDepth,tNormal,tDof,tBloom;uniform vec2 uLow,uOff;uniform float uPs,uK,uDither,uTilt,uBloom,uScan,uOutline;varying vec2 vUv;
const float BY[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
float bayer(vec2 p){return (BY[int(mod(p.x,4.))+int(mod(p.y,4.))*4]+.5)/16.;}
void main(){
  vec2 fc=gl_FragCoord.xy-uOff*uPs; vec2 px=floor(fc/uPs); vec2 t=1./uLow; vec2 uv=(px+.5)*t; vec2 su=fc/uPs*t;
  vec4 c=texture2D(tColor,uv); vec3 col=c.rgb; float d=texture2D(tDepth,uv).r;
  if(uOutline>.5&&d<1.){
    float dl=texture2D(tDepth,uv-vec2(t.x,0.)).r,dr=texture2D(tDepth,uv+vec2(t.x,0.)).r,dd=texture2D(tDepth,uv-vec2(0.,t.y)).r,du=texture2D(tDepth,uv+vec2(0.,t.y)).r;
    float far=max(max(dl,dr),max(dd,du))-d;
    if(far*uK>1.){col=mix(col,vec3(.02,.03,.07),.74);}
    else{
      vec4 n=texture2D(tNormal,uv),nr=texture2D(tNormal,uv+vec2(t.x,0.)),nu=texture2D(tNormal,uv+vec2(0.,t.y));
      if(n.a>.5){float e=0.;vec3 N=n.rgb*2.-1.;
        if(nr.a>.5&&abs(dr-d)*uK<1.)e=max(e,1.-dot(N,nr.rgb*2.-1.));
        if(nu.a>.5&&abs(du-d)*uK<1.)e=max(e,1.-dot(N,nu.rgb*2.-1.));
        if(e>.2)col=col*1.32+.04;}
    }
  }
  col=col+bgCol(uv)*(1.-c.a);
  if(uDither>.5){float L=12.;col=floor(col*L+bayer(px))/L;}
  float f=smoothstep(.36,.98,abs(su.y-.47)*2.)*uTilt; col=mix(col,texture2D(tDof,su).rgb,f);
  col+=texture2D(tBloom,su).rgb*uBloom*1.25;
  col*=1.-.42*pow(length(vUv-.5)*1.3,2.6);
  if(uScan>.5&&mod(gl_FragCoord.y,uPs)<max(1.,floor(uPs/3.)))col*=.8;
  gl_FragColor=vec4(col,1.);
}`);
  const normalMat = track(new THREE.MeshNormalMaterial());
  function pass(mat: THREE.ShaderMaterial, u: Record<string, THREE.IUniform>, target: THREE.WebGLRenderTarget | null) {
    Object.assign(mat.uniforms, u); fsQuad.material = mat; renderer.setRenderTarget(target); renderer.render(fsScene, fsCam);
  }
  const RT_KEYS = ['main', 'norm', 'a', 'b', 'c', 'd'] as const;
  function alloc() {
    RT_KEYS.forEach(k => { rt[k]?.depthTexture?.dispose(); rt[k]?.dispose(); });
    const N = THREE.NearestFilter, Lf = THREE.LinearFilter;
    const dt = new THREE.DepthTexture(lowW, lowH); dt.minFilter = dt.magFilter = N;
    rt.main = new THREE.WebGLRenderTarget(lowW, lowH, { minFilter: Lf, magFilter: Lf, depthTexture: dt });
    rt.norm = new THREE.WebGLRenderTarget(lowW, lowH, { minFilter: N, magFilter: N });
    rt.hw = Math.ceil(lowW / 2); rt.hh = Math.ceil(lowH / 2); rt.qw = Math.ceil(lowW / 4); rt.qh = Math.ceil(lowH / 4);
    rt.a = new THREE.WebGLRenderTarget(rt.hw, rt.hh, { minFilter: Lf, magFilter: Lf, depthBuffer: false });
    rt.b = rt.a.clone();
    rt.c = new THREE.WebGLRenderTarget(rt.qw, rt.qh, { minFilter: Lf, magFilter: Lf, depthBuffer: false });
    rt.d = rt.c.clone();
  }
  function resize() {
    cssW = Math.max(1, stage.clientWidth); cssH = Math.max(1, stage.clientHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2); ps = Math.max(1, Math.round(opts.px * dpr));
    renderer.setPixelRatio(dpr); renderer.setSize(cssW, cssH);
    const devW = Math.round(cssW * dpr), devH = Math.round(cssH * dpr);
    lowW = Math.ceil(devW / ps) + 2; lowH = Math.ceil(devH / ps) + 2;
    alloc();
    finalM.uniforms.uLow.value.set(lowW, lowH); finalM.uniforms.uPs.value = ps;
  }

  // ── Camera ─────────────────────────────────────────────────────────
  const insets = { left: 0, right: 0, bottom: 0 };
  const fitH = () => Math.max(22, 44 / ((cssW - insets.left - insets.right) / Math.max(1, cssH - insets.bottom)));
  const VIEWS: Record<ViewName, { t: [number, number, number]; h: () => number }> = {
    overview: { t: [1.5, 3, 0.5], h: fitH },
    fl: { t: [-13, 2.8, 0.5], h: () => 18 },
    mde: { t: [11.5, 2.8, 0.5], h: () => 21 },
  };
  const AZ0 = 0.36;
  const st = { t: new V3(1.5, 3, 0.5), az: AZ0, h: 30 }, goal = { t: st.t.clone(), az: st.az, h: 30 };
  const off = new THREE.Vector2(), vRight = new V3(), vUp = new V3();
  // Shift the target so the framed content centres in the area the HUD leaves free.
  const insetShift = (h: number, into: Vec3) => {
    const wpp = h / cssH, r = new V3(Math.cos(goal.az), 0, -Math.sin(goal.az));
    const f = new V3(-Math.sin(goal.az), 0, -Math.cos(goal.az));
    return into.addScaledVector(r, (insets.right - insets.left) / 2 * wpp).addScaledVector(f, -insets.bottom / 2 * wpp / Math.sin(ELEV));
  };
  function placeCam(dt: number) {
    const k = 1 - Math.exp(-dt * 5.5);
    st.t.lerp(goal.t, k); st.az += (goal.az - st.az) * k; st.h += (goal.h - st.h) * k;
    const dir = new V3(Math.sin(st.az) * Math.cos(ELEV), Math.sin(ELEV), Math.cos(st.az) * Math.cos(ELEV));
    const hh = st.h / 2, hw = hh * lowW / lowH;
    Object.assign(cam, { left: -hw, right: hw, top: hh, bottom: -hh }); cam.updateProjectionMatrix();
    cam.position.copy(st.t).addScaledVector(dir, 120); cam.lookAt(st.t); cam.updateMatrixWorld();
    // Snap the camera to whole low-res texels so the pixel grid doesn't swim.
    const tx = st.h / lowH; vRight.setFromMatrixColumn(cam.matrixWorld, 0); vUp.setFromMatrixColumn(cam.matrixWorld, 1);
    const sr = st.t.dot(vRight), su = st.t.dot(vUp), qr = Math.round(sr / tx) * tx, qu = Math.round(su / tx) * tx;
    cam.position.addScaledVector(vRight, qr - sr).addScaledVector(vUp, qu - su); cam.updateMatrixWorld();
    off.set((qr - sr) / tx, (qu - su) / tx);
    finalM.uniforms.uK.value = (cam.far - cam.near) / 0.35;
    sun.position.set(st.t.x - 8, 22, st.t.z + 14); sun.target.position.set(st.t.x, 0, st.t.z); sun.target.updateMatrixWorld();
  }
  let curView: ViewName = 'overview';
  function setView(name: ViewName, instant = false) {
    const v = VIEWS[name]; curView = name;
    goal.h = v.h(); goal.t.set(...v.t); insetShift(goal.h, goal.t);
    if (instant) { st.t.copy(goal.t); st.h = goal.h; }
    cb.onView?.(name);
  }
  function rotate(dir: number) { goal.az += dir * Math.PI / 2; if (sel) focusOn(sel); else setView(curView); }

  // ── Selection / focus ──────────────────────────────────────────────
  let sel: string | null = null, hov: string | null = null;
  const related = new Set<string>();
  const linksOf = (id: string) => links.filter(L => L.from === id || L.to === id);
  const parentOf = (id: string) => links.find(L => L.kind === 'runs' && L.to === id)?.from;
  function computeRelated() {
    related.clear(); if (!sel) return; related.add(sel);
    linksOf(sel).forEach(L => { related.add(L.from); related.add(L.to); });
    const p = parentOf(sel); if (p) { related.add(p); const pp = parentOf(p); if (pp) related.add(pp); }
  }
  function focusOn(id: string) {
    const n = BY_ID[id]; if (!n) return;
    goal.h = Math.min(Math.max(12, goal.h * 0.6), 14);
    goal.t.copy(center(n)); goal.t.y = Math.min(goal.t.y, 4); insetShift(goal.h, goal.t);
  }
  const meow = () => { catS.meow = 1.6; };
  function select(id: string | null) {
    if (id === '__cat') { meow(); return; }
    sel = id && BY_ID[id] ? id : null; computeRelated();
    if (sel) focusOn(sel); else setView(curView);
    cb.onSelect?.(sel);
  }
  function hover(id: string | null) {
    if (id === '__cat') id = null;
    if (id === hov) return; hov = id; canvas.style.cursor = id ? 'pointer' : ''; cb.onHover?.(hov);
  }

  // ── Labels ─────────────────────────────────────────────────────────
  const labels: Label[] = [];
  const kindPri = (n: AnyNode) => isChip(n) ? 3 : n.tier === 'phys' ? (n.size[0] > 1.6 ? 22 : 12) : n.tier === 'vm' ? 8 : 6;
  const cleanups: (() => void)[] = [];
  const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Window, ev: K, fn: (e: HTMLElementEventMap[K]) => void, o?: AddEventListenerOptions) => {
    el.addEventListener(ev, fn as EventListener, o); cleanups.push(() => el.removeEventListener(ev, fn as EventListener, o));
  };
  [...NODES, ...CHIPS].forEach(n => {
    const el = document.createElement('div');
    el.className = 'tpx-l tpx-l-n' + (isChip(n) ? ' chip' : '') + (n.warn ? ' warn' : '');
    const dot = document.createElement('i'); dot.style.background = dotColor(n);
    const txt = document.createElement('span'); txt.textContent = n.label;
    el.append(dot, txt);
    on(el, 'click', e => { e.stopPropagation(); select(n.id); });
    on(el, 'pointerenter', () => hover(n.id)); on(el, 'pointerleave', () => hover(null));
    labelsEl.appendChild(el); labels.push({ el, n, pri: kindPri(n), w: 60, h: 14 });
  });
  (['fl', 'mde'] as SiteId[]).forEach(id => {
    const s = SITES[id];
    const el = document.createElement('div'); el.className = 'tpx-l tpx-l-site'; el.style.setProperty('--c', SITEC[id]);
    const b = document.createElement('b'); b.textContent = s.label.split(',')[0].toUpperCase();
    const sp = document.createElement('span'); sp.textContent = `${s.role} · ${s.wan}`.toUpperCase();
    el.append(b, sp);
    labelsEl.appendChild(el); labels.push({ el, site: s, pri: 200, w: 120, h: 30 });
  });
  const meowEl = document.createElement('div'); meowEl.className = 'tpx-l tpx-l-meow'; meowEl.textContent = 'Nya~!'; labelsEl.appendChild(meowEl);
  let disposed = false;
  const measure = () => { if (!disposed) labels.forEach(l => { l.w = l.el.offsetWidth; l.h = l.el.offsetHeight; }); };
  document.fonts?.ready.then(measure);
  const measureT = window.setTimeout(measure, 400);
  const pv = new V3();
  function toScreen(v: Vec3): [number, number] {
    pv.copy(v).project(cam);
    const x = ((pv.x * 0.5 + 0.5) * lowW * ps + off.x * ps) / dpr, y = (cssH * dpr - ((pv.y * 0.5 + 0.5) * lowH * ps + off.y * ps)) / dpr;
    const q = ps / dpr; return [Math.round(x / q) * q, Math.round(y / q) * q];
  }
  function siteAnchor(s: Site): [number, number] {
    const pts = [[s.x0, s.z0], [s.x1, s.z0], [s.x0, s.z1], [s.x1, s.z1]].map(([x, z]) => new V3(x, -1.2, z));
    let best: [number, number] = [0, 0], by = -1;
    pts.forEach(p => { const [sx, sy] = toScreen(p); if (sy > by || (Math.abs(sy - by) < 1 && sx < best[0])) { by = sy; best = [sx, sy]; } });
    return best;
  }
  function layoutLabels() {
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const cand = labels.map(l => {
      if (l.site) { const [x, y] = siteAnchor(l.site); return { l, x: x - l.w / 2, y: y + 8, pri: l.pri, want: true }; }
      const n = l.n!, id = n.id, o = objs[id];
      let pri = l.pri, want = !isChip(n) && n.tier === 'phys';
      if (sel && related.has(id)) { want = true; pri += 50; }
      if (id === sel) pri = 150;
      if (id === hov) { want = true; pri = 160; }
      const p = o.g.position.clone(); p.y += dims(n)[1] / 2 + (n.ts && !isChip(n) ? 0.55 : 0.3);
      const [x, y] = toScreen(p); return { l, x: x - l.w / 2, y: y - l.h - 2, pri, want };
    }).sort((a, b) => b.pri - a.pri);
    cand.forEach(c => {
      const { l } = c; let show = c.want;
      if (show) for (const r of placed) if (c.x < r.x + r.w + 3 && c.x + l.w + 3 > r.x && c.y < r.y + r.h + 2 && c.y + l.h + 2 > r.y) { show = false; break; }
      if (show) placed.push({ x: c.x, y: c.y, w: l.w, h: l.h });
      l.el.style.transform = `translate(${c.x}px,${c.y}px)`;
      l.el.style.opacity = show ? (sel && l.n && !related.has(l.n.id) ? '.35' : '1') : '0';
      l.el.style.pointerEvents = show && l.n ? 'auto' : 'none';
      if (l.n) { l.el.classList.toggle('sel', l.n.id === sel); l.el.classList.toggle('hov', l.n.id === hov); }
    });
    if (catS.meow > 0) {
      const [x, y] = toScreen(cat.position.clone().setY(1.2));
      meowEl.style.transform = `translate(${x - 26}px,${y - 20}px)`; meowEl.style.opacity = '1';
    } else meowEl.style.opacity = '0';
  }

  // ── Input ──────────────────────────────────────────────────────────
  // Wheel zoom and touch-drag would hijack page scrolling, so they stay off
  // until the component opts in (the user clicked into the scene).
  let interactive = false;
  const ray = new THREE.Raycaster(); ray.layers.enableAll();
  const ndc = new THREE.Vector2();
  function pick(cx: number, cy: number): string | null {
    const r = canvas.getBoundingClientRect(), x = (cx - r.left) * dpr, y = (cssH - (cy - r.top)) * dpr;
    ndc.set(((x - off.x * ps) / (lowW * ps)) * 2 - 1, ((y - off.y * ps) / (lowH * ps)) * 2 - 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(pickables, false)[0]; return hit ? hit.object.userData.id : null;
  }
  let drag: { x: number; y: number; sx: number; sy: number; moved: boolean; pan: boolean } | null = null;
  on(canvas, 'pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, pan: e.pointerType === 'mouse' || interactive };
    if (drag.pan) canvas.setPointerCapture(e.pointerId);
  });
  on(canvas, 'pointermove', e => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) drag.moved = true;
      if (drag.moved && drag.pan) {
        const wpp = st.h / cssH, r = new V3(Math.cos(st.az), 0, -Math.sin(st.az)), f = new V3(-Math.sin(st.az), 0, -Math.cos(st.az));
        goal.t.addScaledVector(r, -dx * wpp).addScaledVector(f, dy * wpp / Math.sin(ELEV));
        goal.t.x = clamp(goal.t.x, -24, 26); goal.t.z = clamp(goal.t.z, -12, 12); st.t.copy(goal.t);
      }
    } else hover(pick(e.clientX, e.clientY));
  });
  on(canvas, 'pointerup', e => { if (drag && !drag.moved) select(pick(e.clientX, e.clientY)); drag = null; });
  on(canvas, 'pointercancel', () => { drag = null; });
  on(canvas, 'pointerleave', () => { if (!drag) hover(null); });
  on(canvas, 'wheel', e => {
    if (!interactive) return;
    e.preventDefault(); goal.h = clamp(goal.h * Math.exp(e.deltaY * 0.0012), 8, 60);
  }, { passive: false });
  function setInteractive(v: boolean) { interactive = v; canvas.style.touchAction = v ? 'none' : 'pan-y'; }

  // ── Loop ───────────────────────────────────────────────────────────
  const t0 = performance.now() - (reduced ? 10000 : 0);
  let last = performance.now(), time = 0, raf = 0, visible = true;
  function frame(now: number) {
    if (disposed || !visible) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduced) time += dt;
    const it = (now - t0) / 1000;
    placeCam(dt);
    islands.forEach((g, i) => { const p = clamp((it - i * 0.15) / 0.9); g.position.y = -Math.pow(1 - p, 3) * 7; });
    Object.values(objs).forEach(o => {
      const p = clamp((it - 0.5 - o.i * 0.035) / 0.8), drop = (1 - bounce(p)) * 7;
      o.g.visible = p > 0;
      o.g.position.set(o.base.x, o.base.y + drop + (o.floats ? Math.sin(time * 1.5 + o.phase) * 0.09 : 0), o.base.z);
      if (o.spin && !reduced) o.mesh.rotation.y += dt * o.spin;
      if (o.pip && !reduced) o.pip.rotation.y += dt * 2;
      const ft = !sel || related.has(o.n.id) ? 1 : 0; o.f += (ft - o.f) * (1 - Math.exp(-dt * 8));
      const f = 0.28 + 0.72 * o.f;
      o.mats.forEach(M => { M.m.color.copy(M.c).multiplyScalar(f); if (M.e) M.m.emissiveIntensity = M.e * (o.n.id === hov ? 1.8 : f); });
      if (o.light) o.light.intensity = 2.6 * f;
      if (reduced) return;
      o.blinkT -= dt;
      if (o.blinkT < 0) {
        o.blinkT = 0.08 + Math.random() * 0.35; const fi = Math.random() * 3 | 0;
        o.mats.forEach(M => { const fr = M.m.userData.frames as THREE.Texture[] | null; if (fr) M.m.emissiveMap = fr[fi]; });
      }
    });
    const showNet = clamp((it - 1.4) / 0.6);
    links.forEach(L => {
      const vis = layersOn[L.kind] && showNet > 0, rel = !!sel && (L.from === sel || L.to === sel);
      L.line.visible = vis;
      const target = !sel ? 0.85 : rel ? 1 : 0.12; L.op += (target - L.op) * (1 - Math.exp(-dt * 8)); L.mat.opacity = L.op * showNet;
      L.u += dt * (L.K.speed || 3) * 0.6 * (rel ? 2 : 1) / Math.max(1, L.len);
      L.pk.forEach(m => {
        m.visible = vis && m.userData.on && (!sel || rel) && it > 2;
        if (!m.visible) return;
        let s = (L.u + m.userData.off) % 1; if (m.userData.rev) s = 1 - s;
        at(L, s, m.position); m.scale.setScalar(rel ? 1.35 : 1);
      });
    });
    dots.forEach((d, i) => {
      const w = d.k ? Math.pow(Math.max(0, Math.sin((d.ph * 2 - time * 0.9) * Math.PI)), 6) : Math.pow(Math.max(0, Math.sin((d.ph * 3 - time * 0.18) * Math.PI * 2)), 8);
      const tw = 0.35 + 0.15 * Math.sin(time * 3 + i * 1.7);
      tmpC.copy(gDim).lerp(gMid, tw * 0.7 + w * 0.7); if (w > 0.5) tmpC.lerp(gHi, (w - 0.5) * 2);
      const f = sel ? 0.4 : 1; dotCol.set([tmpC.r * f, tmpC.g * f, tmpC.b * f], i * 3);
    });
    dotGeo.attributes.color.needsUpdate = true; dotMat.opacity = showNet;
    if (!reduced) {
      for (let i = 0; i < DUST; i++) { dustPos[i * 3 + 1] += dt * (0.15 + (i % 7) * 0.04); if (dustPos[i * 3 + 1] > 22) dustPos[i * 3 + 1] = -26; }
      dustGeo.attributes.position.needsUpdate = true;
    }
    // cat
    if (catS.meow > 0) catS.meow -= dt;
    else if (catS.pause > 0) catS.pause -= dt;
    else if (!reduced) {
      catS.x += catS.dir * dt * 0.9;
      if (catS.x < 2.2 || catS.x > 21.8) { catS.dir *= -1; catS.pause = 1.5; } else if (Math.random() < dt * 0.06) catS.pause = 1 + Math.random() * 2;
    }
    const walking = !reduced && catS.pause <= 0 && catS.meow <= 0;
    cat.material.map = catT[catS.dir < 0 ? 'L' : 'R'][walking ? (time * 5 | 0) % 2 : 0];
    cat.position.set(catS.x, islands[1].position.y + (catS.meow > 0 ? Math.abs(Math.sin(catS.meow * 6)) * 0.25 : 0), catS.z); cat.visible = it > 1.8;
    bangs.forEach(B => {
      const o = objs[B.n.id];
      B.s.position.copy(B.base).setY(B.base.y + Math.abs(Math.sin(time * 3)) * 0.22 + (o.g.position.y - o.base.y));
      B.s.visible = it > 1.6;
    });
    const pid = sel || hov;
    if (pid && objs[pid]) {
      const o = objs[pid]; pointer.visible = true;
      pointer.position.copy(o.g.position).setY(o.g.position.y + dims(o.n)[1] / 2 + (o.pip ? 0.75 : 0.4) + Math.abs(Math.sin(time * 5)) * 0.18);
      pointer.material.color.set(pid === sel ? '#ffffff' : '#9fb0cc');
    } else pointer.visible = false;
    render();
    layoutLabels();
    raf = requestAnimationFrame(frame);
  }
  function render() {
    const R = rt as Required<typeof rt>;
    scene.overrideMaterial = normalMat; cam.layers.set(0);
    renderer.setRenderTarget(R.norm); renderer.setClearColor(0, 0); renderer.clear(); renderer.render(scene, cam);
    scene.overrideMaterial = null; cam.layers.enableAll();
    renderer.shadowMap.needsUpdate = true;
    renderer.setRenderTarget(R.main); renderer.clear(); renderer.render(scene, cam);
    pass(copyM, { tIn: { value: R.main.texture } }, R.a);
    pass(blurM, { tIn: { value: R.a.texture }, uDir: { value: new THREE.Vector2(1 / R.hw, 0) } }, R.b);
    pass(blurM, { tIn: { value: R.b.texture }, uDir: { value: new THREE.Vector2(0, 1 / R.hh) } }, R.a);
    pass(brightM, { tIn: { value: R.main.texture } }, R.c);
    for (let i = 1; i <= 2; i++) {
      pass(blurM, { tIn: { value: R.c.texture }, uDir: { value: new THREE.Vector2(i / R.qw, 0) } }, R.d);
      pass(blurM, { tIn: { value: R.d.texture }, uDir: { value: new THREE.Vector2(0, i / R.qh) } }, R.c);
    }
    const U = finalM.uniforms;
    U.tColor.value = R.main.texture; U.tDepth.value = R.main.depthTexture; U.tNormal.value = R.norm.texture; U.tDof.value = R.a.texture; U.tBloom.value = R.c.texture;
    U.uOff.value.copy(off); U.uDither.value = opts.dither ? 1 : 0; U.uTilt.value = opts.tilt; U.uBloom.value = opts.bloom; U.uScan.value = opts.crt ? 1 : 0; U.uOutline.value = opts.outline ? 1 : 0;
    fsQuad.material = finalM; renderer.setRenderTarget(null); renderer.setClearColor(0x0a0e1a, 1); renderer.clear(); renderer.render(fsScene, fsCam);
  }

  // ── Boot ───────────────────────────────────────────────────────────
  const ro = new ResizeObserver(() => { resize(); if (sel) focusOn(sel); else setView(curView); });
  ro.observe(stage);
  const io = new IntersectionObserver(([e]) => {
    const was = visible; visible = e.isIntersecting;
    if (visible && !was && !disposed) { last = performance.now(); raf = requestAnimationFrame(frame); }
  });
  io.observe(stage);
  resize(); setView('overview', true); setInteractive(false);
  raf = requestAnimationFrame(frame);

  return {
    links,
    select,
    hover,
    setView: v => setView(v),
    rotate,
    setLayer(k, v) { layersOn[k] = v; },
    setInsets(i) { Object.assign(insets, i); if (sel) focusOn(sel); else setView(curView); },
    setInteractive,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf); window.clearTimeout(measureT);
      ro.disconnect(); io.disconnect();
      cleanups.forEach(f => f());
      RT_KEYS.forEach(k => { rt[k]?.depthTexture?.dispose(); rt[k]?.dispose(); });
      disposables.forEach(d => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      labelsEl.replaceChildren();
      THREE.ColorManagement.enabled = prevCM;
    },
  };
}
