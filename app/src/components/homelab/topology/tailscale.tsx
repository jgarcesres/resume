// tailscale.tsx — the Tailscale "plane" overlay: tailnet bus, per-device
// uplinks, ProxyGroup chips, and animated WireGuard packets between sites.
// Rendered as a translucent layer above the physical/VM/k3s substrate so the
// "Tailscale is its own plane" mental model reads at a glance.

import { useMemo } from 'react';
import { useTopoTheme } from './theme';
import type { TopologyTheme } from './theme';
import { tagColor } from './data';
import type { ProxyGroup, TopoNode } from './data';

// The tailnet plane is a horizontal band at the top of the canvas.
const TS_PLANE = { y: 18, h: 70 };
export const TS_BUS_Y = TS_PLANE.y + TS_PLANE.h / 2;

// Curvy bus path that crosses the centerline so the cross-site WireGuard trunk
// visually splits into an FL half + an MDE half.
function busPath(canvasW: number): string {
  const left = 100;
  const right = canvasW - 100;
  const mid = canvasW / 2;
  const y = TS_BUS_Y;
  return `M${left},${y} C${(left + mid) / 2},${y - 18} ${(mid + left) / 2 + 20},${y + 18} ${mid},${y} S${(mid + right) / 2 + 20},${y + 18} ${right},${y}`;
}

export type TailscaleMode = 'off' | 'trunk' | 'full';

interface TailscalePlaneProps {
  canvasW: number;
  mode: TailscaleMode;
  nodeIndex: Record<string, TopoNode>;
  proxyGroups: ProxyGroup[];
  devices: TopoNode[];
  hoveredDeviceId: string | null;
  animate: boolean;
}

interface PositionedChip extends ProxyGroup {
  cx: number;
  cy: number;
}

