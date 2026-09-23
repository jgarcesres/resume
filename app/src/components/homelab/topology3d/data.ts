// data.ts — model for the 3D homelab topology (Topology3D). Hand-maintained
// from the homelab repo's docs/infrastructure (hardware.md, k3s-cluster.md,
// power.md) as of 2026-09.
//
// This page is public: the model deliberately carries no addresses (tailnet
// IPs, LAN IPs, subnets, public IP), no tailnet name and no personal handles —
// hostnames, ACL tags and hardware only. Keep it that way.

export type SiteId = 'fl' | 'mde';
export type Tier = 'phys' | 'vm' | 'k3s';
export type PlaneTier = Tier | 'plane';
export type Kind =
  | 'hypervisor' | 'nas' | 'mini' | 'pi' | 'pizero' | 'router' | 'switch' | 'kvm' | 'ups' | 'desktop'
  | 'vm' | 'cp' | 'worker' | 'ingress' | 'egress';
export type LinkKind = 'etcd' | 'kube' | 'storage' | 'tailnet' | 'backup' | 'lan' | 'runs' | 'power';

export const COLORS = {
  bg: '#0A0C0A', ink: '#E8E4DA', dim: '#7A7D72', accent: '#5FA97B', led: '#3FD771', phys: '#4F8D69',
  cp: '#8BB0E0', ts: '#E8B339', ping: '#FFD978', warn: '#E8B339', backup: '#6FC2B5', power: '#D98B8B', lan: '#8E948A',
} as const;

export const TIER_Y: Record<PlaneTier, number> = { phys: 0, vm: 3.2, k3s: 6.4, plane: 10.4 };
export const TIERS: Record<PlaneTier, { idx: string; label: string }> = {
  phys: { idx: '01', label: 'Physical' },
  vm: { idx: '02', label: 'Virtual machines' },
  k3s: { idx: '03', label: 'Kubernetes · k3s v1.36' },
  plane: { idx: '04', label: 'Tailnet · WireGuard' },
};

export interface Site {
  id: SiteId; idx: string; role: string; label: string; code: string; wan: string;
  x0: number; x1: number; z0: number; z1: number;
}
export const SITES: Record<SiteId, Site> = {
  fl: { id: 'fl', idx: '01', role: 'Primary', label: 'Florida, US', code: 'FL', wan: 'AT&T fiber', x0: -19.5, x1: -6.5, z0: -5, z1: 6 },
  mde: { id: 'mde', idx: '02', role: 'Remote', label: 'Medellín, CO', code: 'MDE', wan: 'dynamic IP · DDNS', x0: 0.5, x1: 22.5, z0: -5, z1: 6 },
};

export const KINDS: Record<Kind, { label: string; edge: string }> = {
  hypervisor: { label: 'Proxmox host', edge: COLORS.phys },
  nas: { label: 'NAS', edge: COLORS.phys },
  mini: { label: 'Bare metal', edge: COLORS.phys },
  pi: { label: 'Raspberry Pi', edge: COLORS.phys },
  pizero: { label: 'Raspberry Pi', edge: COLORS.phys },
  router: { label: 'Router', edge: COLORS.lan },
  switch: { label: 'Switch', edge: COLORS.lan },
  kvm: { label: 'KVM appliance', edge: COLORS.lan },
  ups: { label: 'UPS', edge: COLORS.lan },
  desktop: { label: 'Tailnet peer', edge: COLORS.lan },
  vm: { label: 'Virtual machine', edge: COLORS.accent },
  cp: { label: 'Control plane', edge: COLORS.cp },
  worker: { label: 'Worker', edge: COLORS.accent },
  ingress: { label: 'Tailscale ingress', edge: COLORS.ts },
  egress: { label: 'Tailscale egress', edge: COLORS.ts },
};

