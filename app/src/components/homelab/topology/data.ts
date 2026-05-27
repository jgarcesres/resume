// data.ts — homelab node + link model. Single source of truth for the diagram.
//
// Ported from the claude.ai/design handoff, then reconciled with the current
// cluster (homelab repo docs/infrastructure). Node names reflect the post
// 2026-05-10 control-plane migration:
//   pve        → fl-pve1     (FL Proxmox host)
//   pve-home1  → mde-pve1    (MDE Proxmox host)
//   k3s-home2  → mde-k3s-w1  (MDE on-demand worker; ex k3s-home1 is now cp1)
//
// Tailscale IPs are masked (100.x.x.NN) on purpose — this is a public page.
//
// Canvas: 1440 × 800
//   y-band 18-88     → Tailscale plane (overlay)
//   y-band 100-178   → Site header band
//   y-band 200-430   → Tier: PHYSICAL (MDE cp triplet + mde-pve1 + Pi sub-row)
//   y-band 445-525   → Tier: VMs
//   y-band 565-765   → Tier: K3s

export type NodeKind =
  | 'hypervisor'
  | 'baremetal'
  | 'baremetal-arm'
  | 'storage'
  | 'storage-vm'
  | 'storage-pi'
  | 'router'
  | 'k3s-vm'
  | 'k3s-worker'
  | 'k3s-cp';

export type TierId = 'physical' | 'vm' | 'k3s';
export type SiteId = 'fl' | 'mde';

export interface TailnetInfo {
  ip: string;
  hostname: string;
  tag: string;
}

export interface TopoNode {
  id: string;
  label: string;
  sub: string;
  kind: NodeKind;
  site: SiteId;
  tier: TierId;
  x: number;
  y: number;
  w: number;
  h: number;
  parent?: string;
  hidden?: boolean;
  tailnet?: TailnetInfo;
  meta?: Record<string, string>;
}

export type LinkKind =
  | 'lan'
  | 'storage'
  | 'vm-host'
  | 'k3s-vm'
  | 'etcd'
  | 'k3s-cp-worker';

export interface TopoLink {
  from: string;
  to: string;
  kind: LinkKind;
  label?: string;
}

export interface ProxyGroup {
  id: string;
  kind: 'ingress' | 'egress';
  tag: string;
  node: string;
  label: string;
  site: SiteId;
  target?: string;
  services: string;
}

export interface SiteDef {
  id: SiteId;
  label: string;
  flag: string;
  subnet: string;
  publicIp: string;
  x: number;
  w: number;
}

export interface TierDef {
  y: number;
  h: number;
  labelY: number;
  label: string;
}

export const SITES: Record<SiteId, SiteDef> = {
  fl: {
    id: 'fl',
    label: 'Homestead, FL',
    flag: '🇺🇸',
    subnet: '192.168.1.0/24',
    publicIp: 'static IP',
    x: 40,
    w: 660,
  },
  mde: {
    id: 'mde',
    label: 'Medellín, CO',
    flag: '🇨🇴',
    subnet: '192.168.15.0/24',
    publicIp: 'dynamic',
    x: 740,
    w: 660,
  },
};

export const TIERS: Record<TierId, TierDef> = {
  physical: { y: 200, h: 230, labelY: 188, label: 'Physical · Hosts' },
  vm: { y: 445, h: 80, labelY: 433, label: 'Virtual machines' },
  k3s: { y: 565, h: 210, labelY: 553, label: 'Kubernetes · k3s v1.34' },
};

