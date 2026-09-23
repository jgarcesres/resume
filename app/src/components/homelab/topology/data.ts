// data.ts — homelab node + link model. Single source of truth for the diagram.
//
// Ported from the claude.ai/design handoff, then reconciled with the current
// cluster (homelab repo docs/infrastructure). Node names reflect the post
// 2026-05-10 control-plane migration:
//   pve        → fl-pve1     (FL Proxmox host)
//   pve-home1  → mde-pve1    (MDE Proxmox host)
//   k3s-home2  → mde-k3s-w1  (MDE on-demand worker; ex k3s-home1 is now cp1)
//
// No addresses (tailnet IPs, LAN IPs, subnets, public IP) on purpose — this is a public page.
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
  /** WAN descriptor shown under the site name. No addresses — this page is public. */
  wan: string;
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
    label: 'Florida, US',
    flag: '🇺🇸',
    wan: 'AT&T fiber · static IP',
    x: 40,
    w: 560,
  },
  mde: {
    id: 'mde',
    label: 'Medellín, CO',
    flag: '🇨🇴',
    wan: 'dual-WAN · dynamic IP',
    x: 620,
    w: 780,
  },
};

export const TIERS: Record<TierId, TierDef> = {
  physical: { y: 200, h: 230, labelY: 188, label: 'Physical · Hosts' },
  vm: { y: 445, h: 80, labelY: 433, label: 'Virtual machines' },
  k3s: { y: 565, h: 210, labelY: 553, label: 'Kubernetes · k3s v1.36' },
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
    tailnet: { hostname: 'fl-pve1', tag: 'tag:proxmox' },
    meta: {
      CPU: 'Xeon W-2245 · 8C/16T',
      RAM: '128GB DDR4 ECC',
      GPU: 'NVIDIA Quadro RTX 4000',
      Storage: '6×22TB RAIDZ1 + 3×2TB NVMe',
      OS: 'Proxmox VE 9',
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
    tailnet: { hostname: 'xfiles', tag: 'tag:storage' },
    meta: {
      Drives: '5×10TB · ~40TB',
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
    tailnet: { hostname: 'truenas', tag: 'tag:storage' },
    meta: {
      RAM: '48GB · 4 cores',
      HBA: 'SATA + SAS HBA + NVMe passthrough',
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
      RAM: '48GB',
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
    tailnet: { hostname: 'k3s-pve', tag: 'tag:k3s' },
    meta: {
      Role: 'worker',
      Taint: 'location=fl-us:NoSchedule',
      GPU: 'RTX 4000 (time-sliced ×10)',
      Hosts: 'Traefik · public ingress',
    },
  },

  // ── MDE · Physical · top sub-row: cp triplet + Pi worker (bare metal) ─
  {
    id: 'k3s-cp1-bm',
    label: 'k3s-cp1',
    sub: 'NUC8i7 · fanless',
    kind: 'baremetal',
    site: 'mde',
    tier: 'physical',
    x: 635, y: 200, w: 114, h: 130,
    tailnet: { hostname: 'k3s-cp1', tag: 'tag:k3s' },
    meta: {
      CPU: 'i7-8559U',
      RAM: '32GB',
      Storage: 'NVMe',
    },
  },
  {
    id: 'k3s-cp2-bm',
    label: 'k3s-cp2',
    sub: 'NUC10',
    kind: 'baremetal',
    site: 'mde',
    tier: 'physical',
    x: 759, y: 200, w: 114, h: 130,
    tailnet: { hostname: 'k3s-cp2', tag: 'tag:k3s' },
    meta: {
      CPU: 'i7-10710U',
      RAM: '32GB',
      Storage: 'NVMe',
    },
  },
  {
    id: 'k3s-cp3-bm',
    label: 'k3s-cp3',
    sub: '5625U mini PC',
    kind: 'baremetal',
    site: 'mde',
    tier: 'physical',
    x: 883, y: 200, w: 114, h: 130,
    tailnet: { hostname: 'k3s-cp3', tag: 'tag:k3s' },
    meta: {
      CPU: 'Ryzen 5625U',
      RAM: '32GB',
      Storage: 'NVMe · heatsinked',
    },
  },
  {
    id: 'mde-k3s-w2-bm',
    label: 'mde-k3s-w2',
    sub: 'Pi 5 · arm64',
    kind: 'baremetal-arm',
    site: 'mde',
    tier: 'physical',
    x: 1007, y: 200, w: 138, h: 130,
    tailnet: { hostname: 'mde-k3s-w2', tag: 'tag:k3s' },
    meta: {
      CPU: 'Cortex-A76',
      RAM: '8GB',
      Storage: 'NVMe HAT',
    },
  },
  {
    id: 'mde-pve1',
    label: 'mde-pve1',
    sub: 'ASRock Rack X570D4U · Proxmox',
    kind: 'hypervisor',
    site: 'mde',
    tier: 'physical',
    x: 1155, y: 200, w: 230, h: 230,
    tailnet: { hostname: 'mde-pve1', tag: 'tag:proxmox' },
    meta: {
      CPU: 'Ryzen 9 5950X · 16C/32T',
      RAM: '32GB',
      GPU: 'Quadro P4000',
      Storage: '4×6TB RAIDZ1 (via mde-truenas)',
      NIC: '10GBase-T ×2 · BMC',
    },
  },

  // ── MDE · Physical · bottom sub-row: Garage S3 Pi + site gateway ────
  {
    id: 'pi-s3-card',
    label: 'mde-pi-s3',
    sub: 'Raspberry Pi 4 · Garage S3',
    kind: 'storage-pi',
    site: 'mde',
    tier: 'physical',
    x: 635, y: 345, w: 238, h: 85,
    tailnet: { hostname: 's3', tag: 'tag:storage' },
    meta: {
      Service: 'Garage v2.2.0 (S3-compatible)',
      Role: 'backups · Loki / Thanos / VolSync',
    },
  },
  {
    id: 'mde-gw',
    label: 'UCG-Fiber',
    sub: 'UniFi gateway · dual-WAN',
    kind: 'router',
    site: 'mde',
    tier: 'physical',
    x: 883, y: 345, w: 262, h: 85,
    meta: {
      WAN1: 'Movistar GPON (SFP)',
      WAN2: 'Somos · failover',
    },
  },

  // ── MDE · VM row: both VMs live on mde-pve1 ─────────────────────────
  {
    id: 'mde-k3s-w1-vm',
    label: 'VM 101',
    sub: 'mde-k3s-w1',
    kind: 'k3s-vm',
    site: 'mde',
    tier: 'vm',
    x: 1155, y: 445, w: 96, h: 80,
    parent: 'mde-pve1',
    meta: {
      vCPU: '16 · 14GiB',
      GPU: 'P4000 passthrough',
    },
  },
  {
    id: 'mde-truenas',
    label: 'mde-truenas',
    sub: 'VMID 102',
    kind: 'storage-vm',
    site: 'mde',
    tier: 'vm',
    x: 1259, y: 445, w: 126, h: 80,
    parent: 'mde-pve1',
    tailnet: { hostname: 'mde-truenas', tag: 'tag:storage' },
    meta: {
      RAM: '10 GiB · 4 vCPU',
      HBA: 'SATA passthrough',
    },
  },

  // ── MDE · K3s row: 3 cp + 2 workers ─────────────────────────────────
  {
    id: 'k3s-cp1',
    label: 'k3s-cp1',
    sub: 'control · etcd · init',
    kind: 'k3s-cp',
    site: 'mde',
    tier: 'k3s',
    x: 635, y: 565, w: 114, h: 200,
    parent: 'k3s-cp1-bm',
    tailnet: { hostname: 'k3s-cp1', tag: 'tag:k3s' },
    meta: {
      Role: 'cp + etcd',
      Joined: 'cluster-init',
    },
  },
  {
    id: 'k3s-cp2',
    label: 'k3s-cp2',
    sub: 'control · etcd',
    kind: 'k3s-cp',
    site: 'mde',
    tier: 'k3s',
    x: 759, y: 565, w: 114, h: 200,
    parent: 'k3s-cp2-bm',
    tailnet: { hostname: 'k3s-cp2', tag: 'tag:k3s' },
    meta: {
      Role: 'cp + etcd',
      Hosts: 'monitoring',
    },
  },
  {
    id: 'k3s-cp3',
    label: 'k3s-cp3',
    sub: 'control · etcd · Zen 3',
    kind: 'k3s-cp',
    site: 'mde',
    tier: 'k3s',
    x: 883, y: 565, w: 114, h: 200,
    parent: 'k3s-cp3-bm',
    tailnet: { hostname: 'k3s-cp3', tag: 'tag:k3s' },
    meta: {
      Role: 'cp + etcd',
      Hosts: 'TS proxies',
    },
  },
  {
    id: 'mde-k3s-w2',
    label: 'mde-k3s-w2',
    sub: 'worker · arm64',
    kind: 'k3s-worker',
    site: 'mde',
    tier: 'k3s',
    x: 1007, y: 565, w: 138, h: 200,
    parent: 'mde-k3s-w2-bm',
    tailnet: { hostname: 'mde-k3s-w2', tag: 'tag:k3s' },
    meta: {
      Role: 'arm64 worker',
      Taint: 'location=med-co',
      Hosts: 'arm64 CI',
    },
  },
  {
    id: 'mde-k3s-w1',
    label: 'mde-k3s-w1',
    sub: 'worker · GPU · MDE media',
    kind: 'k3s-worker',
    site: 'mde',
    tier: 'k3s',
    x: 1155, y: 565, w: 230, h: 200,
    parent: 'mde-k3s-w1-vm',
    tailnet: { hostname: 'mde-k3s-w1', tag: 'tag:k3s' },
    meta: {
      Role: 'worker · GPU host',
      Taint: 'location=med-co:NoSchedule',
      GPU: 'P4000 (time-sliced ×10)',
      Storage: 'NFS · iSCSI from mde-truenas',
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

  // MDE physical → k3s (bare-metal nodes run k3s directly, no VM)
  { from: 'k3s-cp1-bm', to: 'k3s-cp1', kind: 'k3s-vm' },
  { from: 'k3s-cp2-bm', to: 'k3s-cp2', kind: 'k3s-vm' },
  { from: 'k3s-cp3-bm', to: 'k3s-cp3', kind: 'k3s-vm' },
  { from: 'mde-k3s-w2-bm', to: 'mde-k3s-w2', kind: 'k3s-vm' },

  // MDE site gateway (UCG-Fiber) → LAN
  { from: 'mde-gw', to: 'mde-pve1', kind: 'lan', label: '10G' },
  { from: 'mde-gw', to: 'pi-s3-card', kind: 'lan' },

  // MDE mde-pve1 → VMs → k3s
  { from: 'mde-pve1', to: 'mde-k3s-w1-vm', kind: 'vm-host' },
  { from: 'mde-pve1', to: 'mde-truenas', kind: 'vm-host' },
  { from: 'mde-truenas', to: 'mde-k3s-w1-vm', kind: 'storage', label: 'NFS · iSCSI' },
  { from: 'mde-k3s-w1-vm', to: 'mde-k3s-w1', kind: 'k3s-vm' },

  // K3s etcd (chain; cp1↔cp3 implied by transitivity, also visualized as
  // a bracket above the cp row).
  { from: 'k3s-cp1', to: 'k3s-cp2', kind: 'etcd' },
  { from: 'k3s-cp2', to: 'k3s-cp3', kind: 'etcd' },

  // kube-api: control plane → workers (over Tailscale for FL worker)
  { from: 'k3s-cp1', to: 'mde-k3s-w1', kind: 'k3s-cp-worker', label: 'kube-api' },
  { from: 'k3s-cp1', to: 'mde-k3s-w2', kind: 'k3s-cp-worker' },
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
    id: 'ingress-anycast',
    kind: 'ingress',
    tag: 'tag:k8s',
    node: 'k3s-pve',
    label: 'Anycast ingress',
    site: 'fl',
    services: 'one replica per site (k3s-pve + k3s-cp2) for the media apps',
  },
  {
    id: 'ai-egress',
    kind: 'egress',
    tag: 'tag:ai',
    node: 'k3s-pve',
    label: 'AI egress',
    site: 'fl',
    services: 'cluster → Ollama on a tailnet desktop',
  },
  {
    id: 'ingress-mde',
    kind: 'ingress',
    tag: 'tag:k8s',
    node: 'k3s-cp2',
    label: 'Tailscale ingress',
    site: 'mde',
    services: 'shared ingress proxies for MDE-resident services (control-plane pinned)',
  },
  {
    id: 'egress-s3',
    kind: 'egress',
    tag: 'tag:k8s',
    node: 'k3s-cp3',
    label: 'S3 egress',
    site: 'mde',
    target: 'pi-s3-card',
    services: 'cluster → Garage S3 on Pi',
  },
  {
    id: 'monitoring-egress',
    kind: 'egress',
    tag: 'tag:metrics',
    node: 'k3s-cp2',
    label: 'Metrics',
    site: 'mde',
    services: 'Prometheus → exporters on hosts outside the cluster',
  },
];

// Dedupe tailnet uplinks by IP, keeping the card with the SMALLEST y (topmost
// tier). Bare-metal nodes share kernel identity with their k3s counterpart —
// we want a single uplink per device, drawn from the topmost card.
export function tailnetDevices(): TopoNode[] {
  const byHost = new Map<string, TopoNode>();
  for (const n of NODES) {
    if (!n.tailnet || n.hidden) continue;
    const host = n.tailnet.hostname;
    const prev = byHost.get(host);
    if (!prev || n.y < prev.y) byHost.set(host, n);
  }
  return Array.from(byHost.values());
}

export const TAG_COLOR: Record<string, string> = {
  'tag:proxmox': '#E8B339',
  'tag:k8s': '#5FA97B',
  'tag:k3s': '#8BB0E0',
  'tag:ai': '#D98BC4',
  'tag:metrics': '#C9A33E',
  'tag:storage': '#7AB5C7',
  'tag:autopirate': '#D26B7A',
  'tag:stuff': '#A48BD9',
  'tag:monitoring': '#C9A33E',
  'svc:s3': '#7AB5C7',
};

export function tagColor(tag: string): string {
  return TAG_COLOR[tag] || '#9AA0A6';
}