export interface LinkKindDef {
  label: string; color: string; traffic: number; r?: number; bidir?: boolean; speed?: number; dashed?: boolean; off?: boolean;
}
export const LINK_KINDS: Record<LinkKind, LinkKindDef> = {
  etcd: { label: 'etcd raft', color: COLORS.cp, traffic: 3, r: 0.032, bidir: true, speed: 5 },
  kube: { label: 'kube-api', color: '#C9CCC2', traffic: 1.5, r: 0.022, speed: 3.6 },
  storage: { label: 'Storage · NFS / iSCSI', color: COLORS.accent, traffic: 2.5, r: 0.045, speed: 3 },
  tailnet: { label: 'Tailnet · WireGuard', color: COLORS.ts, traffic: 2, r: 0.03, bidir: true, speed: 4.5 },
  backup: { label: 'Backups · S3 / rsync', color: COLORS.backup, traffic: 1.5, r: 0.028, speed: 3 },
  lan: { label: 'LAN · PoE', color: COLORS.lan, traffic: 0.8, r: 0.02, speed: 2.4 },
  runs: { label: 'Runs on', color: COLORS.dim, traffic: 0, dashed: true },
  power: { label: 'Power · NUT', color: COLORS.power, traffic: 0.6, r: 0.016, speed: 1.6, off: true },
};

interface Base {
  id: string; label: string; sub: string; kind: Kind; site: SiteId;
  /** [x, z] on the site floor. */
  pos: [number, number];
  ts?: { host: string; tags: string };
  warn?: string;
  note?: string;
  meta?: Record<string, string>;
}
export interface BoxNode extends Base {
  tier: 'phys' | 'vm';
  size: [number, number, number];
  bays?: number; ports?: number; hat?: boolean; form?: 'tower';
  /** Where the tailnet uplink leaves the top face, relative to centre. */
  uplink?: [number, number];
}
export interface HexNode extends Base { tier: 'k3s'; r: number; h: number }
export type TopoNode = BoxNode | HexNode;
export interface Chip extends Base {
  /** Nodes running this ProxyGroup's pods. */
  hosts: string[];
  target?: string;
  targetKind?: LinkKind;
}