export const NODES: TopoNode[] = [
  // ── FL · Physical ────────────────────────────────────────────────────
  {
    id: 'fl-pve1',
    label: 'fl-pve1',
    sub: 'Lenovo P520 · Florida primary',
    kind: 'hypervisor',
    site: 'fl',
    tier: 'physical',
    x: 80, y: 200, w: 260, h: 220,
    tailnet: { ip: '100.x.x.90', hostname: 'fl-pve1', tag: 'tag:proxmox' },
    meta: {
      CPU: 'Xeon W-2245 · 8C/16T',
      RAM: '128GB DDR4 ECC',
      GPU: 'NVIDIA Quadro RTX 4000',
      Storage: '6×22TB RAIDZ1 + 4×2TB NVMe',
      LAN: '192.168.1.100',
      OS: 'Proxmox VE 8.x',
    },
  },
  {
    id: 'synology',
    label: 'xfiles',
    sub: 'Synology DS1515+',
    kind: 'storage',
    site: 'fl',
    tier: 'physical',
    x: 380, y: 200, w: 200, h: 100,
    meta: {
      Drives: '5×10TB · ~40TB',
      LAN: '192.168.1.200',
      Shares: 'NFS · media',
    },
  },
  {
    id: 'router-fl',
    label: 'BGW-320',
    sub: 'AT&T fiber · 1Gb',
    kind: 'router',
    site: 'fl',
    tier: 'physical',
    x: 380, y: 320, w: 200, h: 100,
    meta: {
      Public: 'static IP',
      LAN: '192.168.1.254',
      Forwards: ':80/:443 → k3s-pve',
    },
  },

  // ── FL · VMs (children of fl-pve1) ───────────────────────────────────
  {
    id: 'truenas',
    label: 'TrueNAS',
    sub: 'VMID 104 · runs on fl-pve1',
    kind: 'storage-vm',
    site: 'fl',
    tier: 'vm',
    x: 80, y: 445, w: 195, h: 80,
    parent: 'fl-pve1',
    tailnet: { ip: '100.x.x.21', hostname: 'truenas', tag: 'tag:storage' },
    meta: {
      RAM: '48GB · 4 cores',
      HBA: 'SATA controller passthrough',
      Exports: 'NFS · iSCSI (vmbr1, MTU 9000)',
    },
  },
  {
    id: 'k3s-pve-vm',
    label: 'k3s-pve',
    sub: 'VMID 107 · runs on fl-pve1',
    kind: 'k3s-vm',
    site: 'fl',
    tier: 'vm',
    x: 295, y: 445, w: 195, h: 80,
    parent: 'fl-pve1',
    meta: {
      vCPU: '10 cores',
      RAM: '32GB',
      GPU: 'RTX 4000 (passthrough)',
    },
  },

  // ── FL · K3s ─────────────────────────────────────────────────────────
  {
    id: 'k3s-pve',
    label: 'k3s-pve',
    sub: 'worker · GPU · public-ingress',
    kind: 'k3s-worker',
    site: 'fl',
    tier: 'k3s',
    x: 80, y: 565, w: 410, h: 200,
    parent: 'k3s-pve-vm',
    tailnet: { ip: '100.x.x.80', hostname: 'k3s-pve', tag: 'tag:k8s' },
    meta: {
      Role: 'worker',
      Taint: 'location=fl-us:NoSchedule',
      'Pod CIDR': '10.42.2.0/24',
      GPU: 'RTX 4000 (time-sliced ×10)',
      Hosts: 'Traefik · public ingress',
    },
  },

  // ── MDE · Physical · top sub-row: cp triplet (bare metal) ────────────
  {
    id: 'k3s-cp1-bm',
    label: 'k3s-cp1',
    sub: 'NUC8i7 · bare metal',
    kind: 'baremetal',
    site: 'mde',
    tier: 'physical',
    x: 755, y: 200, w: 152, h: 130,
    tailnet: { ip: '100.x.x.118', hostname: 'k3s-cp1', tag: 'tag:k8s' },
    meta: {
      CPU: 'i7-8809G · 4C/8T',
      RAM: '32GB',
      Storage: '238GB NVMe',
    },
  },
  {
    id: 'k3s-cp2-bm',
    label: 'k3s-cp2',
    sub: 'NUC10 · bare metal',
    kind: 'baremetal',
    site: 'mde',
    tier: 'physical',
    x: 920, y: 200, w: 152, h: 130,
    tailnet: { ip: '100.x.x.15', hostname: 'k3s-cp2', tag: 'tag:k8s' },
    meta: {
      CPU: 'i7-10710U · 6C/12T',
      RAM: '32GB',
      Storage: '238GB NVMe',
    },
  },
  {
    id: 'k3s-cp3-bm',
    label: 'k3s-cp3',
    sub: 'Raspberry Pi 5 · arm64',
    kind: 'baremetal-arm',
    site: 'mde',
    tier: 'physical',
    x: 1085, y: 200, w: 152, h: 130,
    tailnet: { ip: '100.x.x.71', hostname: 'k3s-cp3', tag: 'tag:k8s' },
    meta: {
      CPU: 'Cortex-A76 · 4C',
      RAM: '8GB',
      Storage: '238GB NVMe HAT',
    },
  },
  {
    id: 'mde-pve1',
    label: 'mde-pve1',
    sub: 'Ryzen 5950X · bare metal',
    kind: 'hypervisor',
    site: 'mde',
    tier: 'physical',
    x: 1250, y: 200, w: 150, h: 130,
    tailnet: { ip: '100.x.x.31', hostname: 'mde-pve1', tag: 'tag:proxmox' },
    meta: {
      CPU: 'Ryzen 9 5950X',
      RAM: '32GB',
      Storage: '1TB NVMe',
    },
  },

  // ── MDE · Physical · bottom sub-row: Garage S3 Pi + site gateway ────
  {
    id: 'pi-s3-card',
    label: 'mde-pi-s3',
    sub: 'Raspberry Pi · Garage S3 host',
    kind: 'storage-pi',
    site: 'mde',
    tier: 'physical',
    x: 755, y: 345, w: 375, h: 85,
    tailnet: { ip: '100.x.x.83', hostname: 'mde-pi-s3', tag: 'tag:storage' },
    meta: {
      Hardware: 'Pi · SATA SSD on USB',
      Service: 'Garage v2.2.0 (S3-compatible)',
      Role: 'backup target · Loki / Thanos / VolSync',
    },
  },
  {
    id: 'mde-gw',
    label: 'UCG Max',
    sub: 'UniFi gateway · dual-WAN',
    kind: 'router',
    site: 'mde',
    tier: 'physical',
    x: 1145, y: 345, w: 155, h: 85,
    meta: {
      WAN1: 'Movistar GPON · ~1Gb',
      WAN2: 'Somos · CGNAT failover',
      Mode: 'failover (WAN1 → WAN2)',
      LAN: '192.168.15.0/24',
      Mgmt: '192.168.11.1',
    },
  },

  // ── MDE · VM row: only mde-k3s-w1 (the on-demand worker VM) ──────────
  {
    id: 'mde-k3s-w1-vm',
    label: 'mde-k3s-w1',
    sub: 'VMID 101 · runs on mde-pve1',
    kind: 'k3s-vm',
    site: 'mde',
    tier: 'vm',
    x: 1250, y: 445, w: 150, h: 80,
    parent: 'mde-pve1',
    meta: {
      vCPU: '8 cores',
      RAM: '8GB',
    },
  },

  // ── MDE · K3s row: 3 cp + 1 worker ──────────────────────────────────
  {
    id: 'k3s-cp1',
    label: 'k3s-cp1',
    sub: 'control · etcd · primary',
    kind: 'k3s-cp',
    site: 'mde',
    tier: 'k3s',
    x: 755, y: 565, w: 152, h: 200,
    parent: 'k3s-cp1-bm',
    tailnet: { ip: '100.x.x.118', hostname: 'k3s-cp1', tag: 'tag:k8s' },
    meta: {
      Role: 'control-plane + etcd',
      'Pod CIDR': '10.42.1.0/24',
      Pins: 'tailnet egress proxies',
    },
  },
  {
    id: 'k3s-cp2',
    label: 'k3s-cp2',
    sub: 'control · etcd',
    kind: 'k3s-cp',
    site: 'mde',
    tier: 'k3s',
    x: 920, y: 565, w: 152, h: 200,
    parent: 'k3s-cp2-bm',
    tailnet: { ip: '100.x.x.15', hostname: 'k3s-cp2', tag: 'tag:k8s' },
    meta: {
      Role: 'control-plane + etcd',
      'Pod CIDR': '10.42.3.0/24',
      Hosts: 'kube-prometheus-stack',
    },
  },
  {
    id: 'k3s-cp3',
    label: 'k3s-cp3',
    sub: 'control · etcd · arm64',
    kind: 'k3s-cp',
    site: 'mde',
    tier: 'k3s',
    x: 1085, y: 565, w: 152, h: 200,
    parent: 'k3s-cp3-bm',
    tailnet: { ip: '100.x.x.71', hostname: 'k3s-cp3', tag: 'tag:k8s' },
    meta: {
      Role: 'control-plane + etcd',
      'Pod CIDR': '10.42.4.0/24',
      Arch: 'arm64',
    },
  },
  {
    id: 'mde-k3s-w1',
    label: 'mde-k3s-w1',
    sub: 'worker · MDE-resident',
    kind: 'k3s-worker',
    site: 'mde',
    tier: 'k3s',
    x: 1250, y: 565, w: 150, h: 200,
    parent: 'mde-k3s-w1-vm',
    tailnet: { ip: '100.x.x.45', hostname: 'mde-k3s-w1', tag: 'tag:k8s' },
    meta: {
      Role: 'worker',
      'Pod CIDR': '10.42.0.0/24',
      Hosts: 'tailnet ingress proxies',
    },
  },
];

