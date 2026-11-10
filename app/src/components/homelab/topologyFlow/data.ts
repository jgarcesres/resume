// data.ts — model for the live map (TopologyFlow): the two sites placed on real
// geography, the machines at each, and a handful of traffic stories that play
// hop by hop. Hand-maintained from the homelab repo's docs/infrastructure
// (network.md, k3s-cluster.md, backups.md, power.md) as of 2026-11.
//
// This page is public: no addresses (tailnet, LAN or public), no tailnet name,
// no domains and no personal handles. Hostnames and hardware only.

export type SiteId = 'fl' | 'mde' | 'net';
export type LayoutId = 'wide' | 'tall';
export type Kind = 'gateway' | 'host' | 'cp' | 'worker' | 'nas' | 'pi' | 'ups' | 'net';
export type FlowKind = 'public' | 'cluster' | 'tailnet' | 'storage' | 'backup' | 'power';
export type Side = 't' | 'b' | 'l' | 'r';

export interface Layout {
  w: number;
  h: number;
  /** Equirectangular window: longitude of x = 0, latitude of y = 0, px per degree. */
  lon0: number;
  latTop: number;
  ppd: number;
}

// `wide` puts Florida's machines out in the Atlantic and Medellín's in the
// Pacific; `tall` (phones) stacks them above and below the Caribbean.
export const LAYOUTS: Record<LayoutId, Layout> = {
  wide: { w: 960, h: 600, lon0: -116, latTop: 33.5, ppd: 14 },
  tall: { w: 360, h: 690, lon0: -95, latTop: 48, ppd: 11 },
};

export function project(layout: Layout, lon: number, lat: number): [number, number] {
  return [(lon - layout.lon0) * layout.ppd, (layout.latTop - lat) * layout.ppd];
}

type XY = [number, number];
interface Placement { at: XY; label?: Side }

export interface FlowNode {
  id: string;
  label: string;
  /** Label used where there is no room for the hostname. */
  short: string;
  sub: string;
  kind: Kind;
  site: SiteId;
  /** Gateways sit at their site's real location; state-level precision only. */
  geo?: [lon: number, lat: number];
  /** Everything else is placed by hand, per layout, in design pixels. */
  wide?: Placement;
  tall?: Placement;
  /** The Proxmox host this VM runs on. */
  host?: string;
  facts: [string, string][];
}

export interface HostHull {
  id: string;
  /** x, y, w, h in design pixels. */
  wide: [number, number, number, number];
  tall: [number, number, number, number];
}

export const KIND_LABEL: Record<Kind, string> = {
  gateway: 'Site gateway',
  host: 'Proxmox host',
  cp: 'Control plane',
  worker: 'Worker',
  nas: 'Storage',
  pi: 'Raspberry Pi',
  ups: 'UPS',
  net: 'Internet',
};

export const SITE_LABEL: Record<SiteId, string> = {
  fl: 'Florida, US',
  mde: 'Medellín, CO',
  net: 'Outside the lab',
};