export const NODES: TopoNode[] = [
  // ── Florida ──
  { id: 'fl-pve1', label: 'fl-pve1', sub: 'Lenovo P520 · Proxmox VE 9', kind: 'hypervisor', site: 'fl', tier: 'phys',
    pos: [-15, -0.2], size: [1.8, 2.6, 3.0], form: 'tower', bays: 6, uplink: [0.5, -1.15],
    ts: { host: 'fl-pve1', tags: 'tag:proxmox' },
    warn: '1× 970 EVO 2 TB faulted — out of the pool, pending removal on the next Florida visit.',
    meta: { CPU: 'Xeon W-2245 · 8C/16T', RAM: '128 GB DDR4 ECC', GPU: 'Quadro RTX 4000 → k3s-pve', NIC: '2.5 GbE', tank_22: '6×22 TB RAIDZ1 · ~100 TB', flash: '3×2 TB RAIDZ1 · ~3.5 TB' } },
  { id: 'xfiles', label: 'xfiles', sub: 'Synology DS1515+', kind: 'nas', site: 'fl', tier: 'phys',
    pos: [-9.2, -1.6], size: [1.8, 1.7, 1.9],
    ts: { host: 'xfiles', tags: 'tag:storage' },
    meta: { Drives: '5×10 TB · ~40 TB', Share: 'NFS · media' } },
  { id: 'router-fl', label: 'BGW-320', sub: 'AT&T fiber · 1 Gb', kind: 'router', site: 'fl', tier: 'phys',
    pos: [-9.2, 2.6], size: [1.9, 0.32, 1.1], ports: 4,
    meta: { Uplink: '1 Gb fiber', Forwards: ':80 / :443 → Traefik on k3s-pve' } },
  { id: 'ups-fl', label: 'FL UPS', sub: 'on site · not wired in yet', kind: 'ups', site: 'fl', tier: 'phys',
    pos: [-18.2, 1.8], size: [1.1, 1.3, 1.8],
    warn: 'On site but nothing is plugged into it yet — the Florida gear has no UPS protection or NUT monitoring until it is wired in.',
    meta: { Status: 'unpowered · no NUT', Protects: 'nothing yet' } },
  { id: 'truenas', label: 'truenas', sub: 'VMID 104 · on fl-pve1', kind: 'vm', site: 'fl', tier: 'vm',
    pos: [-15.8, -0.2], size: [1.5, 0.85, 1.7],
    ts: { host: 'truenas', tags: 'tag:storage' },
    meta: { Resources: '48 GB RAM', HBA: 'SATA + LSI SAS HBA + NVMe passthrough', NFS: 'movies · series · downloads', iSCSI: 'democratic-csi targets' } },
  { id: 'k3s-pve-vm', label: 'VM 107', sub: 'k3s-pve · on fl-pve1', kind: 'vm', site: 'fl', tier: 'vm',
    pos: [-14.2, -0.2], size: [1.5, 0.85, 1.7],
    meta: { RAM: '48 GB', GPU: 'RTX 4000 · passthrough', Storage: 'dedicated storage bridge · MTU 9000' } },
  { id: 'k3s-pve', label: 'k3s-pve', sub: 'worker · GPU · public ingress', kind: 'worker', site: 'fl', tier: 'k3s',
    pos: [-14.2, -0.2], r: 1.15, h: 0.8,
    ts: { host: 'k3s-pve', tags: 'tag:k3s' },
    meta: { Role: 'worker · GPU host', GPU: 'RTX 4000 · time-sliced ×10', Ingress: 'Traefik · public :80/:443', Taint: 'location:NoSchedule' } },

  // ── Medellín ──
  { id: 'mde-gw', label: 'UCG-Fiber', sub: 'UniFi gateway · dual-WAN', kind: 'router', site: 'mde', tier: 'phys',
    pos: [4.2, 3.6], size: [1.9, 0.32, 1.1], ports: 4,
    meta: { WAN1: 'Movistar GPON · SFP', WAN2: 'Somos · failover', Downlinks: '10G → mde-pve1 · 2.5G → USW-Flex' } },
  { id: 'mde-pve1', label: 'mde-pve1', sub: 'ASRock Rack X570D4U-2L2T · Proxmox VE', kind: 'hypervisor', site: 'mde', tier: 'phys',
    pos: [4.2, -0.2], size: [4.2, 1.5, 2.8], bays: 6, uplink: [1.9, -1.2],
    ts: { host: 'mde-pve1', tags: 'tag:proxmox' },
    note: 'Board swapped to the X570D4U-2L2T on 2026-09-12 — first BMC in either rack.',
    meta: { CPU: 'Ryzen 9 5950X · 16C/32T', RAM: '32 GB', GPU: 'Quadro P4000 → VM 101', Chassis: 'Jonsbo N6 · 9 bays', Boot: '1 TB 970 EVO Plus', NIC: '10GBase-T ×2', BMC: 'IPMI' } },
  { id: 'mde-k3s-w1-vm', label: 'VM 101', sub: 'mde-k3s-w1 · on mde-pve1', kind: 'vm', site: 'mde', tier: 'vm',
    pos: [3.1, -0.2], size: [1.9, 0.85, 1.7],
    meta: { vCPU: '16 cores', RAM: '14 GiB · balloon off', GPU: 'Quadro P4000 · passthrough' } },
  { id: 'mde-truenas', label: 'mde-truenas', sub: 'VMID 102 · on mde-pve1', kind: 'vm', site: 'mde', tier: 'vm',
    pos: [5.3, -0.2], size: [1.9, 0.85, 1.7],
    ts: { host: 'mde-truenas', tags: 'tag:storage' },
    meta: { Resources: '10 GiB · 4 vCPU', HBA: 'LSI SAS HBA passthrough', Pool: 'tank · 4×6 TB RAIDZ1', Exports: 'NFS · iSCSI' } },
  { id: 'mde-k3s-w1', label: 'mde-k3s-w1', sub: 'worker · GPU · MDE media', kind: 'worker', site: 'mde', tier: 'k3s',
    pos: [3.1, -0.2], r: 1.15, h: 0.8,
    ts: { host: 'mde-k3s-w1', tags: 'tag:k3s' },
    note: 'Pascal P4000 (sm_61): the gpu-operator validator is pinned — CUDA 13 dropped Pascal cubins.',
    meta: { Role: 'worker · GPU host', GPU: 'P4000 · time-sliced ×10', Hosts: 'Spanish-language media stack', Taint: 'location:NoSchedule' } },

  { id: 'cp1-hw', label: 'NUC8i7', sub: 'k3s-cp1 host · fanless', kind: 'mini', site: 'mde', tier: 'phys',
    pos: [9.6, -1.2], size: [1.4, 0.55, 1.4],
    meta: { CPU: 'i7-8559U · 4C/8T', RAM: '32 GB', Disk: 'NVMe · LVM', Chassis: 'passive' } },
  { id: 'cp2-hw', label: 'NUC10', sub: 'k3s-cp2 host', kind: 'mini', site: 'mde', tier: 'phys',
    pos: [12.2, -1.2], size: [1.4, 0.6, 1.4],
    meta: { CPU: 'i7-10710U · 6C/12T', RAM: '32 GB', Disk: 'NVMe · LVM', Power: 'direct AC · rack PDU' } },
  { id: 'cp3-hw', label: '5625U mini', sub: 'k3s-cp3 host · since 09-02', kind: 'mini', site: 'mde', tier: 'phys',
    pos: [14.8, -1.2], size: [1.3, 0.5, 1.3],
    note: 'The NVMe heatsink is mandatory — without it etcd fsync latency blows through its 10 ms budget.',
    meta: { CPU: 'Ryzen 5 5625U · 6C/12T', RAM: '32 GB', Disk: 'NVMe · heatsinked' } },
  { id: 'w2-hw', label: 'Pi 5', sub: 'mde-k3s-w2 host · PoE', kind: 'pi', site: 'mde', tier: 'phys', hat: true,
    pos: [17.4, -1.2], size: [1.0, 0.3, 0.72],
    note: 'The Pi 5 that used to be k3s-cp3 — demoted to worker on 2026-09-02.',
    meta: { CPU: 'Cortex-A76 · 4C', RAM: '8 GB', Disk: 'NVMe · HAT', Power: 'PoE HAT' } },
  { id: 'k3s-cp1', label: 'k3s-cp1', sub: 'control · etcd · cluster-init', kind: 'cp', site: 'mde', tier: 'k3s',
    pos: [9.6, -1.2], r: 0.95, h: 0.7,
    ts: { host: 'k3s-cp1', tags: 'tag:k3s' },
    meta: { Role: 'control-plane + etcd', Join: 'cluster-init member', Taint: 'control-plane + location:NoSchedule' } },
  { id: 'k3s-cp2', label: 'k3s-cp2', sub: 'control · etcd', kind: 'cp', site: 'mde', tier: 'k3s',
    pos: [12.2, -1.2], r: 0.95, h: 0.7,
    ts: { host: 'k3s-cp2', tags: 'tag:k3s' },
    meta: { Role: 'control-plane + etcd', Hosts: 'monitoring · egress proxies (floating)', Taint: 'control-plane + location:NoSchedule' } },
  { id: 'k3s-cp3', label: 'k3s-cp3', sub: 'control · etcd · Zen 3', kind: 'cp', site: 'mde', tier: 'k3s',
    pos: [14.8, -1.2], r: 0.95, h: 0.7,
    ts: { host: 'k3s-cp3', tags: 'tag:k3s' },
    meta: { Role: 'control-plane + etcd', Bench: '~3.3× cp2 on sysbench', Taint: 'control-plane + location:NoSchedule' } },
  { id: 'mde-k3s-w2', label: 'mde-k3s-w2', sub: 'worker · arm64', kind: 'worker', site: 'mde', tier: 'k3s',
    pos: [17.4, -1.2], r: 0.8, h: 0.6,
    ts: { host: 'mde-k3s-w2', tags: 'tag:k3s' },
    meta: { Role: 'worker · only arm64 node', Tenants: 'arm64 CI runners (cap 1 each)', Taint: 'location:NoSchedule' } },

  { id: 'ups', label: 'Rack UPS', sub: 'watched by pinut', kind: 'ups', site: 'mde', tier: 'phys',
    pos: [20.6, -1.2], size: [1.1, 1.3, 1.8],
    meta: { Policy: 'graceful poweroff on OB LB', Clients: 'cp1 · cp2 · cp3 · w2 · s3' } },
  { id: 's3', label: 'mde-pi-s3', sub: 'Pi 4 · Garage S3', kind: 'pi', site: 'mde', tier: 'phys',
    pos: [9.6, 3.0], size: [0.95, 0.26, 0.7],
    ts: { host: 's3', tags: 'tag:storage' },
    meta: { Service: 'Garage v2.2.0', TLS: 'host-kernel Caddy · tailscale cert', Power: 'PoE · NUT client', Stores: 'VolSync · CNPG · etcd · Loki · Thanos' } },
  { id: 'forge', label: 'mde-pi-forge', sub: 'Pi 4 · rsync + Forgejo', kind: 'pi', site: 'mde', tier: 'phys',
    pos: [11.8, 3.0], size: [0.95, 0.26, 0.7],
    ts: { host: 'forge', tags: 'tag:homelab · tag:backup' },
    meta: { Role: 'Garage rsync backup · Forgejo pull-mirror' } },
  { id: 'pinut', label: 'pinut', sub: 'Pi Zero 2 W · NUT primary', kind: 'pizero', site: 'mde', tier: 'phys',
    pos: [13.8, 3.0], size: [0.75, 0.14, 0.42],
    ts: { host: 'pinut', tags: 'tag:homelab' },
    meta: { Role: 'NUT server for the rack UPS', Link: 'USB → UPS', Network: 'wired only' } },
  { id: 'mde-kvm', label: 'mde-kvm', sub: 'GL.iNet Comet · KVM', kind: 'kvm', site: 'mde', tier: 'phys',
    pos: [15.8, 3.0], size: [0.9, 0.26, 0.66],
    ts: { host: 'mde-kvm', tags: 'tag:relay' },
    meta: { Role: 'KVM-over-IP · WoL · ATX control', Relay: 'Tailscale peer relay', Power: 'PoE' } },
  { id: 'switch', label: 'USW-Flex', sub: '2.5G · 8-port PoE', kind: 'switch', site: 'mde', tier: 'phys',
    pos: [18.2, 3.0], size: [1.7, 0.3, 0.95], ports: 8,
    meta: { Ports: '8 × 2.5 GbE', PoE: 'Pi 5 · Pi 4 ×2 · downstream switch · AP' } },
  { id: 'tinybeast', label: 'tinybeast', sub: 'desktop · RTX 4080 S · Ollama', kind: 'desktop', site: 'mde', tier: 'phys',
    pos: [20.8, 3.3], size: [0.95, 1.6, 1.7],
    ts: { host: 'tinybeast-fedora', tags: 'user-owned device' },
    meta: { CPU: 'Ryzen 7 7800X3D', RAM: '64 GB DDR5', GPU: 'RTX 4080 SUPER', Serves: 'Ollama for LiteLLM', Network: 'home VLAN' } },
];

