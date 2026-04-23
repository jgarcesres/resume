import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import PixelPanel from '../components/ui/PixelPanel';
import PixelBadge from '../components/ui/PixelBadge';
import TypewriterText from '../components/ui/TypewriterText';
import TopologyDiagram from '../components/homelab/TopologyDiagram';
import ServiceStatus from '../components/homelab/ServiceStatus';
import homelabContent from '@resources/homelab_content.json';
import {
  CastleIcon,
  LightningIcon,
  BrainIcon,
  FloppyDiskIcon,
  GamepadIcon,
  GlobeIcon,
  LockIcon,
} from '../components/ui/PixelIcons';
import type { ComponentType, CSSProperties } from 'react';
import { useLabels } from '../lib/labels';
import { useTheme } from '../context/ThemeContext';

const badgeColors: Record<string, 'cyan' | 'magenta' | 'gold' | 'green' | 'default'> = {
  'K3s': 'cyan', 'ArgoCD': 'cyan', 'Helm': 'cyan',
  'Tailscale': 'gold', 'Cilium': 'green', 'Traefik': 'cyan', 'CoreDNS': 'green',
  'Prometheus': 'gold', 'Grafana': 'gold', 'Loki': 'gold', 'AlertManager': 'magenta', 'OpenTelemetry': 'gold',
  'ZFS': 'green', 'TrueNAS': 'green', 'NFS CSI': 'green', 'Democratic CSI': 'green', 'Garage (S3)': 'green',
  '1Password Operator': 'magenta', 'cert-manager': 'magenta', 'Pocket ID (OAuth)': 'magenta', 'Tailscale ACLs': 'gold',
  'GitHub Actions': 'cyan', 'ARC Runners': 'cyan', 'ArgoCD Image Updater': 'cyan',
};

const specIcons: Record<string, ComponentType<{ className?: string; style?: CSSProperties }>> = {
  Compute: LightningIcon,
  Memory: BrainIcon,
  Storage: FloppyDiskIcon,
  GPU: GamepadIcon,
  Sites: GlobeIcon,
  VPN: LockIcon,
};

function Homelab() {
  const specs = homelabContent.specs;
  const L = useLabels();
  const { isRpg } = useTheme();

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <PixelPanel glow="cyan" className="text-center py-6">
          <div className="mb-3 flex justify-center">
            <CastleIcon className="w-8 h-8 text-neon-cyan" />
          </div>
          <h1 className="font-pixel text-lg text-rpg-text-bright mb-2">
            <TypewriterText text={homelabContent.title} speed={40} />
          </h1>
          <p className="text-sm text-rpg-text font-body max-w-2xl mx-auto">
            {homelabContent.subtitle}
          </p>
        </PixelPanel>

        {/* Hardware Specs HUD */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: 'Compute', value: specs.totalCores },
            { label: 'Memory', value: specs.totalRam },
            { label: 'Storage', value: specs.totalStorage },
            { label: 'GPU', value: specs.gpu },
            { label: 'Sites', value: specs.sites },
            { label: 'VPN', value: specs.vpn },
          ].map((spec, i) => {
            const SpecIcon = specIcons[spec.label];
            if (!SpecIcon && import.meta.env.DEV) {
              console.warn(`[Homelab] No icon in specIcons for label "${spec.label}". Available: ${Object.keys(specIcons).join(', ')}`);
            }
            return (
            <motion.div
              key={spec.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className={
                isRpg
                  ? 'border border-rpg-border/50 bg-rpg-panel/50 p-2.5 text-center'
                  : 'border border-pro-rule bg-pro-surface p-3 text-center'
              }
            >
              <span className="flex justify-center">
                {SpecIcon && <SpecIcon className={`w-4 h-4 ${isRpg ? 'text-rpg-text' : 'text-pro-accent'}`} />}
              </span>
              <span
                className={
                  isRpg
                    ? 'font-pixel text-[7px] text-rpg-text-dim uppercase block mt-1'
                    : 'font-mono text-[9px] text-pro-muted uppercase tracking-[0.16em] block mt-2'
                }
              >
                {spec.label}
              </span>
              <span
                className={
                  isRpg
                    ? 'font-body text-[10px] text-rpg-text block mt-0.5'
                    : 'font-sans text-[13px] text-pro-ink block mt-1 pro-tabular'
                }
              >
                {spec.value}
              </span>
            </motion.div>
            );
          })}
        </div>

        {/* Topology Diagram */}
        <PixelPanel title="Network Topology">
          <div className="pt-2">
            <TopologyDiagram
              nodes={homelabContent.nodes}
              connections={homelabContent.connections}
              sites={homelabContent.sites}
            />
          </div>
        </PixelPanel>

        {/* Service Status */}
        <PixelPanel title="Service Status" glow="gold">
          <div className="pt-2">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-rpg-border/30">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-neon-green" style={{ boxShadow: '0 0 6px #39ff14' }} />
                <span className="font-pixel text-[7px] text-rpg-text-dim">
                  {homelabContent.services.filter(s => s.status === 'online').length} SERVICES ONLINE
                </span>
              </div>
            </div>
            <ServiceStatus services={homelabContent.services} />
          </div>
        </PixelPanel>

        {/* Tech Stack */}
        <PixelPanel title={L.techArsenal}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {homelabContent.techStack.map((cat, i) => (
              <motion.div
                key={cat.category}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="border border-rpg-border/30 p-3"
              >
                <h4 className="font-pixel text-[8px] text-neon-cyan uppercase mb-2">{cat.category}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {cat.items.map((item) => (
                    <PixelBadge key={item} color={badgeColors[item] || 'default'}>{item}</PixelBadge>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </PixelPanel>

        {/* Future: Grafana embed */}
        {/* <PixelPanel title="Metrics Dashboard" glow="magenta">
          <div className="pt-2 text-center py-8">
            <p className="font-pixel text-[9px] text-rpg-text-dim">Grafana dashboard embed coming soon</p>
          </div>
        </PixelPanel> */}
      </div>
    </PageTransition>
  );
}

export default Homelab;