export const NODES: FlowNode[] = [
  // ── Outside ──
  { id: 'viewer', label: "a friend's TV", short: 'viewer', sub: 'Someone on the public internet', kind: 'net', site: 'net',
    wide: { at: [296, 92] }, tall: { at: [312, 262] },
    facts: [['Sees', 'two public sites and nothing else']] },
  { id: 'cf', label: 'Cloudflare', short: 'Cloudflare', sub: 'DNS, proxy and tunnels at the edge', kind: 'net', site: 'net',
    wide: { at: [352, 176] }, tall: { at: [56, 300] },
    facts: [['Tunnels', 'dialled outbound from the cluster'], ['Also runs', 'the OIDC identity provider, off the lab']] },
  { id: 'github', label: 'GitHub', short: 'GitHub', sub: 'Source of truth, CI and image registry', kind: 'net', site: 'net',
    wide: { at: [150, 236] }, tall: { at: [42, 392] },
    facts: [['Holds', 'every manifest, playbook and policy'], ['Runs on', 'self-hosted runners in the lab']] },
  { id: 'phone', label: 'a tailnet phone', short: 'phone', sub: 'Any device signed in to the tailnet', kind: 'net', site: 'net',
    wide: { at: [716, 300] }, tall: { at: [318, 356] },
    facts: [['Reaches', 'admin UIs by name, over WireGuard']] },

  // ── Florida ──
  { id: 'fl-gw', label: 'BGW-320', short: 'gateway', sub: 'AT&T fiber · static IP', kind: 'gateway', site: 'fl',
    geo: [-81.6, 28],
    facts: [['Forwards', ':80 and :443 to Traefik, nothing else'], ['Everything else', 'rides the tailnet']] },
  { id: 'fl-pve1', label: 'fl-pve1', short: 'fl-pve1', sub: 'Lenovo P520 · Proxmox VE', kind: 'host', site: 'fl',
    wide: { at: [614, 30] }, tall: { at: [160, 44] },
    facts: [['CPU', 'Xeon W-2245 · 8C/16T'], ['RAM', '128 GB ECC'], ['Disks', '6×22 TB RAIDZ1 + NVMe pool'], ['GPU', 'Quadro RTX 4000, passed through']] },
  { id: 'k3s-pve', label: 'k3s-pve', short: 'k3s-pve', sub: 'k3s worker · GPU · public ingress', kind: 'worker', site: 'fl', host: 'fl-pve1',
    wide: { at: [660, 84] }, tall: { at: [196, 94] },
    facts: [['GPU', 'RTX 4000, time-sliced across pods'], ['Runs', 'Traefik, Plex and the media stack'], ['Taint', 'location, so only Florida workloads land here']] },
  { id: 'truenas', label: 'truenas', short: 'truenas', sub: 'TrueNAS VM · ZFS', kind: 'nas', site: 'fl', host: 'fl-pve1',
    wide: { at: [770, 84] }, tall: { at: [284, 94] },
    facts: [['Pool', '~100 TB usable'], ['Exports', 'NFS and iSCSI'], ['Path', 'host-internal bridge, 9000 MTU, never the LAN']] },
  { id: 'xfiles', label: 'xfiles', short: 'xfiles', sub: 'Synology DS1515+', kind: 'nas', site: 'fl',
    wide: { at: [776, 200] }, tall: { at: [66, 122] },
    facts: [['Drives', '5×10 TB'], ['Serves', 'NFS media shares']] },
  { id: 'fl-ups', label: 'FL UPS', short: 'UPS', sub: 'APC Back-UPS 1500', kind: 'ups', site: 'fl',
    wide: { at: [884, 150] }, tall: { at: [306, 176] },
    facts: [['Watched by', 'fl-pve1 over USB (NUT)'], ['Policy', 'halt cleanly after two minutes on battery']] },

  // ── Medellín ──
  { id: 'mde-gw', label: 'UCG-Fiber', short: 'gateway', sub: 'UniFi gateway · GPON fiber', kind: 'gateway', site: 'mde',
    geo: [-75.57, 6.25],
    facts: [['WAN', 'GPON module seated in the gateway, ISP router bypassed'], ['Inbound', 'ISP blocks :80 and :443, so public HTTP rides tunnels']] },
  { id: 'cp1', label: 'k3s-cp1', short: 'cp1', sub: 'control plane · etcd', kind: 'cp', site: 'mde',
    wide: { at: [478, 432] }, tall: { at: [110, 506] },
    facts: [['Hardware', 'Intel NUC8 i7 · fanless · 32 GB'], ['Role', 'cluster-init member']] },
  { id: 'cp2', label: 'k3s-cp2', short: 'cp2', sub: 'control plane · etcd', kind: 'cp', site: 'mde',
    wide: { at: [408, 474] }, tall: { at: [44, 546] },
    facts: [['Hardware', 'Intel NUC10 i7 · 32 GB'], ['Also hosts', 'Tailscale ingress proxies']] },
  { id: 'cp3', label: 'k3s-cp3', short: 'cp3', sub: 'control plane · etcd', kind: 'cp', site: 'mde',
    wide: { at: [486, 524] }, tall: { at: [112, 584] },
    facts: [['Hardware', 'Ryzen 5 5625U mini PC · 32 GB'], ['Detail', 'an NVMe heatsink keeps etcd fsync inside its budget']] },
  { id: 'mde-pve1', label: 'mde-pve1', short: 'mde-pve1', sub: 'ASRock Rack X570 · Proxmox VE', kind: 'host', site: 'mde',
    wide: { at: [100, 400] }, tall: { at: [186, 502] },
    facts: [['CPU', 'Ryzen 9 5950X · 16C/32T'], ['RAM', '64 GB'], ['Extras', '10 GbE and a BMC'], ['GPU', 'Quadro P4000, passed through']] },
  { id: 'mde-truenas', label: 'mde-truenas', short: 'truenas', sub: 'TrueNAS VM · ZFS', kind: 'nas', site: 'mde', host: 'mde-pve1',
    wide: { at: [146, 452] }, tall: { at: [302, 550] },
    facts: [['Pool', '4×6 TB RAIDZ1'], ['Exports', 'NFS and iSCSI to the Medellín nodes']] },
  { id: 'w3', label: 'mde-k3s-w3', short: 'w3', sub: 'k3s worker · CI only', kind: 'worker', site: 'mde', host: 'mde-pve1',
    wide: { at: [302, 452] }, tall: { at: [192, 550] },
    facts: [['Runs', 'amd64 GitHub Actions runners'], ['Taint', 'workload=ci, so nothing else schedules here']] },
  { id: 'w1', label: 'mde-k3s-w1', short: 'w1', sub: 'k3s worker · GPU', kind: 'worker', site: 'mde', host: 'mde-pve1',
    wide: { at: [224, 452] }, tall: { at: [247, 550] },
    facts: [['GPU', 'Quadro P4000'], ['Runs', 'the Spanish-language media stack, requests and tunnels']] },
  { id: 'w2', label: 'mde-k3s-w2', short: 'w2', sub: 'Raspberry Pi 5 · arm64 worker', kind: 'worker', site: 'mde',
    wide: { at: [232, 548] }, tall: { at: [176, 640] },
    facts: [['Runs', 'native arm64 CI runners'], ['History', 'was a control-plane node until a mini PC took over']] },
  { id: 's3', label: 'mde-pi-s3', short: 's3', sub: 'Raspberry Pi 4 · Garage S3', kind: 'pi', site: 'mde',
    wide: { at: [146, 548] }, tall: { at: [110, 640] },
    facts: [['Stores', 'volume snapshots, Postgres WAL, etcd snapshots, logs and metrics blocks'], ['TLS', 'Caddy with a tailnet certificate']] },
  { id: 'forge', label: 'mde-pi-forge', short: 'forge', sub: 'Raspberry Pi 4 · backup of the backup', kind: 'pi', site: 'mde',
    wide: { at: [60, 548] }, tall: { at: [44, 640] },
    facts: [['Pulls', 'a full copy of Garage every day'], ['Mirrors', 'the Git repos with Forgejo']] },
  { id: 'pinut', label: 'pinut', short: 'pinut', sub: 'Pi Zero 2 W · NUT server', kind: 'pi', site: 'mde',
    wide: { at: [404, 554] }, tall: { at: [244, 640] },
    facts: [['Job', 'watch the rack UPS over USB, and nothing else'], ['Network', 'wired only']] },
  { id: 'mde-ups', label: 'Rack UPS', short: 'UPS', sub: 'Line-interactive UPS', kind: 'ups', site: 'mde',
    wide: { at: [322, 554] }, tall: { at: [310, 640] },
    facts: [['Protects', 'network gear and the control plane'], ['Policy', 'clean power-off on low battery']] },
];