export const CHIPS: Chip[] = [
  { id: 'ingress-fl', label: 'ingress-fl', sub: 'Tailscale ingress · FL services', kind: 'ingress', site: 'fl',
    pos: [-12.2, 2.8], hosts: ['k3s-pve'],
    meta: { Fronts: 'FL-resident services as *.ts.net', Exposure: 'no public port' } },
  { id: 'ai-egress', label: 'ai-egress', sub: 'Tailscale egress → Ollama', kind: 'egress', site: 'fl',
    pos: [-10.6, -3.6], hosts: ['k3s-pve'], target: 'tinybeast', targetKind: 'tailnet',
    meta: { Path: 'LiteLLM → FL egress → Ollama on tinybeast', Tag: 'tag:ai' } },
  { id: 'fl-exit', label: 'florida-us', sub: 'Tailscale exit node · FL', kind: 'egress', site: 'fl',
    pos: [-17.6, -3.6], hosts: ['k3s-pve'],
    meta: { Role: 'exit node · US egress for the tailnet', Runs: 'Connector on k3s-pve' } },
  { id: 'ingress-anycast', label: 'ingress-anycast', sub: 'Tailscale ingress · both sites', kind: 'ingress', site: 'mde',
    pos: [-3, 0.5], hosts: ['k3s-pve', 'k3s-cp2'],
    meta: { Replicas: '2 · one per site', Fronts: 'media apps as *.ts.net', Why: 'nearest replica answers' } },
  { id: 'ingress-mde', label: 'ingress-mde', sub: 'Tailscale ingress · MDE control plane', kind: 'ingress', site: 'mde',
    pos: [12.2, -3.9], hosts: ['k3s-cp2', 'k3s-cp3'],
    meta: { Replicas: '2 · spread across control-plane nodes', Fronts: 'MDE-resident services as *.ts.net' } },
  { id: 's3-egress', label: 'mde-s3-egress', sub: 'Tailscale egress → Garage', kind: 'egress', site: 'mde',
    pos: [8.2, 1.6], hosts: ['k3s-cp2', 'k3s-cp3'], target: 's3', targetKind: 'backup',
    meta: { Replicas: '2 · float across MDE nodes', Consumers: 'Loki · Thanos · VolSync · CNPG · etcd' } },
  { id: 'monitoring-egress', label: 'monitoring-egress', sub: 'Tailscale egress → exporters', kind: 'egress', site: 'mde',
    pos: [16.6, -3.9], hosts: ['k3s-cp2', 'k3s-cp3'],
    meta: { Replicas: '2', Scrapes: 'Proxmox · TrueNAS · xfiles · Pis', Tag: 'tag:metrics' } },
];

