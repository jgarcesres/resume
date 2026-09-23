// scene.ts — the three.js scene behind Topology3D. Framework-free: the React
// component hands it a stage element (canvas host) and a labels element (HTML
// overlay), and drives it through the returned API. Everything it creates is
// torn down by dispose(), so it survives StrictMode double-mounts and route
// changes.
//
// Ported from the claude.ai/design "Homelab Topology 3D" handoff.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CHIPS, COLORS as C, KINDS, LINKS, LINK_KINDS, NODES, SITES, TIERS, TIER_Y } from './data';
import type { BoxNode, Chip, HexNode, LinkDef, LinkKind, LinkKindDef, PlaneTier, TopoNode } from './data';

const V3 = THREE.Vector3;
type Vec3 = THREE.Vector3;

export type ViewName = 'overview' | 'fl' | 'mde' | 'top' | 'elevation';
export type LabelMode = 'all' | 'focus' | 'off';

export interface SceneOptions {
  autoRotate: boolean;
  traffic: number;
  spacing: number;
  labels: LabelMode;
  wave: number;
  layers: Record<LinkKind, boolean>;
}

/** Public, read-only view of a link (for the inspector's connection list). */
export interface SceneLinkInfo extends LinkDef {
  chip: boolean;
  K: LinkKindDef;
}

export interface TopologySceneApi {
  links: readonly SceneLinkInfo[];
  select(id: string | null): void;
  hover(id: string | null): void;
  setView(name: ViewName): void;
  setInsets(insets: { right: number; bottom: number }): void;
  setInteractive(on: boolean): void;
  set(o: Partial<SceneOptions>): void;
  dispose(): void;
}

export interface SceneCallbacks {
  onSelect?(id: string | null): void;
  onHover?(id: string | null): void;
  /** The user grabbed the camera, so no preset view is active any more. */
  onViewCleared?(): void;
}

export const defaultLayers = (): Record<LinkKind, boolean> =>
  Object.fromEntries(Object.entries(LINK_KINDS).map(([k, v]) => [k, !v.off])) as Record<LinkKind, boolean>;

// ── Internal model ───────────────────────────────────────────────────
interface Runtime {
  group: THREE.Group;
  inner: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  edgeMat: THREE.LineBasicMaterial;
  baseBody: THREE.Color;
  baseEdge: THREE.Color;
  hk: number;
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> | null;
  p: number;
  dim: boolean;
}
interface Item {
  id: string;
  n: TopoNode | Chip;
  isChip: boolean;
  tier: PlaneTier;
  delay: number;
  o: Runtime;
}
interface Link extends SceneLinkInfo {
  i: number;
  cross: boolean;
  delay: number;
  focus: boolean;
  curve?: THREE.Curve<Vec3>;
  len: number;
  samples: Vec3[];
  mesh?: THREE.Line | THREE.Mesh;
  mat?: THREE.LineDashedMaterial | THREE.MeshBasicMaterial;
  segs: number;
  mid: Vec3;
}
interface Led { it: Item; local: Vec3; color: THREE.Color; rate: number; phase: number; size: number }
interface Uplink { it: Item; mat: THREE.LineDashedMaterial; mesh?: THREE.Line; hit?: Vec3 }
interface Label {
  el: HTMLDivElement;
  getPos: () => Vec3;
  it?: Item;
  L?: Link;
  tier?: PlaneTier;
  shown?: boolean;
  cls?: string;
  w?: number;
  h?: number;
}
interface Packet { L: Link; phase: number; dir: number; sp: number }
interface Pulse { L: Link; dir: number; s: number; d: number }

const isBox = (n: TopoNode | Chip): n is BoxNode => 'size' in n;
const isHex = (n: TopoNode | Chip): n is HexNode => 'r' in n;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeBack = (t: number) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

const BODY: Record<string, string> = {
  hypervisor: '#1D221D', nas: '#1A1F1A', router: '#191C19', switch: '#191C19', mini: '#1E231F', pi: '#17281D', pizero: '#17281D',
  kvm: '#161816', ups: '#131513', desktop: '#151715', cp: '#131826', worker: '#131B15', ingress: '#2A220F', egress: '#2A220F',
};
const VIEWS: Record<ViewName, { p: [number, number, number]; t: [number, number, number] }> = {
  overview: { p: [-7, 21, 44], t: [1.5, 4.2, 0] },
  fl: { p: [-24, 11, 19], t: [-13, 3.6, 0.3] },
  mde: { p: [22, 12, 25], t: [11.5, 3.6, 0.5] },
  top: { p: [1.5, 64, 3], t: [1.5, 5, 0] },
  elevation: { p: [1.5, 5.4, 56], t: [1.5, 5.2, 0] },
};
const BOXES: Partial<Record<ViewName, [number, number]>> & { all: [number, number] } = { all: [-20.5, 23.5], fl: [-20.5, -6], mde: [0, 23.5] };
const PRI: Record<PlaneTier, number> = { k3s: 60, plane: 50, vm: 30, phys: 10 };