export const HULLS: HostHull[] = [
  { id: 'fl-pve1', wide: [606, 38, 222, 92], tall: [146, 52, 184, 82] },
  { id: 'mde-pve1', wide: [92, 408, 264, 90], tall: [164, 510, 166, 80] },
];

/** Where the site name sits, per layout. */
export const SITE_TITLES: Record<'fl' | 'mde', Record<LayoutId, { at: XY; align: 'left' | 'right' }>> = {
  fl: { wide: { at: [456, 58], align: 'right' }, tall: { at: [164, 214], align: 'left' } },
  mde: { wide: { at: [584, 374], align: 'left' }, tall: { at: [196, 450], align: 'right' } },
};

/** Always-on links drawn faintly at rest. Scenario hops don't need to be listed here. */
export const STATIC_LINKS: { from: string; to: string; kind: FlowKind }[] = [
  { from: 'cp1', to: 'cp2', kind: 'cluster' },
  { from: 'cp2', to: 'cp3', kind: 'cluster' },
  { from: 'cp3', to: 'cp1', kind: 'cluster' },
  { from: 'truenas', to: 'k3s-pve', kind: 'storage' },
  { from: 'xfiles', to: 'k3s-pve', kind: 'storage' },
  { from: 'mde-truenas', to: 'w1', kind: 'storage' },
  { from: 's3', to: 'forge', kind: 'backup' },
  { from: 'mde-ups', to: 'pinut', kind: 'power' },
  { from: 'fl-ups', to: 'fl-pve1', kind: 'power' },
];

