// shapes.tsx — small SVG primitives used by the diagram: node icons, status
// LEDs, rack texture, tailnet badge. Pure presentational.

import { useTopoTheme } from './theme';
import type { NodeKind } from './data';

interface LEDProps {
  cx: number;
  cy: number;
  color?: string;
  size?: number;
  animate?: boolean;
}

// LED dot — pulsing to evoke a live rack.
export function LED({ cx, cy, color = '#3FD771', size = 3.5, animate = true }: LEDProps) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={size + 2} fill={color} opacity="0.18">
        {animate && (
          <animate attributeName="opacity" values="0.05;0.25;0.05" dur="2.4s" repeatCount="indefinite" />
        )}
      </circle>
      <circle cx={cx} cy={cy} r={size} fill={color} opacity={animate ? undefined : 0.85}>
        {animate && (
          <animate attributeName="opacity" values="0.55;1;0.55" dur="2.4s" repeatCount="indefinite" />
        )}
      </circle>
    </g>
  );
}

interface NodeIconProps {
  kind: NodeKind;
  x: number;
  y: number;
  color: string;
}

// Minimal geometric icons drawn into an 18×18 box anchored at (x, y).
export function NodeIcon({ kind, x, y, color }: NodeIconProps) {
  const cx = x + 9;
  switch (kind) {
    case 'hypervisor':
      return (
        <g stroke={color} fill="none" strokeWidth="1.2" strokeLinecap="round">
          <rect x={x + 1.5} y={y + 2} width="15" height="4" rx="0.5" />
          <rect x={x + 1.5} y={y + 7.5} width="15" height="4" rx="0.5" />
          <rect x={x + 1.5} y={y + 13} width="15" height="4" rx="0.5" />
          <circle cx={x + 14} cy={y + 4} r="0.6" fill={color} />
          <circle cx={x + 14} cy={y + 9.5} r="0.6" fill={color} />
          <circle cx={x + 14} cy={y + 15} r="0.6" fill={color} />
        </g>
      );
    case 'baremetal':
      return (
        <g stroke={color} fill="none" strokeWidth="1.2">
          <rect x={x + 2} y={y + 4} width="14" height="10" rx="1" />
          <line x1={x + 5} y1={y + 16} x2={x + 13} y2={y + 16} strokeWidth="1.5" />
          <circle cx={x + 13} cy={y + 7} r="0.6" fill={color} />
          <circle cx={x + 13} cy={y + 11} r="0.6" fill={color} />
        </g>
      );
    case 'baremetal-arm':
      return (
        <g stroke={color} fill="none" strokeWidth="1.2">
          <rect x={x + 2} y={y + 3} width="14" height="12" rx="1" />
          <rect x={x + 5} y={y + 6} width="8" height="6" stroke={color} fill={color} fillOpacity="0.12" />
          <line x1={x + 1} y1={y + 7} x2={x + 2} y2={y + 7} />
          <line x1={x + 1} y1={y + 11} x2={x + 2} y2={y + 11} />
          <line x1={x + 16} y1={y + 7} x2={x + 17} y2={y + 7} />
          <line x1={x + 16} y1={y + 11} x2={x + 17} y2={y + 11} />
        </g>
      );
    case 'storage':
    case 'storage-vm':
    case 'storage-pi':
      return (
        <g stroke={color} fill="none" strokeWidth="1.2">
          <ellipse cx={cx} cy={y + 4} rx="6.5" ry="1.5" />
          <path d={`M${x + 2.5},${y + 4} L${x + 2.5},${y + 14}`} />
          <path d={`M${x + 15.5},${y + 4} L${x + 15.5},${y + 14}`} />
          <ellipse cx={cx} cy={y + 9} rx="6.5" ry="1.5" />
          <ellipse cx={cx} cy={y + 14} rx="6.5" ry="1.5" />
        </g>
      );
    case 'router':
      return (
        <g stroke={color} fill="none" strokeWidth="1.2" strokeLinecap="round">
          <path d={`M${x + 9},${y + 4} Q${x + 5},${y + 4} ${x + 5},${y + 9}`} />
          <path d={`M${x + 9},${y + 4} Q${x + 13},${y + 4} ${x + 13},${y + 9}`} />
          <path d={`M${x + 9},${y + 6} Q${x + 6.5},${y + 7} ${x + 6.5},${y + 9}`} />
          <path d={`M${x + 9},${y + 6} Q${x + 11.5},${y + 7} ${x + 11.5},${y + 9}`} />
          <circle cx={x + 9} cy={y + 9} r="1" fill={color} />
          <rect x={x + 3} y={y + 11} width="12" height="5" rx="0.5" />
        </g>
      );
    case 'k3s-vm':
      return (
        <g stroke={color} fill="none" strokeWidth="1.2">
          <rect x={x + 2} y={y + 2} width="14" height="14" rx="1" strokeDasharray="2 1.5" />
          <path
            d={`M${x + 6},${y + 9} L${x + 9},${y + 6} L${x + 12},${y + 9} L${x + 9},${y + 12} Z`}
            fill={color}
            fillOpacity="0.2"
          />
        </g>
      );
    case 'k3s-worker':
    case 'k3s-cp':
      return (
        <g stroke={color} fill="none" strokeWidth="1.2">
          <polygon
            points={`${cx},${y + 2} ${x + 16},${y + 6} ${x + 16},${y + 12} ${cx},${y + 16} ${x + 2},${y + 12} ${x + 2},${y + 6}`}
          />
          <polygon
            points={`${cx},${y + 6} ${x + 13},${y + 8} ${x + 13},${y + 11} ${cx},${y + 13} ${x + 5},${y + 11} ${x + 5},${y + 8}`}
            fill={color}
            fillOpacity="0.2"
          />
        </g>
      );
    default:
      return <rect x={x + 3} y={y + 3} width="12" height="12" stroke={color} fill="none" />;
  }
}

interface RackTextureProps {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

// Faint scan-line "rack" texture overlay on hypervisor / bare-metal cards.
export function RackTexture({ x, y, w, h, color }: RackTextureProps) {
  const lines = [];
  const spacing = 8;
  for (let yy = y + 8; yy < y + h - 4; yy += spacing) {
    lines.push(
      <line key={yy} x1={x + 8} y1={yy} x2={x + w - 8} y2={yy} stroke={color} strokeOpacity="0.07" strokeWidth="0.5" />,
    );
  }
  return <g>{lines}</g>;
}

interface TailnetBadgeProps {
  x: number;
  y: number;
  ip: string;
  hovered: boolean;
}

// Tailnet badge — small ".ts.net" tag attached to a card corner.
export function TailnetBadge({ x, y, ip, hovered }: TailnetBadgeProps) {
  const t = useTopoTheme();
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={x}
        y={y}
        width="64"
        height="13"
        rx={t.cardRadius}
        fill={t.tsBusBg}
        stroke={t.ts}
        strokeOpacity={hovered ? 0.95 : 0.55}
        strokeWidth="0.6"
      />
      <circle cx={x + 6} cy={y + 6.5} r="2" fill={t.ts} />
      <text x={x + 11} y={y + 9.5} fontSize="7.5" fill={t.ts} fontFamily={t.fontMono} letterSpacing="0.04em">
        {ip}
      </text>
    </g>
  );
}
