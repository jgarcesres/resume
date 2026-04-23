import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

interface NodeData {
  id: string;
  label: string;
  type: string;
  site: string;
  role?: string;
  description: string;
  details: Record<string, string>;
}

interface Connection {
  from: string;
  to: string;
  label: string;
  crossSite?: boolean;
}

interface Site {
  id: string;
  label: string;
  flag: string;
}

interface TopologyDiagramProps {
  nodes: NodeData[];
  connections: Connection[];
  sites: Site[];
}

const nodeIcons: Record<string, string> = {
  hypervisor: '🖥️',
  kubernetes: '☸️',
  storage: '💾',
};

const fallbackIcon = '📦';

const nodePositions: Record<string, { x: number; y: number }> = {
  'pve': { x: 120, y: 60 },
  'truenas': { x: 40, y: 180 },
  'synology': { x: 200, y: 180 },
  'k3s-pve': { x: 120, y: 300 },
  'k3s-home1': { x: 370, y: 100 },
  'pve-home1': { x: 470, y: 200 },
  'k3s-home2': { x: 470, y: 310 },
};

// Palette indirection — swap a single token object based on theme.
const rpgPalette = {
  siteFlAFill: 'rgba(0,229,255,0.03)',
  siteFlAStroke: 'rgba(0,229,255,0.15)',
  siteFlBFill: 'rgba(255,215,0,0.03)',
  siteFlBStroke: 'rgba(255,215,0,0.15)',
  siteFlALabel: '#00e5ff',
  siteFlBLabel: '#ffd700',
  localLine: 'rgba(0,229,255,0.25)',
  crossLine: 'rgba(255,215,0,0.4)',
  localPacket: '#00e5ff',
  crossPacket: '#ffd700',
  connLabel: 'rgba(200,214,229,0.4)',
  nodeFill: 'rgba(20,28,51,0.9)',
  nodeFillSelected: 'rgba(0,229,255,0.12)',
  nodeStroke: 'rgba(42,58,92,0.6)',
  nodeStrokeKube: 'rgba(0,229,255,0.35)',
  nodeStrokeSelected: '#00e5ff',
  controlCap: 'rgba(0,229,255,0.5)',
  nodeLabel: '#c8d6e5',
  nodeLabelSelected: '#00e5ff',
};

const proPalette = {
  // Site regions: charcoal tinted slightly warmer / cooler to distinguish sites.
  siteFlAFill: 'rgba(95,169,123,0.04)',
  siteFlAStroke: 'rgba(95,169,123,0.22)',
  siteFlBFill: 'rgba(232,179,57,0.03)',
  siteFlBStroke: 'rgba(232,179,57,0.18)',
  siteFlALabel: '#5FA97B',
  siteFlBLabel: '#E8B339',
  // Links: muted green for local, amber dashed for cross-site VPN.
  localLine: 'rgba(95,169,123,0.35)',
  crossLine: 'rgba(232,179,57,0.55)',
  localPacket: '#3FD771',
  crossPacket: '#E8B339',
  connLabel: 'rgba(184,180,169,0.55)',
  // Nodes sit on the page surface (not a darker color) so they don't punch out.
  nodeFill: '#171B17',
  nodeFillSelected: 'rgba(95,169,123,0.14)',
  nodeStroke: '#3A4036',
  nodeStrokeKube: 'rgba(95,169,123,0.55)',
  nodeStrokeSelected: '#5FA97B',
  controlCap: 'rgba(63,215,113,0.65)',
  nodeLabel: '#E8E4DA',
  nodeLabelSelected: '#5FA97B',
};