export function TailscalePlane({
  canvasW,
  mode,
  nodeIndex,
  proxyGroups,
  devices,
  hoveredDeviceId,
  animate,
}: TailscalePlaneProps) {
  const t = useTopoTheme();

  const chips = useMemo<PositionedChip[]>(() => {
    const fl = proxyGroups.filter((p) => p.site === 'fl');
    const mde = proxyGroups.filter((p) => p.site === 'mde');
    const flW = canvasW / 2 - 220;
    const mdeW = canvasW / 2 - 220;
    const out: PositionedChip[] = [];
    fl.forEach((p, i) => {
      const cx = 120 + (i + 0.5) * (flW / Math.max(fl.length, 1));
      out.push({ ...p, cx, cy: TS_PLANE.y + 8 });
    });
    mde.forEach((p, i) => {
      const cx = canvasW / 2 + 80 + (i + 0.5) * (mdeW / Math.max(mde.length, 1));
      out.push({ ...p, cx, cy: TS_PLANE.y + 8 });
    });
    return out;
  }, [proxyGroups, canvasW]);

  if (mode === 'off') return null;

  const showFull = mode === 'full';
  const bus = busPath(canvasW);

  return (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        <linearGradient id="ts-plane-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.tsBusBg} stopOpacity="0.95" />
          <stop offset="100%" stopColor={t.tsBusBg} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="ts-bus-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={t.ts} stopOpacity="0.0" />
          <stop offset="10%" stopColor={t.ts} stopOpacity="0.9" />
          <stop offset="50%" stopColor={t.ts} stopOpacity="0.95" />
          <stop offset="90%" stopColor={t.ts} stopOpacity="0.9" />
          <stop offset="100%" stopColor={t.ts} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      <rect
        x="60"
        y={TS_PLANE.y}
        width={canvasW - 120}
        height={TS_PLANE.h}
        rx={t.cardRadius + 1}
        fill="url(#ts-plane-grad)"
        stroke={t.ts}
        strokeOpacity="0.55"
        strokeWidth="0.6"
        strokeDasharray="4 3"
      />

      <text x="72" y={TS_PLANE.y + 14} fontSize="9" fill={t.ts} fontFamily={t.fontLabel} letterSpacing="0.18em" fontWeight="600">
        TAILSCALE OVERLAY
      </text>
      <text
        x={canvasW - 72}
        y={TS_PLANE.y + 14}
        fontSize="8"
        fill={t.dim}
        fontFamily={t.fontMono}
        textAnchor="end"
        letterSpacing="0.1em"
      >
        WireGuard · MTU 1280
      </text>

      <path d={bus} stroke="url(#ts-bus-grad)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d={bus} stroke={t.ts} strokeWidth="0.6" strokeOpacity="0.35" fill="none" strokeLinecap="round" strokeDasharray="1 4">
        {animate && <animate attributeName="stroke-dashoffset" values="0;-25" dur="3s" repeatCount="indefinite" />}
      </path>

      {animate && (
        <>
          <circle r="2.2" fill={t.ts}>
            <animateMotion dur="6s" repeatCount="indefinite" rotate="auto" path={bus} />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.92;1" dur="6s" repeatCount="indefinite" />
          </circle>
          <circle r="1.6" fill={t.accent}>
            <animateMotion dur="7.5s" repeatCount="indefinite" rotate="auto" begin="2.2s" path={bus} />
          </circle>
          <circle r="2.2" fill={t.ts}>
            <animateMotion dur="6s" repeatCount="indefinite" rotate="auto" begin="3s" keyPoints="1;0" keyTimes="0;1" path={bus} />
          </circle>
        </>
      )}

      {showFull &&
        devices.map((dev) => {
          const n = nodeIndex[dev.id];
          if (!n || n.hidden || !dev.tailnet) return null;
          const ax = n.x + n.w / 2;
          const ay = n.y;
          const by = TS_BUS_Y + Math.sin((ax / canvasW) * Math.PI * 2) * 8;
          const color = tagColor(dev.tailnet.tag);
          const isHovered = hoveredDeviceId === dev.id;
          return (
            <g key={`ts-up-${dev.id}`}>
              <path
                d={`M${ax},${ay} C${ax},${ay - 30} ${ax},${by + 40} ${ax},${by}`}
                stroke={color}
                strokeOpacity={isHovered ? 0.95 : 0.45}
                strokeWidth={isHovered ? 1.6 : 1.0}
                fill="none"
                strokeDasharray="2 3"
              />
              <circle cx={ax} cy={by} r={isHovered ? 3.4 : 2.4} fill={color} opacity="0.95" />
              <circle cx={ax} cy={by} r="6" fill={color} opacity="0.18">
                {animate && (
                  <>
                    <animate attributeName="r" values="3;7;3" dur="3.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.35;0;0.35" dur="3.2s" repeatCount="indefinite" />
                  </>
                )}
              </circle>
              <circle cx={ax} cy={ay - 4} r="2" fill={color} opacity="0.85" />
              <circle cx={ax} cy={ay - 4} r="3.5" fill="none" stroke={color} strokeOpacity="0.4" strokeWidth="0.6" />
            </g>
          );
        })}

      {showFull && chips.map((p) => <ProxyChip key={p.id} chip={p} t={t} animate={animate} />)}
    </g>
  );
}

interface ProxyChipProps {
  chip: PositionedChip;
  t: TopologyTheme;
  animate: boolean;
}

function ProxyChip({ chip, t, animate }: ProxyChipProps) {
  const color = tagColor(chip.tag);
  const isEgress = chip.kind === 'egress';
  const label = chip.label;
  const w = Math.max(120, label.length * 5.8 + 28);
  return (
    <g transform={`translate(${chip.cx - w / 2}, ${chip.cy - 22})`} style={{ pointerEvents: 'none' }}>
      <rect width={w} height="22" rx={t.cardRadius + 8} fill={t.panel} stroke={color} strokeOpacity="0.85" strokeWidth="0.8" />
      <circle cx="11" cy="11" r="3.5" fill={color} />
      <circle cx="11" cy="11" r="3.5" fill="none" stroke={color} strokeOpacity="0.5" strokeWidth="0.8">
        {animate && (
          <>
            <animate attributeName="r" values="3.5;6;3.5" dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.5;0;0.5" dur="2.6s" repeatCount="indefinite" />
          </>
        )}
      </circle>
      <text x="22" y="14.5" fontSize="9.5" fill={t.ink} fontFamily={t.fontMono} letterSpacing="0.04em">
        {label}
      </text>
      <text x={w - 9} y="14.5" fontSize="10" fill={color} textAnchor="end" fontFamily={t.fontMono}>
        {isEgress ? '↑' : '↓'}
      </text>
    </g>
  );
}