export const LINKS: TopoLink[] = [
  // FL physical / VM / k3s
  { from: 'router-fl', to: 'fl-pve1', kind: 'lan', label: '1Gb' },
  { from: 'router-fl', to: 'synology', kind: 'lan' },
  { from: 'fl-pve1', to: 'truenas', kind: 'vm-host' },
  { from: 'fl-pve1', to: 'k3s-pve-vm', kind: 'vm-host' },
  { from: 'truenas', to: 'k3s-pve-vm', kind: 'storage', label: 'iSCSI 10G' },
  { from: 'synology', to: 'k3s-pve-vm', kind: 'lan', label: 'NFS' },
  { from: 'k3s-pve-vm', to: 'k3s-pve', kind: 'k3s-vm' },

  // MDE physical → k3s (cp baremetals run k3s server directly, no VM)
  { from: 'k3s-cp1-bm', to: 'k3s-cp1', kind: 'k3s-vm' },
  { from: 'k3s-cp2-bm', to: 'k3s-cp2', kind: 'k3s-vm' },
  { from: 'k3s-cp3-bm', to: 'k3s-cp3', kind: 'k3s-vm' },

  // MDE site gateway (UCG Max) → LAN (VLAN 15)
  { from: 'mde-gw', to: 'mde-pve1', kind: 'lan' },
  { from: 'mde-gw', to: 'pi-s3-card', kind: 'lan' },

  // MDE mde-pve1 → VM → k3s
  { from: 'mde-pve1', to: 'mde-k3s-w1-vm', kind: 'vm-host' },
  { from: 'mde-k3s-w1-vm', to: 'mde-k3s-w1', kind: 'k3s-vm' },

  // K3s etcd (chain; cp1↔cp3 implied by transitivity, also visualized as
  // a bracket above the cp row).
  { from: 'k3s-cp1', to: 'k3s-cp2', kind: 'etcd' },
  { from: 'k3s-cp2', to: 'k3s-cp3', kind: 'etcd' },

  // kube-api: control plane → workers (over Tailscale for FL worker)
  { from: 'k3s-cp1', to: 'mde-k3s-w1', kind: 'k3s-cp-worker', label: 'kube-api' },
  { from: 'k3s-cp1', to: 'k3s-pve', kind: 'k3s-cp-worker', label: 'kube-api · TS' },
];