export interface LinkDef { from: string; to: string; kind: LinkKind; label?: string }
const L = (from: string, to: string, kind: LinkKind, label?: string): LinkDef => ({ from, to, kind, label });
export const LINKS: LinkDef[] = [
  L('router-fl', 'fl-pve1', 'lan', '2.5 GbE'),
  L('router-fl', 'xfiles', 'lan'),
  L('router-fl', 'k3s-pve', 'lan', 'WAN :80/:443 → Traefik'),
  L('truenas', 'k3s-pve-vm', 'storage', 'iSCSI · storage bridge · MTU 9000'),
  L('xfiles', 'k3s-pve-vm', 'storage', 'NFS · media'),
  L('mde-truenas', 'mde-k3s-w1-vm', 'storage', 'NFS · iSCSI'),
  L('fl-pve1', 'truenas', 'runs'), L('fl-pve1', 'k3s-pve-vm', 'runs'), L('k3s-pve-vm', 'k3s-pve', 'runs'),
  L('mde-pve1', 'mde-k3s-w1-vm', 'runs'), L('mde-pve1', 'mde-truenas', 'runs'), L('mde-k3s-w1-vm', 'mde-k3s-w1', 'runs'),
  L('cp1-hw', 'k3s-cp1', 'runs'), L('cp2-hw', 'k3s-cp2', 'runs'), L('cp3-hw', 'k3s-cp3', 'runs'), L('w2-hw', 'mde-k3s-w2', 'runs'),
  L('k3s-cp1', 'k3s-cp2', 'etcd'), L('k3s-cp2', 'k3s-cp3', 'etcd'), L('k3s-cp3', 'k3s-cp1', 'etcd'),
  L('k3s-cp1', 'k3s-pve', 'kube', 'kube-api · over tailnet'),
  L('k3s-cp1', 'mde-k3s-w1', 'kube', 'kube-api'),
  L('k3s-cp1', 'mde-k3s-w2', 'kube', 'kube-api'),
  L('fl-pve1', 'mde-pve1', 'tailnet', 'corosync · knet'),
  L('s3', 'forge', 'backup', 'rsync mirror'),
  L('mde-gw', 'mde-pve1', 'lan', '10 GbE'), L('mde-gw', 'switch', 'lan', 'uplink'),
  L('switch', 'mde-pve1', 'lan', '2.5 GbE'),
  L('switch', 's3', 'lan', 'PoE'), L('switch', 'forge', 'lan', 'PoE'), L('switch', 'w2-hw', 'lan', 'PoE'), L('switch', 'mde-kvm', 'lan'),
  L('ups', 'pinut', 'power', 'USB'),
  ...['cp1-hw', 'cp2-hw', 'cp3-hw', 'w2-hw', 's3'].map(t => L('pinut', t, 'power', 'NUT client')),
];