/** etcd raft chatter, shown as slow blips whenever the control plane is up. */
export const HEARTBEATS: [string, string][] = [['cp1', 'cp2'], ['cp2', 'cp3'], ['cp3', 'cp1']];

export interface Flow {
  /** Node ids, in travel order. See `hopAllowed` for what may follow what. */
  path: string[];
  kind: FlowKind;
  /** Seconds after the step starts before the first packet leaves. */
  delay?: number;
}

export interface Step {
  title: string;
  text: string;
  flows: Flow[];
  /** Nodes that power off in this step and stay off for the rest of the story. */
  down?: string[];
}

export interface Scenario {
  id: string;
  title: string;
  tag: string;
  steps: Step[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'stream', title: 'Movie night', tag: 'public traffic',
    steps: [
      { title: 'Press play',
        text: "A friend opens Plex on their TV. Public DNS leads to Florida, the only site with a static address.",
        flows: [{ path: ['viewer', 'fl-gw'], kind: 'public' }] },
      { title: 'One open door',
        text: 'The router forwards ports 80 and 443 to a single node and nothing else. Traefik terminates TLS there and routes by hostname through the Gateway API.',
        flows: [{ path: ['fl-gw', 'k3s-pve'], kind: 'public' }] },
      { title: 'Read the file',
        text: 'Plex reads the movie from ZFS over NFS. TrueNAS and the worker are VMs on the same host, joined by a private jumbo-frame bridge, so storage traffic never touches the LAN.',
        flows: [{ path: ['truenas', 'k3s-pve'], kind: 'storage' }] },
      { title: 'Stream it back',
        text: "If the TV can't play the file as it is, the RTX 4000 transcodes it on the fly. The stream leaves the way the request came in.",
        flows: [{ path: ['truenas', 'k3s-pve'], kind: 'storage' }, { path: ['k3s-pve', 'fl-gw', 'viewer'], kind: 'public', delay: 0.5 }] },
    ],
  },
  {
    id: 'request', title: 'Request a show', tag: 'cross-site',
    steps: [
      { title: 'In through a tunnel',
        text: "The request site lives in Medellín, where the ISP blocks inbound 80 and 443. So the cluster dials out to Cloudflare, and visitors come in through that tunnel.",
        flows: [{ path: ['viewer', 'cf', 'mde-gw', 'w1'], kind: 'public' }] },
      { title: 'Across the Caribbean',
        text: 'The request app hands the title to Radarr in Florida. It is an ordinary pod-to-pod call: Cilium routes it natively and WireGuard carries it between the sites in about 62 ms.',
        flows: [{ path: ['w1', 'mde-gw', 'fl-gw', 'k3s-pve'], kind: 'cluster' }] },
      { title: 'Fetch and file',
        text: 'Radarr picks a release, the download client fetches it, and the file is hard-linked into the library on ZFS. One copy on disk, still seeding.',
        flows: [{ path: ['k3s-pve', 'truenas'], kind: 'storage' }] },
      { title: 'Available',
        text: 'Plex notices the new file, and the request flips to available back in Medellín.',
        flows: [{ path: ['k3s-pve', 'fl-gw', 'mde-gw', 'w1'], kind: 'cluster' }] },
    ],
  },
  {
    id: 'deploy', title: 'git push', tag: 'GitOps',
    steps: [
      { title: 'Merge',
        text: 'Everything is in Git. A merge wakes a self-hosted Actions runner on a VM that exists only for CI, so a build never fights the media stack for memory.',
        flows: [{ path: ['github', 'mde-gw', 'w3'], kind: 'cluster' }] },
      { title: 'Build both architectures',
        text: 'Images build natively: amd64 on the VM, arm64 on a Raspberry Pi 5, with no emulation. Each half is pushed by digest and stitched into one manifest.',
        flows: [{ path: ['w3', 'mde-gw', 'github'], kind: 'cluster' }, { path: ['w2', 'mde-gw', 'github'], kind: 'cluster', delay: 0.4 }] },
      { title: 'Argo CD syncs',
        text: 'Argo CD watches the repo from inside the cluster and applies whatever changed. Nobody runs kubectl apply, and undoing a bad change is a revert.',
        flows: [{ path: ['github', 'mde-gw', 'cp1'], kind: 'cluster' }] },
      { title: 'Roll out, by site',
        text: "The API server places pods next to their data. Florida's kubelet takes its orders over WireGuard like any other node, and taints keep each workload at the right site.",
        flows: [{ path: ['cp1', 'w1'], kind: 'cluster' }, { path: ['cp1', 'mde-gw', 'fl-gw', 'k3s-pve'], kind: 'cluster' }] },
    ],
  },
  {
    id: 'backup', title: 'Backups', tag: 'four layers',
    steps: [
      { title: 'Snapshot the volumes',
        text: 'Every day VolSync snapshots each app volume with Restic and ships it, encrypted and deduplicated, to Garage: an S3 store on a Raspberry Pi.',
        flows: [{ path: ['w1', 's3'], kind: 'backup' }, { path: ['k3s-pve', 'fl-gw', 'mde-gw', 's3'], kind: 'backup' }] },
      { title: 'Databases and etcd',
        text: 'Postgres archives its write-ahead log continuously for point-in-time recovery, and etcd snapshots itself every six hours. Same Pi, separate buckets.',
        flows: [{ path: ['cp1', 's3'], kind: 'backup' }, { path: ['cp2', 's3'], kind: 'backup', delay: 0.25 }, { path: ['cp3', 's3'], kind: 'backup', delay: 0.5 }] },
      { title: 'Back up the backup',
        text: "One Pi would be a single point of failure for all of it, so a second Pi pulls a full copy every day. It also mirrors the Git repos, in case GitHub is the thing that's down.",
        flows: [{ path: ['s3', 'forge'], kind: 'backup' }] },
      { title: 'Prove it',
        text: 'A backup nobody has restored is a hope. An hourly canary restores a real volume end to end and raises an alert if it fails.',
        flows: [{ path: ['s3', 'w1'], kind: 'backup' }] },
    ],
  },
  {
    id: 'power', title: 'Power cut', tag: 'failure drill',
    steps: [
      { title: 'Lights out',
        text: 'Medellín loses mains. The rack UPS takes over, and a Pi Zero whose only job is to watch that UPS over USB notices.',
        flows: [{ path: ['mde-ups', 'pinut'], kind: 'power' }] },
      { title: 'Hold',
        text: 'It tells the three control-plane nodes they are on battery. Most outages end here: power comes back and nothing was interrupted.',
        flows: [{ path: ['pinut', 'cp1'], kind: 'power' }, { path: ['pinut', 'cp2'], kind: 'power' }, { path: ['pinut', 'cp3'], kind: 'power' }] },
      { title: 'Shut down clean',
        text: 'If the battery runs low instead, the nodes power themselves off. etcd stops cleanly rather than losing power mid-write, which is the failure that actually hurts.',
        flows: [{ path: ['pinut', 'cp1'], kind: 'power' }, { path: ['pinut', 'cp2'], kind: 'power' }, { path: ['pinut', 'cp3'], kind: 'power' }],
        down: ['cp1', 'cp2', 'cp3'] },
      { title: 'Meanwhile, in Florida',
        text: "Florida has its own UPS and never noticed. Its worker keeps running the pods it already has; it just can't be scheduled anything new until the control plane is back.",
        flows: [{ path: ['viewer', 'fl-gw', 'k3s-pve'], kind: 'public' }] },
    ],
  },
  {
    id: 'private', title: 'The private door', tag: 'zero open ports',
    steps: [
      { title: 'No public address',
        text: 'Grafana, Argo CD and every other admin UI have no public address at all. A phone on the tailnet reaches them by name, over WireGuard, through ingress proxies on the control plane.',
        flows: [{ path: ['phone', 'mde-gw', 'cp2'], kind: 'tailnet' }] },
      { title: 'Nearest site answers',
        text: 'The media apps sit behind one anycast address with an ingress proxy at each site, so whichever is closer to the phone answers.',
        flows: [{ path: ['phone', 'mde-gw', 'cp2'], kind: 'tailnet' }, { path: ['phone', 'fl-gw', 'k3s-pve'], kind: 'tailnet' }] },
      { title: 'Sign in from outside',
        text: "Sign-in is OIDC against a small identity provider that runs at Cloudflare's edge rather than in the lab, so losing the lab never locks out the person who has to fix it.",
        flows: [{ path: ['cp2', 'mde-gw', 'cf'], kind: 'public' }, { path: ['cp2', 'w1'], kind: 'cluster', delay: 0.6 }] },
    ],
  },
];

const byId = new Map(NODES.map(n => [n.id, n]));

export function nodeById(id: string): FlowNode {
  const n = byId.get(id);
  if (!n) throw new Error(`topologyFlow: unknown node "${id}"`);
  return n;
}

/**
 * A packet can hop between two machines on the same LAN, between the two site
 * gateways (the WireGuard tunnel), between a gateway and the outside, or
 * between two outside parties. Anything else has to go through a gateway.
 */
export function hopAllowed(a: FlowNode, b: FlowNode): boolean {
  if (a.id === b.id) return false;
  if (a.site === b.site) return true;
  if (a.kind === 'gateway' && b.kind === 'gateway') return true;
  if (a.site === 'net') return b.kind === 'gateway';
  if (b.site === 'net') return a.kind === 'gateway';
  return false;
}

/** Nodes that are off at `stepIdx` of a scenario (cumulative). */
export function downAt(scenario: Scenario, stepIdx: number): Set<string> {
  const down = new Set<string>();
  for (let i = 0; i <= stepIdx && i < scenario.steps.length; i++) {
    for (const id of scenario.steps[i].down ?? []) down.add(id);
  }
  return down;
}