// Ingress proxies are grouped by host node, not by service tag, so we don't
// spill specific app names onto the page. Each chip represents "a Tailscale
// ingress fabric running here".
export const PROXY_GROUPS: ProxyGroup[] = [
  {
    id: 'ingress-fl',
    kind: 'ingress',
    tag: 'tag:k8s',
    node: 'k3s-pve',
    label: 'Tailscale ingress',
    site: 'fl',
    services: 'shared ingress proxies for FL-resident services',
  },
  {
    id: 'ingress-mde',
    kind: 'ingress',
    tag: 'tag:k8s',
    node: 'mde-k3s-w1',
    label: 'Tailscale ingress',
    site: 'mde',
    services: 'shared ingress proxies for MDE-resident services',
  },
  {
    id: 'egress-s3',
    kind: 'egress',
    tag: 'tag:storage',
    node: 'k3s-cp1',
    label: 'S3 egress',
    site: 'mde',
    target: 'pi-s3-card',
    services: 'cluster → Garage S3 on Pi',
  },
];

// Dedupe tailnet uplinks by IP, keeping the card with the SMALLEST y (topmost
// tier). Bare-metal nodes share kernel identity with their k3s counterpart —
// we want a single uplink per device, drawn from the topmost card.
export function tailnetDevices(): TopoNode[] {
  const byIp = new Map<string, TopoNode>();
  for (const n of NODES) {
    if (!n.tailnet || n.hidden) continue;
    const ip = n.tailnet.ip;
    const prev = byIp.get(ip);
    if (!prev || n.y < prev.y) byIp.set(ip, n);
  }
  return Array.from(byIp.values());
}

export const TAG_COLOR: Record<string, string> = {
  'tag:proxmox': '#E8B339',
  'tag:k8s': '#5FA97B',
  'tag:storage': '#7AB5C7',
  'tag:autopirate': '#D26B7A',
  'tag:stuff': '#A48BD9',
  'tag:monitoring': '#C9A33E',
  'svc:s3': '#7AB5C7',
};

export function tagColor(tag: string): string {
  return TAG_COLOR[tag] || '#9AA0A6';
}
