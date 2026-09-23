// links.tsx — link path geometry + the link layer. Pure rendering: takes the
// node index + links and a `show` filter keyed by link kind.

import { useMemo } from 'react';
import { useTopoTheme } from './theme';
import type { TopologyTheme } from './theme';
import { anchorPoint, pathBetween } from './geometry';
import type { LinkKind, TopoLink, TopoNode } from './data';

interface LinkStyle {
  color: keyof TopologyTheme;
  width: number;
  dash: string;
  glow: number;
}

const LINK_STYLES: Record<LinkKind, LinkStyle> = {
  lan: { color: 'mute', width: 1.2, dash: 'none', glow: 0 },
  storage: { color: 'storageLink', width: 2.0, dash: 'none', glow: 1 },
  'vm-host': { color: 'accent', width: 0.9, dash: '2 3', glow: 0 },
  'k3s-vm': { color: 'cpAccent', width: 1.0, dash: '3 2', glow: 0 },
  etcd: { color: 'etcdLink', width: 1.4, dash: '5 3', glow: 1 },
  'k3s-cp-worker': { color: 'accent', width: 1.0, dash: 'none', glow: 0 },
};

interface LinkLayerProps {
  links: TopoLink[];
  nodeIndex: Record<string, TopoNode>;
  show: Partial<Record<LinkKind, boolean>>;
}

export function LinkLayer({ links, nodeIndex, show }: LinkLayerProps) {
  const t = useTopoTheme();
  const rendered = useMemo(() => {
    return links
      .map((l, i) => {
        const a = nodeIndex[l.from];
        const b = nodeIndex[l.to];
        if (!a || !b || a.hidden || b.hidden) return null;
        const style = LINK_STYLES[l.kind];
        if (!style) return null;
        if (show[l.kind] === false) return null;
        const ap = anchorPoint(a, b);
        const bp = anchorPoint(b, a);
        const d = pathBetween(ap, bp);
        return { i, d, ap, bp, link: l, style };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [links, nodeIndex, show]);

  return (
    <g>
      {rendered.map(({ i, d, link, style, ap, bp }) => {
        const stroke = t[style.color] as string;
        const pathLen = Math.hypot(bp.x - ap.x, bp.y - ap.y);
        const labelW = link.label ? link.label.length * 4.4 + 12 : 0;
        const showLabel = link.label && pathLen >= labelW + 4;
        return (
          <g key={i}>
            {style.glow > 0 && (
              <path d={d} stroke={stroke} strokeOpacity="0.18" strokeWidth={style.width + 4} fill="none" strokeLinecap="round" />
            )}
            <path
              d={d}
              stroke={stroke}
              strokeOpacity="0.85"
              strokeWidth={style.width}
              strokeDasharray={style.dash}
              fill="none"
              strokeLinecap="round"
            />
            {showLabel && (
              <g>
                <rect
                  x={(ap.x + bp.x) / 2 - labelW / 2}
                  y={(ap.y + bp.y) / 2 - 7}
                  width={labelW}
                  height={11}
                  rx="2"
                  fill={t.bg}
                  opacity="0.92"
                />
                <text
                  x={(ap.x + bp.x) / 2}
                  y={(ap.y + bp.y) / 2 + 1.5}
                  fontSize="8"
                  fill={t.mute}
                  textAnchor="middle"
                  fontFamily={t.fontMono}
                  letterSpacing="0.05em"
                >
                  {link.label}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}