function TopologyDiagram({ nodes, connections, sites }: TopologyDiagramProps) {
  const [selected, setSelected] = useState<NodeData | null>(null);
  const { isRpg } = useTheme();
  const p = isRpg ? rpgPalette : proPalette;
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const getPos = (id: string) => nodePositions[id] ?? null;

  const handleNodeKey = (e: React.KeyboardEvent, node: NodeData) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelected(selected?.id === node.id ? null : node);
    }
  };

  return (
    <div className="relative">
      <div className="overflow-x-auto -mx-2 px-2">
        <svg
          viewBox="0 0 560 400"
          className="w-full h-auto min-w-[480px]"
          style={{ maxHeight: '500px' }}
          role="img"
          aria-label="Homelab network topology diagram"
        >
          {/* Site backgrounds */}
          <rect x="5" y="10" width="290" height="370" rx="4"
            fill={p.siteFlAFill} stroke={p.siteFlAStroke} strokeWidth="1" strokeDasharray="4 4" />
          <rect x="340" y="10" width="215" height="370" rx="4"
            fill={p.siteFlBFill} stroke={p.siteFlBStroke} strokeWidth="1" strokeDasharray="4 4" />

          {/* Site labels */}
          {sites.map((site) => {
            const xPos = site.id === 'florida' ? 20 : 355;
            const labelColor = site.id === 'florida' ? p.siteFlALabel : p.siteFlBLabel;
            return (
              <text
                key={site.id}
                x={xPos}
                y="32"
                fontSize={isRpg ? '7' : '9'}
                fill={labelColor}
                fontFamily={isRpg ? 'var(--font-pixel, monospace)' : '"JetBrains Mono", monospace'}
                letterSpacing={isRpg ? 'normal' : '0.12em'}
              >
                {site.flag} {isRpg ? site.label : site.label.toUpperCase()}
              </text>
            );
          })}

          {/* Connections */}
          {connections.map((conn) => {
            const from = getPos(conn.from);
            const to = getPos(conn.to);
            if (!from || !to) return null;
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            const isCross = conn.crossSite;

            return (
              <g key={`${conn.from}-${conn.to}-${conn.label}`}>
                <line
                  x1={from.x + 30} y1={from.y + 20}
                  x2={to.x + 30} y2={to.y + 20}
                  stroke={isCross ? p.crossLine : p.localLine}
                  strokeWidth={isCross ? 2 : 1}
                  strokeDasharray={isCross ? '6 3' : 'none'}
                />
                {!prefersReducedMotion && (
                  <circle r="2" fill={isCross ? p.crossPacket : p.localPacket} opacity="0.85">
                    <animateMotion
                      dur={isCross ? '4s' : '3s'}
                      repeatCount="indefinite"
                      path={`M${from.x + 30},${from.y + 20} L${to.x + 30},${to.y + 20}`}
                    />
                  </circle>
                )}
                <text x={midX + 30} y={midY + 16}
                  fontSize="6" fill={p.connLabel} textAnchor="middle"
                  fontFamily={isRpg ? 'inherit' : '"JetBrains Mono", monospace'}
                >
                  {conn.label}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const pos = getPos(node.id);
            if (!pos) return null;
            const isSelected = selected?.id === node.id;
            const isKube = node.type === 'kubernetes';
            const isControl = node.role === 'control-plane';

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`${node.label}: ${node.description}`}
                onClick={() => setSelected(isSelected ? null : node)}
                onKeyDown={(e) => handleNodeKey(e, node)}
              >
                <rect
                  x={pos.x} y={pos.y}
                  width="60" height="40" rx="2"
                  fill={isSelected ? p.nodeFillSelected : p.nodeFill}
                  stroke={isSelected ? p.nodeStrokeSelected : isKube ? p.nodeStrokeKube : p.nodeStroke}
                  strokeWidth={isSelected ? 2 : 1}
                />
                {isControl && (
                  <rect x={pos.x} y={pos.y} width="60" height="3" rx="1"
                    fill={p.controlCap}
                  />
                )}
                {/* LED status dot (pro mode only) — small green pulse */}
                {!isRpg && (
                  <circle
                    cx={pos.x + 54} cy={pos.y + 6} r="2"
                    fill="#3FD771"
                    opacity="0.9"
                  >
                    {!prefersReducedMotion && (
                      <animate attributeName="opacity" values="0.4;1;0.4" dur="2.2s" repeatCount="indefinite" />
                    )}
                  </circle>
                )}
                <text x={pos.x + 30} y={pos.y + 18} textAnchor="middle" fontSize="12">
                  {nodeIcons[node.type] || fallbackIcon}
                </text>
                <text
                  x={pos.x + 30} y={pos.y + 33}
                  textAnchor="middle"
                  fontSize={isRpg ? '6' : '7'}
                  fill={isSelected ? p.nodeLabelSelected : p.nodeLabel}
                  fontFamily={isRpg ? 'var(--font-pixel, monospace)' : '"JetBrains Mono", monospace'}
                  letterSpacing={isRpg ? 'normal' : '0.04em'}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Node detail popover */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={
              isRpg
                ? 'rpg-border rpg-border-glow-cyan p-4 mt-4'
                : 'mt-4 border border-pro-rule-strong bg-pro-surface p-4'
            }
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{nodeIcons[selected.type] || fallbackIcon}</span>
                {isRpg ? (
                  <h3 className="font-pixel text-[10px] text-neon-cyan uppercase">{selected.label}</h3>
                ) : (
                  <h3 className="font-mono text-[12px] tracking-[0.12em] uppercase text-pro-accent">{selected.label}</h3>
                )}
              </div>
              <button
                type="button"
                aria-label="Close node details"
                onClick={() => setSelected(null)}
                className={
                  isRpg
                    ? 'font-pixel text-[8px] text-rpg-text-dim hover:text-rpg-text'
                    : 'font-mono text-[11px] text-pro-muted hover:text-pro-ink'
                }
              >
                [×]
              </button>
            </div>
            <p className={isRpg ? 'text-xs text-rpg-text font-body mb-3' : 'font-sans text-[13px] text-pro-ink-soft mb-3'}>
              {selected.description}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(selected.details).map(([key, val]) => (
                <div
                  key={key}
                  className={
                    isRpg
                      ? 'border border-rpg-border/30 p-2'
                      : 'border border-pro-rule p-2 bg-pro-bg'
                  }
                >
                  {isRpg ? (
                    <>
                      <span className="font-pixel text-[7px] text-rpg-text-dim uppercase block mb-1">{key}</span>
                      <span className="text-[11px] text-rpg-text font-body">{val}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-mono text-[9px] text-pro-muted uppercase tracking-[0.14em] block mb-1">{key}</span>
                      <span className="font-sans text-[12px] text-pro-ink">{val}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TopologyDiagram;
