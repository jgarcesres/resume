import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

function TopologyDiagram({ nodes, connections, sites }: TopologyDiagramProps) {
  const [selected, setSelected] = useState<NodeData | null>(null);
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
          fill="rgba(0,229,255,0.03)" stroke="rgba(0,229,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />
        <rect x="340" y="10" width="215" height="370" rx="4"
          fill="rgba(255,215,0,0.03)" stroke="rgba(255,215,0,0.15)" strokeWidth="1" strokeDasharray="4 4" />

        {/* Site labels */}
        {sites.map((site) => {
          const xPos = site.id === 'florida' ? 20 : 355;
          return (
            <text key={site.id} x={xPos} y="32"
              className="font-pixel" fontSize="7" fill={site.id === 'florida' ? '#00e5ff' : '#ffd700'}
            >
              {site.flag} {site.label}
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
                stroke={isCross ? 'rgba(255,215,0,0.4)' : 'rgba(0,229,255,0.25)'}
                strokeWidth={isCross ? 2 : 1}
                strokeDasharray={isCross ? '6 3' : 'none'}
              />
              {!prefersReducedMotion && (
                <circle r="2" fill={isCross ? '#ffd700' : '#00e5ff'} opacity="0.8">
                  <animateMotion
                    dur={isCross ? '4s' : '3s'}
                    repeatCount="indefinite"
                    path={`M${from.x + 30},${from.y + 20} L${to.x + 30},${to.y + 20}`}
                  />
                </circle>
              )}
              <text x={midX + 30} y={midY + 16}
                fontSize="6" fill="rgba(200,214,229,0.4)" textAnchor="middle"
                className="font-body"
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
                fill={isSelected ? 'rgba(0,229,255,0.12)' : 'rgba(20,28,51,0.9)'}
                stroke={isSelected ? '#00e5ff' : isKube ? 'rgba(0,229,255,0.35)' : 'rgba(42,58,92,0.6)'}
                strokeWidth={isSelected ? 2 : 1}
              />
              {isControl && (
                <rect x={pos.x} y={pos.y} width="60" height="3" rx="1"
                  fill="rgba(0,229,255,0.5)"
                />
              )}
              <text x={pos.x + 30} y={pos.y + 18} textAnchor="middle" fontSize="12">
                {nodeIcons[node.type] || fallbackIcon}
              </text>
              <text
                x={pos.x + 30} y={pos.y + 33}
                textAnchor="middle" fontSize="6"
                fill={isSelected ? '#00e5ff' : '#c8d6e5'}
                className="font-pixel"
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
            className="rpg-border rpg-border-glow-cyan p-4 mt-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{nodeIcons[selected.type] || fallbackIcon}</span>
                <h3 className="font-pixel text-[10px] text-neon-cyan uppercase">{selected.label}</h3>
              </div>
              <button
                type="button"
                aria-label="Close node details"
                onClick={() => setSelected(null)}
                className="font-pixel text-[8px] text-rpg-text-dim hover:text-rpg-text"
              >
                [×]
              </button>
            </div>
            <p className="text-xs text-rpg-text font-body mb-3">{selected.description}</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(selected.details).map(([key, val]) => (
                <div key={key} className="border border-rpg-border/30 p-2">
                  <span className="font-pixel text-[7px] text-rpg-text-dim uppercase block mb-1">{key}</span>
                  <span className="text-[11px] text-rpg-text font-body">{val}</span>
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