export function createTopologyScene(
  stage: HTMLElement,
  labelsEl: HTMLElement,
  init: Partial<SceneOptions> & { reducedMotion?: boolean } = {},
  cb: SceneCallbacks = {},
): TopologySceneApi {
  const reduced = !!init.reducedMotion;
  const opts: SceneOptions = {
    autoRotate: !reduced, traffic: reduced ? 0 : 1, spacing: 1, labels: 'all', wave: reduced ? 0 : 1, layers: defaultLayers(),
    ...init,
  };
  const insets = { right: 0, bottom: 0 };
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(x: T): T => { disposables.push(x); return x; };

  // ── Renderer / camera ──────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  stage.prepend(renderer.domElement);
  const canvas = renderer.domElement;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.bg);
  scene.fog = new THREE.FogExp2(C.bg, 0.0105);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 500);
  camera.position.set(-7, 21, 44);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(1.5, 4.2, 0);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, minDistance: 6, maxDistance: 120, maxPolarAngle: Math.PI * 0.495, autoRotateSpeed: 0.3, zoomSpeed: 0.8 });

  scene.add(new THREE.HemisphereLight(0xdfe8dc, 0x0a0c0a, 1.0));
  const sun = new THREE.DirectionalLight(0xfff2de, 2.3);
  sun.position.set(-10, 30, 18); sun.target.position.set(1.5, 0, 0);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 20, bottom: -20, near: 1, far: 80 });
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(0xe8b339, 0.35); rim.position.set(12, 22, -22); scene.add(rim);

  const std = (color: string, o: THREE.MeshStandardMaterialParameters = {}) =>
    track(new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3, ...o }));
  const cTs = new THREE.Color(C.ts), cPing = new THREE.Color(C.ping);

  // ── Items ──────────────────────────────────────────────────────────
  const items: Item[] = [
    ...NODES.map(n => ({ id: n.id, n, isChip: false, tier: n.tier as PlaneTier })),
    ...CHIPS.map(n => ({ id: n.id, n, isChip: true, tier: 'plane' as PlaneTier })),
  ].map(x => ({ ...x, delay: 0, o: undefined as unknown as Runtime }));
  const byId: Record<string, Item> = Object.fromEntries(items.map(it => [it.id, it]));

  const tierY = (t: PlaneTier) => TIER_Y[t] * (t === 'phys' ? 1 : opts.spacing);
  const dims = (it: Item): [number, number, number] => {
    if (it.isChip) return [1.1, 0.08, 1.1];
    if (isHex(it.n)) return [it.n.r * 2, it.n.h, it.n.r * 2];
    return (it.n as BoxNode).size;
  };
  const nodePos = (it: Item, out = new V3()) =>
    out.set(it.n.pos[0], it.isChip ? tierY('plane') + 0.05 : tierY(it.tier) + dims(it)[1] / 2, it.n.pos[1]);
  const topOf = (it: Item) => { const p = nodePos(it); p.y += dims(it)[1] / 2; return p; };
  const uplinkTop = (it: Item) => {
    const p = topOf(it);
    if (isBox(it.n) && it.n.uplink) { p.x += it.n.uplink[0]; p.z += it.n.uplink[1]; }
    return p;
  };
  const edgeColorOf = (it: Item) => KINDS[it.n.kind].edge;
  const lineGeom = (pts: number[]) => {
    const g = track(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return g;
  };

  // ── Ground + plinths ───────────────────────────────────────────────
  const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(260, 260)), std('#070907', { roughness: 1, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.9; ground.receiveShadow = true; scene.add(ground);
  {
    const pts: number[] = [];
    for (let x = -60; x <= 60; x += 2) for (let z = -40; z <= 40; z += 2) pts.push(x, -0.88, z);
    scene.add(new THREE.Points(lineGeom(pts), track(new THREE.PointsMaterial({ color: '#262c24', size: 0.08, sizeAttenuation: true }))));
  }
  const bracketGeom = (x0: number, x1: number, z0: number, z1: number, len: number) => {
    const p: number[] = [];
    ([[x0, z0, 1, 1], [x1, z0, -1, 1], [x0, z1, 1, -1], [x1, z1, -1, -1]] as const).forEach(([x, z, sx, sz]) =>
      p.push(x, 0, z, x + sx * len, 0, z, x, 0, z, x, 0, z + sz * len));
    return lineGeom(p);
  };
  const tierGroups: THREE.Group[] = [];
  Object.values(SITES).forEach(s => {
    const w = s.x1 - s.x0, d = s.z1 - s.z0, cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2;
    const slab = new THREE.Mesh(track(new THREE.BoxGeometry(w, 0.9, d)), std('#0D100D', { roughness: 0.92, metalness: 0.05 }));
    slab.position.set(cx, -0.45, cz); slab.receiveShadow = true; scene.add(slab);
    const se = new THREE.LineSegments(track(new THREE.EdgesGeometry(slab.geometry)), track(new THREE.LineBasicMaterial({ color: '#2A3129' })));
    se.position.copy(slab.position); scene.add(se);
    const gp: number[] = [];
    for (let x = Math.ceil(s.x0 + 0.5); x < s.x1; x++) gp.push(x, 0.002, s.z0, x, 0.002, s.z1);
    for (let z = Math.ceil(s.z0 + 0.5); z < s.z1; z++) gp.push(s.x0, 0.002, z, s.x1, 0.002, z);
    scene.add(new THREE.LineSegments(lineGeom(gp), track(new THREE.LineBasicMaterial({ color: '#161B16', transparent: true, opacity: 0.9 }))));
    const strip = new THREE.Mesh(track(new THREE.BoxGeometry(w, 0.025, 0.025)), track(new THREE.MeshBasicMaterial({ color: C.accent })));
    strip.position.set(cx, 0, s.z1); scene.add(strip);
    (['vm', 'k3s'] as const).forEach(t => {
      const g = new THREE.Group();
      const glass = new THREE.Mesh(track(new THREE.PlaneGeometry(w - 0.6, d - 0.6)),
        track(new THREE.MeshBasicMaterial({ color: C.ink, transparent: true, opacity: 0.018, depthWrite: false, side: THREE.DoubleSide })));
      glass.rotation.x = -Math.PI / 2; glass.position.set(cx, 0, cz); g.add(glass);
      g.add(new THREE.LineSegments(bracketGeom(s.x0 + 0.3, s.x1 - 0.3, s.z0 + 0.3, s.z1 - 0.3, 0.8),
        track(new THREE.LineBasicMaterial({ color: C.dim, transparent: true, opacity: 0.55 }))));
      g.userData.tier = t; scene.add(g); tierGroups.push(g);
    });
  });

  // ── Nodes ──────────────────────────────────────────────────────────
  const SH = { inset: std('#080A08', { roughness: 0.9, metalness: 0 }), port: std('#040504', { roughness: 1, metalness: 0 }), hat: std('#0F1A13') };
  const pickables: THREE.Object3D[] = [], leds: Led[] = [];

  function buildNode(it: Item) {
    const group = new THREE.Group(), inner = new THREE.Group(); group.add(inner); scene.add(group);
    const [w, h, d] = dims(it);
    const edgeMat = track(new THREE.LineBasicMaterial({ color: edgeColorOf(it), transparent: true, opacity: 1 }));
    let geom: THREE.BufferGeometry, bodyMat: THREE.MeshStandardMaterial;
    if (it.tier === 'k3s' || it.isChip) {
      geom = it.isChip ? new THREE.CylinderGeometry(0.55, 0.55, 0.08, 6) : new THREE.CylinderGeometry(w / 2, w / 2, h, 6, 1);
      geom.rotateY(Math.PI / 6);
      bodyMat = std(BODY[it.n.kind], { roughness: 0.4, metalness: 0.55 });
    } else if (it.tier === 'vm') {
      geom = new THREE.BoxGeometry(w, h, d);
      bodyMat = track(new THREE.MeshStandardMaterial({ color: C.accent, transparent: true, opacity: 0.09, roughness: 0.15, metalness: 0, depthWrite: false }));
    } else {
      geom = new THREE.BoxGeometry(w, h, d);
      bodyMat = std(BODY[it.n.kind]);
    }
    track(geom);
    const body = new THREE.Mesh(geom, bodyMat);
    body.castShadow = it.tier !== 'vm' && !it.isChip; body.receiveShadow = true; body.userData.id = it.id;
    inner.add(body); pickables.push(body);
    inner.add(new THREE.LineSegments(track(new THREE.EdgesGeometry(geom, 25)), edgeMat));
    it.o = { group, inner, bodyMat, edgeMat, baseBody: bodyMat.color.clone(), baseEdge: new THREE.Color(edgeColorOf(it)), hk: 1, ring: null, p: 0, dim: false };
    addDetails(it, w, h, d);
  }

  function addDetails(it: Item, w: number, h: number, d: number) {
    const { inner } = it.o, fz = d / 2 + 0.004, R = Math.random, n = it.n;
    const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
      const me = new THREE.Mesh(track(g), m); me.position.set(x, y, z); inner.add(me); return me;
    };
    const B = (a: number, b: number, c: number) => new THREE.BoxGeometry(a, b, c);
    const basic = (color: string) => track(new THREE.MeshBasicMaterial({ color }));
    const led = (x: number, y: number, z: number, color: string = C.led, rate = 0, size = 0.13) =>
      leds.push({ it, local: new V3(x, y, z), color: new THREE.Color(color), rate, phase: R() * 20, size });
    const bx = isBox(n) ? n : undefined;
    switch (n.kind) {
      case 'hypervisor': {
        const bays = bx?.bays ?? 0;
        if (bx?.form === 'tower') {
          for (let i = 0; i < 2; i++) add(B(w * 0.72, 0.16, 0.02), SH.inset, 0, h / 2 - 0.32 - i * 0.22, fz);
          for (let i = 0; i < 9; i++) add(B(w * 0.56, 0.035, 0.02), SH.inset, -w * 0.08, -h * 0.08 - i * 0.1, fz);
          for (let i = 0; i < bays; i++) led(w / 2 - 0.16, -h * 0.08 - i * 0.15, fz + 0.012, C.led, 3 + R() * 5, 0.08);
          led(w / 2 - 0.16, h / 2 - 0.14, fz + 0.012, n.warn ? C.warn : C.led, n.warn ? -1 : 0, 0.16);
          break;
        }
        const bw = 0.38, gap = 0.07, bh = h * 0.58, x0 = -w / 2 + 0.35;
        for (let i = 0; i < bays; i++) {
          const x = x0 + bw / 2 + i * (bw + gap);
          add(B(bw, bh, 0.02), SH.inset, x, -0.05, fz); led(x + bw * 0.28, -0.05 + bh * 0.4, fz + 0.012, C.led, 3 + R() * 5, 0.08);
        }
        for (let i = 0; i < 5; i++) add(B(0.9, 0.035, 0.02), SH.inset, w / 2 - 0.75, -0.35 + i * 0.14, fz);
        led(w / 2 - 0.22, h / 2 - 0.22, fz + 0.012, n.warn ? C.warn : C.led, n.warn ? -1 : 0, 0.16);
        break;
      }
      case 'nas': {
        const bays = 5, bw = (w - 0.4) / bays - 0.05;
        for (let i = 0; i < bays; i++) {
          const x = -w / 2 + 0.2 + bw / 2 + i * (bw + 0.05);
          add(B(bw, h * 0.66, 0.02), SH.inset, x, -0.12, fz); led(x, h * 0.26 + 0.02, fz + 0.012, C.led, 2 + R() * 6, 0.08);
        }
        led(-w / 2 + 0.2, h / 2 - 0.15, fz + 0.012, C.led, 0, 0.12);
        break;
      }
      case 'router': case 'switch': {
        const p = bx?.ports ?? 0, span = w * 0.72;
        for (let i = 0; i < p; i++) {
          const x = -span / 2 + (i + 0.5) * span / p;
          add(B(0.11, 0.09, 0.02), SH.port, x, -0.03, fz); led(x, 0.09, fz + 0.012, C.led, 6 + R() * 8, 0.07);
        }
        break;
      }
      case 'mini': add(B(w * 0.5, 0.03, 0.02), SH.inset, 0, -h * 0.18, fz); led(w / 2 - 0.18, h * 0.12, fz + 0.012, C.led, 0, 0.11); break;
      case 'pi': case 'pizero':
        add(B(w * 0.28, 0.06, d * 0.3), SH.inset, -w * 0.15, h / 2 + 0.03, 0);
        if (bx?.hat) add(B(w * 0.9, 0.03, d * 0.85), SH.hat, 0, h / 2 + 0.1, 0);
        led(w / 2 - 0.12, 0, fz + 0.012, C.led, 4 + R() * 3, 0.1);
        break;
      case 'kvm': add(B(w * 0.42, h * 0.45, 0.02), basic('#132230'), -w * 0.14, 0, fz); led(w / 2 - 0.14, 0, fz + 0.012, C.led, 0, 0.1); break;
      case 'ups':
        add(B(w * 0.5, 0.22, 0.02), basic('#3a2f12'), 0, h * 0.28, fz);
        led(-w * 0.32, h * 0.28, fz + 0.012, n.warn ? C.warn : C.led, n.warn ? -1 : 0, 0.12);
        break;
      case 'desktop': add(B(0.03, h * 0.7, 0.02), basic('#1d4a44'), w * 0.3, 0, fz); led(-w * 0.25, h / 2 - 0.15, fz + 0.012, C.led, 0, 0.11); break;
      case 'vm': led(w / 2 - 0.16, h / 2 - 0.16, fz + 0.012, C.accent, 0, 0.1); break;
      default: {
        const rr = w / 2;
        const ring = add(new THREE.RingGeometry(rr * 0.5, rr * 0.6, 6),
          track(new THREE.MeshBasicMaterial({ color: edgeColorOf(it), transparent: true, opacity: 0.75, side: THREE.DoubleSide })), 0, h / 2 + 0.003, 0) as THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
        ring.rotation.x = -Math.PI / 2; it.o.ring = ring;
        led(0, h / 2 + 0.06, 0, it.isChip ? C.ts : C.led, 0, it.isChip ? 0.7 : 0.22);
      }
    }
  }
  items.forEach(buildNode);

  // ── Tailnet plane (point field with ripples) ───────────────────────
  const PW = 46, PD = 13.5, PX = 1.5, SP = 0.3;
  const planeUniforms = {
    uTime: { value: 0 }, uPx: { value: 1 }, uOpacity: { value: 0 }, uWave: { value: opts.wave },
    uR: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, -99, 0)) },
    uHalf: { value: new THREE.Vector2(PW / 2, PD / 2) }, uCenter: { value: new THREE.Vector2(PX, 0) }, uColor: { value: new THREE.Color(C.ts) },
  };
  const plane = (() => {
    const p: number[] = [];
    for (let i = 0; i <= PW / SP; i++) for (let j = 0; j <= PD / SP; j++) p.push(PX - PW / 2 + i * SP, 0, -PD / 2 + j * SP);
    const m = track(new THREE.ShaderMaterial({
      uniforms: planeUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uTime,uPx,uWave;uniform vec4 uR[8];uniform vec2 uHalf,uCenter;varying float vA;
      void main(){vec3 p=position;
      float h=(sin(p.x*.32+uTime*.7)*.07+cos(p.z*.55-uTime*.5)*.05+sin((p.x+p.z)*.18+uTime*.35)*.06)*uWave;float g=0.;
      for(int i=0;i<8;i++){vec4 r=uR[i];float age=uTime-r.z;if(age<0.||age>3.5)continue;float d=distance(p.xz,r.xy);float f=d-age*6.5;float w=exp(-f*f*1.1)*r.w*(1.-age/3.5);g+=w;h+=w*.5*uWave;}
      p.y+=h;vec2 e=abs(p.xz-uCenter)/uHalf;float edge=1.-smoothstep(.8,1.,max(e.x,e.y));
      vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=(.065+g*.09)*uPx/-mv.z;vA=(.34+g*1.3+max(h,0.)*.9)*edge;gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `uniform vec3 uColor;uniform float uOpacity;varying float vA;
      void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(uColor,smoothstep(1.,.2,d)*vA*uOpacity);}`,
    }));
    const pts = new THREE.Points(lineGeom(p), m); pts.frustumCulled = false; scene.add(pts); return pts;
  })();
  const planeFrameMat = track(new THREE.LineBasicMaterial({ color: C.ts, transparent: true, opacity: 0 }));
  const planeFrame = new THREE.LineSegments(bracketGeom(PX - PW / 2 + 0.8, PX + PW / 2 - 0.8, -PD / 2 + 0.8, PD / 2 - 0.8, 1.4), planeFrameMat);
  scene.add(planeFrame);
  let rippleIdx = 0, time = 0;
  const ripple = (x: number, z: number, amp = 1) => { planeUniforms.uR.value[rippleIdx].set(x, z, time, amp); rippleIdx = (rippleIdx + 1) % 8; };

  // ── Glow points (LEDs, packets, pulses) ────────────────────────────
  const MAXP = 2400;
  const gPos = new Float32Array(MAXP * 3), gCol = new Float32Array(MAXP * 3), gSize = new Float32Array(MAXP), gAlpha = new Float32Array(MAXP);
  const glowGeo = track(new THREE.BufferGeometry());
  const dyn = (a: Float32Array, n: number) => new THREE.BufferAttribute(a, n).setUsage(THREE.DynamicDrawUsage);
  glowGeo.setAttribute('position', dyn(gPos, 3));
  glowGeo.setAttribute('aColor', dyn(gCol, 3));
  glowGeo.setAttribute('aSize', dyn(gSize, 1));
  glowGeo.setAttribute('aAlpha', dyn(gAlpha, 1));
  const glowUniforms = { uPx: { value: 1 } };
  const glow = new THREE.Points(glowGeo, track(new THREE.ShaderMaterial({
    uniforms: glowUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aSize,aAlpha;attribute vec3 aColor;uniform float uPx;varying vec3 vC;varying float vA;
    void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uPx/-mv.z;vC=aColor;vA=aAlpha;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;
    float a=pow(1.-d,2.)*.7+smoothstep(.3,0.,d)*.7;gl_FragColor=vec4(vC*(1.+smoothstep(.25,0.,d)*.8),a*vA);}`,
  })));
  glow.frustumCulled = false; scene.add(glow);

  // ── Links ──────────────────────────────────────────────────────────
  const mkLink = (l: LinkDef, chip: boolean): Link => ({
    ...l, chip, K: LINK_KINDS[l.kind], i: 0, cross: false, delay: 0, focus: false, len: 1, samples: [], segs: 0, mid: new V3(),
  });
  const links: Link[] = LINKS.map(l => mkLink(l, false));
  CHIPS.forEach(c => {
    c.hosts.forEach(h => links.push(mkLink({ from: c.id, to: h, kind: 'tailnet', label: 'proxy pod' }, true)));
    if (c.target && c.targetKind) links.push(mkLink({ from: c.id, to: c.target, kind: c.targetKind, label: 'egress target' }, true));
  });
  links.forEach((L, i) => { L.i = i; L.cross = !L.chip && byId[L.from].n.site !== byId[L.to].n.site; L.delay = (i % 12) * 0.04; });

  function curveFor(L: Link): THREE.Curve<Vec3> {
    const a = byId[L.from], b = byId[L.to], P = tierY('plane');
    if (L.chip) {
      const A = nodePos(a), U = uplinkTop(b);
      return new THREE.CatmullRomCurve3([A, new V3((A.x + U.x) / 2, P + 0.55, (A.z + U.z) / 2), new V3(U.x, P, U.z), new V3(U.x, (P + U.y) / 2, U.z), U], false, 'centripetal');
    }
    if (L.cross) {
      const A = uplinkTop(a), B = uplinkTop(b);
      const q = (t: number) => new V3(lerp(A.x, B.x, t), P + 1.1, lerp(A.z, B.z, t));
      return new THREE.CatmullRomCurve3([A, new V3(A.x, P, A.z), q(0.15), new V3((A.x + B.x) / 2, P + 1.9, (A.z + B.z) / 2), q(0.85), new V3(B.x, P, B.z), B], false, 'centripetal');
    }
    if (L.kind === 'runs') {
      const lo = tierY(a.tier) < tierY(b.tier) ? a : b, hi = lo === a ? b : a;
      const e = nodePos(hi); e.y -= dims(hi)[1] / 2;
      const s = topOf(lo); s.x = e.x; s.z = e.z;
      return new THREE.LineCurve3(s, e);
    }
    if (a.tier === 'phys' && b.tier === 'phys') {
      const A = nodePos(a), B = nodePos(b); A.y = B.y = 0.03; A.z += dims(a)[2] / 2; B.z += dims(b)[2] / 2;
      const m = A.clone().lerp(B, 0.5); m.z += 0.6 + A.distanceTo(B) * 0.08;
      return new THREE.QuadraticBezierCurve3(A, m, B);
    }
    const A = topOf(a), B = topOf(b), dist = A.distanceTo(B), m = A.clone().lerp(B, 0.5);
    m.y = Math.max(A.y, B.y) + 0.6 + dist * 0.2;
    if (L.kind === 'etcd' && dist > 4) m.z -= 1.2;
    return new THREE.QuadraticBezierCurve3(A, m, B);
  }

  function buildLinks() {
    links.forEach(L => {
      const curve = curveFor(L);
      L.curve = curve; L.len = curve.getLength(); L.samples = curve.getSpacedPoints(96);
      if (L.mesh) { scene.remove(L.mesh); L.mesh.geometry.dispose(); }
      if (L.K.dashed) {
        L.mat ||= track(new THREE.LineDashedMaterial({ color: L.K.color, dashSize: 0.12, gapSize: 0.09, transparent: true, opacity: 0.8 }));
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(24)), L.mat);
        line.computeLineDistances(); L.mesh = line; L.segs = 25;
      } else {
        L.segs = Math.min(220, Math.max(14, Math.round(L.len * 5)));
        L.mat ||= track(new THREE.MeshBasicMaterial({ color: L.K.color, transparent: true, opacity: 0.5, depthWrite: false }));
        L.mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, L.segs, (L.K.r ?? 0.02) * (L.chip ? 0.8 : 1), 6, false), L.mat);
      }
      scene.add(L.mesh);
      L.mid = curve.getPointAt(0.5);
    });
  }

  const uplinks: Uplink[] = items.filter(it => it.n.ts).map(it => ({
    it, mat: track(new THREE.LineDashedMaterial({ color: C.ts, dashSize: 0.1, gapSize: 0.12, transparent: true, opacity: 0.4 })),
  }));
  function buildUplinks() {
    const P = tierY('plane');
    uplinks.forEach(u => {
      if (u.mesh) { scene.remove(u.mesh); u.mesh.geometry.dispose(); }
      const s = uplinkTop(u.it); u.hit = new V3(s.x, P, s.z);
      u.mesh = new THREE.Line(new THREE.BufferGeometry().setFromPoints([s, u.hit]), u.mat);
      u.mesh.computeLineDistances(); scene.add(u.mesh);
    });
  }

  function layout() {
    items.forEach(it => nodePos(it, it.o.group.position));
    tierGroups.forEach(g => { g.position.y = tierY(g.userData.tier as PlaneTier) - 0.01; });
    plane.position.y = tierY('plane'); planeFrame.position.y = tierY('plane');
    buildLinks(); buildUplinks(); applyLayers(); applyVisual();
  }

  // ── Packets ────────────────────────────────────────────────────────
  let packets: Packet[] = [];
  function seedPackets() {
    packets = [];
    links.forEach(L => {
      const count = Math.round(L.K.traffic * opts.traffic * (L.chip ? 0.7 : 1));
      for (let i = 0; i < count; i++) packets.push({ L, phase: i / count + Math.random() * 0.12, dir: L.K.bidir && i % 2 ? -1 : 1, sp: 0.85 + Math.random() * 0.3 });
    });
  }
  const pulses: Pulse[] = [], timers: { at: number; fn: () => void }[] = [];
  const sampleAt = (L: Link, t: number, out: Vec3) => {
    const s = L.samples, f = clamp(t) * (s.length - 1), i = Math.floor(f), k = f - i;
    return out.copy(s[i]).lerp(s[Math.min(i + 1, s.length - 1)], k);
  };
  const linkVisible = (L: Link) => opts.layers[L.kind] && (!L.chip || opts.layers.tailnet);

  // ── State / focus ──────────────────────────────────────────────────
  const state = { sel: null as string | null, hover: null as string | null, focus: new Set<string>() };
  const touches = (L: Link, id: string) => L.from === id || L.to === id;
  function computeFocus() {
    state.focus = new Set();
    if (!state.sel) return;
    state.focus.add(state.sel);
    links.forEach(L => { if (L.from === state.sel) state.focus.add(L.to); if (L.to === state.sel) state.focus.add(L.from); });
  }
  function applyVisual() {
    items.forEach(it => {
      const o = it.o, inF = !state.sel || state.focus.has(it.id);
      o.edgeMat.color.copy(state.sel === it.id ? cTs : state.hover === it.id ? cPing : o.baseEdge);
      o.edgeMat.opacity = inF ? 1 : 0.14;
      if (it.tier === 'vm') o.bodyMat.opacity = inF ? 0.09 : 0.025;
      else o.bodyMat.color.copy(o.baseBody).multiplyScalar(inF ? 1 : 0.4);
      if (o.ring) { o.ring.material.color.copy(o.edgeMat.color); o.ring.material.opacity = inF ? 0.75 : 0.12; }
      o.dim = !inF;
    });
    links.forEach(L => {
      const f = !state.sel || touches(L, state.sel);
      L.focus = !!state.sel && f;
      if (L.mat) L.mat.opacity = state.sel ? (f ? 0.95 : 0.04) : state.hover && touches(L, state.hover) ? 0.9 : (L.K.dashed ? 0.7 : 0.55);
    });
    uplinks.forEach(u => { u.mat.opacity = state.sel ? (state.focus.has(u.it.id) ? 0.7 : 0.08) : 0.38; });
  }
  function applyLayers() {
    links.forEach(L => { if (L.mesh) L.mesh.visible = linkVisible(L); });
    uplinks.forEach(u => { if (u.mesh) u.mesh.visible = opts.layers.tailnet; });
  }

  // ── Labels (HTML overlay) ──────────────────────────────────────────
  const labelItems: Label[] = [];
  const cleanups: (() => void)[] = [];
  const esc = (s: string) => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] as string);
  function mkLabel(cls: string, html: string, getPos: () => Vec3, extra: Partial<Label> = {}) {
    const el = document.createElement('div'); el.className = 't3d-l3 ' + cls; el.innerHTML = html; labelsEl.appendChild(el);
    const it: Label = { el, getPos, ...extra }; labelItems.push(it); return it;
  }
  const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement, ev: K, fn: (e: HTMLElementEventMap[K]) => void) => {
    el.addEventListener(ev, fn); cleanups.push(() => el.removeEventListener(ev, fn));
  };
  items.forEach(it => {
    const lb = mkLabel(it.isChip ? 't3d-l3-chip' : 't3d-l3-node',
      `<span class="dot" style="background:${edgeColorOf(it)}"></span><b>${esc(it.n.label)}</b><i>${esc(it.n.sub)}</i>`,
      () => { const p = topOf(it); p.y += it.isChip ? 0.25 : 0.22; return p; }, { it });
    on(lb.el, 'click', e => { e.stopPropagation(); select(it.id); });
    on(lb.el, 'pointerenter', () => setHover(it.id));
    on(lb.el, 'pointerleave', () => setHover(null));
  });
  links.forEach(L => {
    if (L.label && !L.chip) mkLabel('t3d-l3-link', `<span style="background:${L.K.color}"></span>${esc(L.label)}`, () => L.mid, { L });
  });
  (Object.keys(TIERS) as PlaneTier[]).forEach(id => {
    const t = TIERS[id];
    mkLabel('t3d-l3-tier', `<em>${t.idx}</em>${esc(t.label)}`,
      () => new V3(SITES.fl.x0 - 0.3, tierY(id) + (id === 'phys' ? 0.05 : 0), SITES.fl.z1 - 0.3), { tier: id });
  });
  Object.values(SITES).forEach(s => mkLabel('t3d-l3-site',
    `<em>${s.idx} · ${esc(s.role)}</em><b>${esc(s.label)}</b><i>${esc(s.wan)}</i>`, () => new V3(s.x0 + 0.1, -0.9, s.z1)));
  mkLabel('t3d-l3-gap', '≈ 1,800 km · public internet', () => new V3(-3, tierY('plane') + 2.3, 0));

  const tmp = new V3();
  function updateLabels(W: number, H: number, intro: number) {
    const mode = opts.labels, placed: number[][] = [];
    const cand: { lb: Label; x: number; y: number; pri: number }[] = [];
    const topDown = camera.position.clone().sub(controls.target).normalize().y > 0.8;
    labelItems.forEach(lb => {
      let show = true, cls = '';
      if (lb.it) {
        const it = lb.it, isSel = state.sel === it.id, isHov = state.hover === it.id;
        const inF = !state.sel || state.focus.has(it.id);
        if (mode === 'off') show = isSel || isHov;
        else if (mode === 'focus') show = isSel || isHov || (state.sel ? inF : (it.tier === 'k3s' || it.isChip || it.n.kind === 'hypervisor'));
        show = show && it.o.p > 0.85;
        if (it.isChip) show = show && opts.layers.tailnet;
        cls = (isSel ? ' sel' : '') + (isHov ? ' hov' : '') + (!inF ? ' dim' : '') + (isSel || isHov ? ' open' : '');
      } else if (lb.L) {
        show = lb.L.focus && linkVisible(lb.L);
      } else show = intro > 1.2 && !(lb.tier && topDown);
      if (show) {
        tmp.copy(lb.getPos()).project(camera);
        if (tmp.z > 1 || tmp.z < -1) show = false;
      }
      if (!show) { if (lb.shown !== false) { lb.el.style.display = 'none'; lb.shown = false; } return; }
      const x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H;
      if (lb.cls !== cls) { lb.el.className = lb.el.className.replace(/ (sel|hov|dim|open)/g, '') + cls; lb.cls = cls; lb.w = 0; }
      let pri = 1000;
      if (lb.it) {
        const it = lb.it;
        pri = state.sel === it.id ? 200 : state.hover === it.id ? 190
          : PRI[it.tier] + (it.n.kind === 'hypervisor' ? 35 : 0) + (state.focus.has(it.id) ? 80 : 0) - tmp.z;
      }
      cand.push({ lb, x, y, pri });
    });
    cand.sort((a, b) => b.pri - a.pri);
    cand.forEach(({ lb, x, y, pri }) => {
      if (lb.it) {
        if (lb.shown !== true) { lb.el.style.display = ''; lb.shown = true; }
        if (!lb.w) { lb.w = lb.el.offsetWidth; lb.h = lb.el.offsetHeight; }
        const w = lb.w, h = lb.h ?? 0;
        const r = [x - w / 2 - 2, y - h - 2, x + w / 2 + 2, y + 2];
        const hit = pri < 150 && placed.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
        if (hit) { lb.el.style.display = 'none'; lb.shown = false; return; }
        placed.push(r);
      } else {
        if (lb.shown !== true) { lb.el.style.display = ''; lb.shown = true; }
        // Tier labels hang off the left edge of the Florida plinth; drop them
        // rather than show a clipped fragment when that edge is off-frame.
        if (lb.tier) {
          if (!lb.w) lb.w = lb.el.offsetWidth;
          if (x - lb.w < 4) { lb.el.style.display = 'none'; lb.shown = false; return; }
        }
      }
      lb.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    });
  }

  // ── Interaction ────────────────────────────────────────────────────
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down: { x: number; y: number } | null = null;
  function pickAt(e: PointerEvent): string | null {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    return hit ? (hit.object.userData.id as string) : null;
  }
  function setHover(id: string | null) {
    if (state.hover === id) return;
    state.hover = id; canvas.style.cursor = id ? 'pointer' : '';
    applyVisual(); cb.onHover?.(id);
  }
  on(canvas, 'pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  on(canvas, 'pointermove', e => { if (!e.buttons) setHover(pickAt(e)); });
  on(canvas, 'pointerleave', () => setHover(null));
  on(canvas, 'pointerup', e => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
    if (moved < 5) select(pickAt(e));
  });

  type Tween = { p0: Vec3; t0: Vec3; p1: Vec3; t1: Vec3; s: number; d: number };
  let tween: Tween | null = null;
  let curView: ViewName | null = 'overview';
  const onStart = () => { tween = null; if (curView) { curView = null; cb.onViewCleared?.(); } };
  controls.addEventListener('start', onStart);

  const flyTo = (p: Vec3, t: Vec3, d = 1.2) => { tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: p, t1: t, s: time, d: reduced ? 0.001 : d }; };
  function flyToNode(it: Item) {
    const t = nodePos(it), dir = camera.position.clone().sub(controls.target).normalize();
    if (dir.y < 0.25) { dir.y = 0.25; dir.normalize(); }
    const H = stage.clientHeight, W = stage.clientWidth, h = Math.max(H - insets.bottom, 1);
    const k = H / h * clamp(1.5 / ((W - insets.right) / h), 1, 2);
    flyTo(t.clone().addScaledVector(dir, (it.isChip ? 17 : it.tier === 'phys' ? 13 : 15) * k), t);
  }
  function fitPos(name: ViewName) {
    const v = VIEWS[name], t = new V3(...v.t), base = new V3(...v.p).sub(t);
    const xr = BOXES[name] ?? BOXES.all, P = tierY('plane');
    const corners: Vec3[] = [];
    for (const x of xr) for (const y of [-0.9, P + 0.6]) for (const z of [-5, 6]) corners.push(new V3(x, y, z));
    const W = stage.clientWidth, H = stage.clientHeight;
    const xMax = 1 - 2 * insets.right / W - 0.04, yMin = -1 + 2 * insets.bottom / H + 0.06, yMax = 0.86, xMin = -0.96;
    const sp = camera.position.clone(), sq = camera.quaternion.clone();
    const place = (k: number) => { camera.position.copy(t).addScaledVector(base, k); camera.lookAt(t); camera.updateMatrixWorld(); };
    const fits = (k: number) => {
      place(k);
      return corners.every(c => { const q = c.clone().project(camera); return q.x > xMin && q.x < xMax && q.y > yMin && q.y < yMax; });
    };
    const search = () => {
      let lo = 0.3, hi = 5;
      for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; }
      return hi;
    };
    // Fitting alone leaves the target at frame centre, which parks the scene
    // low (the near floor edge projects much bigger than the far top edge).
    // Slide the target so the projected bounds sit centred in the free area,
    // then refit; a few passes converge.
    let k = search();
    const right = new V3(), up = new V3(), q = new V3();
    for (let pass = 0; pass < 3; pass++) {
      place(k);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      corners.forEach(c => { q.copy(c).project(camera); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); });
      const hh = base.length() * k * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), hw = hh * camera.aspect;
      right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);
      t.addScaledVector(right, ((x0 + x1) / 2 - (xMin + xMax) / 2) * hw).addScaledVector(up, ((y0 + y1) / 2 - (yMin + yMax) / 2) * hh);
      k = search();
    }
    camera.position.copy(sp); camera.quaternion.copy(sq); camera.updateMatrixWorld();
    return { p: t.clone().addScaledVector(base, k), t };
  }
  function setView(name: ViewName, d = 1.4) {
    curView = name;
    const f = fitPos(name); flyTo(f.p, f.t, d);
  }

  function spawnPulses(it: Item) {
    links.filter(L => linkVisible(L) && touches(L, it.id) && !L.K.dashed).forEach((L, k) => {
      const dir = L.from === it.id ? 1 : -1, d = clamp(L.len / 9, 0.6, 2.6);
      for (let j = 0; j < 3; j++) pulses.push({ L, dir, s: time + j * 0.14 + k * 0.04, d });
      const far = byId[dir > 0 ? L.to : L.from];
      if ((L.cross || L.chip) && far.n.ts) timers.push({ at: time + d * 0.8, fn: () => { const u = uplinkTop(far); ripple(u.x, u.z, 1); } });
    });
    if (it.n.ts || it.isChip) { const u = it.isChip ? nodePos(it) : uplinkTop(it); timers.push({ at: time + 0.25, fn: () => ripple(u.x, u.z, 1.3) }); }
  }
  function select(id: string | null) {
    state.sel = id && byId[id] ? id : null; computeFocus(); applyVisual();
    if (state.sel) { spawnPulses(byId[state.sel]); flyToNode(byId[state.sel]); controls.autoRotate = false; curView = null; }
    else controls.autoRotate = opts.autoRotate;
    cb.onSelect?.(state.sel);
  }

  // ── Resize / visibility ────────────────────────────────────────────
  function resize() {
    const w = Math.max(stage.clientWidth, 1), h = Math.max(stage.clientHeight, 1);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.setViewOffset(w, h, insets.right / 2, insets.bottom / 2, w, h);
    camera.updateProjectionMatrix();
    const bh = renderer.getDrawingBufferSize(new THREE.Vector2()).y;
    const px = bh / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    planeUniforms.uPx.value = px; glowUniforms.uPx.value = px;
  }
  const ro = new ResizeObserver(() => { resize(); if (curView) setView(curView, 0.001); });
  ro.observe(stage);
  let visible = true, raf = 0, disposed = false;
  const io = new IntersectionObserver(([e]) => {
    const was = visible; visible = e.isIntersecting;
    if (visible && !was && !disposed) { lastT = performance.now(); raf = requestAnimationFrame(frame); }
  });
  io.observe(stage);

  // ── Loop ───────────────────────────────────────────────────────────
  let lastT = performance.now(), nextBeat = 3;
  const introAt = reduced ? -10 : 0;
  const lp = new V3(), cTmp = new THREE.Color();
  const TI: Record<PlaneTier, number> = { phys: 0, vm: 1, k3s: 2, plane: 3 };
  items.forEach(it => { it.delay = 0.15 + TI[it.tier] * 0.32 + (it.n.pos[0] + 20) / 45 * 0.55; });

  function frame() {
    if (disposed || !visible) return;
    const now = performance.now(), dt = Math.min((now - lastT) / 1000, 0.05); lastT = now; time += dt;
    const it = time - introAt;
    if (tween) {
      const k = easeIO(clamp((time - tween.s) / tween.d));
      camera.position.lerpVectors(tween.p0, tween.p1, k); controls.target.lerpVectors(tween.t0, tween.t1, k);
      if (k >= 1) tween = null;
    }
    controls.update();
    for (let i = timers.length - 1; i >= 0; i--) if (time >= timers[i].at) { timers[i].fn(); timers.splice(i, 1); }
    if (time > nextBeat && it > 3 && !reduced) {
      const u = uplinks[Math.floor(Math.random() * uplinks.length)];
      if (u.hit && opts.layers.tailnet) ripple(u.hit.x, u.hit.z, 0.45);
      nextBeat = time + 1.6 + Math.random() * 1.8;
    }

    items.forEach(n => {
      const o = n.o, p = clamp((it - n.delay) / 0.8); o.p = p;
      o.hk = lerp(o.hk, state.hover === n.id || state.sel === n.id ? 1.06 : 1, 0.18);
      o.inner.scale.setScalar(Math.max(0.001, easeBack(p)) * o.hk);
      o.inner.position.y = (1 - easeOut(p)) * 1.4;
      o.inner.visible = p > 0;
    });
    links.forEach(L => {
      if (!L.mesh) return;
      const p = clamp((it - 1.5 - L.delay) / 0.9);
      L.mesh.geometry.setDrawRange(0, L.K.dashed ? Math.floor(p * L.segs) : Math.floor(p * L.segs) * 36);
    });
    const upP = clamp((it - 1.3) / 0.8);
    uplinks.forEach(u => { if (u.mesh) u.mesh.visible = opts.layers.tailnet && upP > 0; });
    planeUniforms.uOpacity.value = easeOut(clamp((it - 1.0) / 1.4));
    planeFrameMat.opacity = 0.5 * planeUniforms.uOpacity.value;
    planeUniforms.uTime.value = time;

    let c = 0;
    const push = (v: Vec3, col: THREE.Color, size: number, a: number) => {
      if (c >= MAXP) return;
      gPos[c * 3] = v.x; gPos[c * 3 + 1] = v.y; gPos[c * 3 + 2] = v.z;
      gCol[c * 3] = col.r; gCol[c * 3 + 1] = col.g; gCol[c * 3 + 2] = col.b;
      gSize[c] = size; gAlpha[c] = a; c++;
    };
    leds.forEach(l => {
      const o = l.it.o; if (!o.inner.visible) return;
      lp.copy(l.local); o.inner.localToWorld(lp);
      let a = 0.95;
      if (l.rate > 0 && !reduced) a = Math.sin(time * l.rate + l.phase) > 0.8 ? 0.2 : 0.95;
      else if (l.rate < 0) a = reduced ? 0.95 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 3));
      push(lp, l.color, l.size, a * (o.dim ? 0.2 : 1) * clamp(o.p * 2 - 1));
    });
    if (opts.layers.tailnet && upP > 0) uplinks.forEach(u => {
      if (u.hit) push(u.hit, cTs, 0.32, (0.35 + 0.15 * Math.sin(time * 2 + u.hit.x)) * upP * (state.sel && !state.focus.has(u.it.id) ? 0.25 : 1));
    });
    const pk = clamp((it - 2.6) / 1);
    if (pk > 0) packets.forEach(q => {
      const L = q.L; if (!linkVisible(L)) return;
      let t = (q.phase + time * q.sp * (L.K.speed ?? 3) / L.len) % 1; if (q.dir < 0) t = 1 - t;
      sampleAt(L, t, lp);
      const fade = Math.min(1, t * 8, (1 - t) * 8);
      const dimK = state.sel ? (L.focus ? 1.2 : 0.12) : 1;
      push(lp, cTmp.set(L.K.color), 0.17, 0.9 * fade * pk * dimK);
    });
    for (let i = pulses.length - 1; i >= 0; i--) {
      const P = pulses[i], t = (time - P.s) / P.d;
      if (t > 1) { pulses.splice(i, 1); continue; }
      if (t < 0) continue;
      for (let k = 0; k < 4; k++) {
        const tt = t - k * 0.025; if (tt < 0) break;
        sampleAt(P.L, P.dir > 0 ? tt : 1 - tt, lp);
        push(lp, cPing, 0.5 - k * 0.1, (1 - k * 0.22) * Math.min(1, (1 - t) * 5));
      }
    }
    glowGeo.setDrawRange(0, c);
    (['position', 'aColor', 'aSize', 'aAlpha'] as const).forEach(a => { glowGeo.attributes[a].needsUpdate = true; });

    renderer.render(scene, camera);
    updateLabels(stage.clientWidth, stage.clientHeight, it);
    raf = requestAnimationFrame(frame);
  }

  // Scroll-to-zoom and one-finger orbit would hijack page scrolling, so they
  // stay off until the user opts in by clicking the scene.
  function setInteractive(onOff: boolean) {
    controls.enableZoom = onOff;
    controls.enableRotate = onOff || !matchMedia('(pointer: coarse)').matches;
    controls.enablePan = onOff;
    canvas.style.touchAction = onOff ? 'none' : 'pan-y';
  }

  // ── Boot ───────────────────────────────────────────────────────────
  resize(); layout(); seedPackets(); setInteractive(false);
  setView('overview');
  if (tween) { const tw: Tween = tween; camera.position.copy(tw.p1); controls.target.copy(tw.t1); tween = null; }
  controls.autoRotate = opts.autoRotate;
  raf = requestAnimationFrame(frame);

  return {
    links,
    select,
    hover: id => setHover(id),
    setView: name => setView(name),
    setInsets(o) { Object.assign(insets, o); resize(); if (curView) setView(curView, 0.6); },
    setInteractive,
    set(o) {
      const prev = { ...opts };
      if (o.layers) o = { ...o, layers: { ...opts.layers, ...o.layers } };
      Object.assign(opts, o);
      if (o.spacing !== undefined && o.spacing !== prev.spacing) layout();
      if (o.traffic !== undefined && o.traffic !== prev.traffic) seedPackets();
      if (o.autoRotate !== undefined) controls.autoRotate = opts.autoRotate && !state.sel;
      if (o.wave !== undefined) planeUniforms.uWave.value = opts.wave;
      if (o.layers) applyLayers();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      controls.removeEventListener('start', onStart);
      controls.dispose();
      cleanups.forEach(f => f());
      links.forEach(L => L.mesh?.geometry.dispose());
      uplinks.forEach(u => u.mesh?.geometry.dispose());
      disposables.forEach(d => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      labelsEl.replaceChildren();
    },
  };
}
