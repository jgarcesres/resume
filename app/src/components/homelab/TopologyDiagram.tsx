// TopologyDiagram — geo-distributed K3s topology. Composes the dotted
// background, site bands, tier rows, node cards, links, the Tailscale overlay
// plane, an etcd quorum bracket, and a click-to-ping layer. Node detail renders
// in a panel BENEATH the diagram (not a floating popup) so it never occludes
// the figure.
//
// Ported from the claude.ai/design handoff. The design-time "Tweaks" panel is
// dropped here: the pro/rpg theme follows the site-wide toggle, the Tailscale
// plane is always shown, and all link kinds are visible.

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { getTopologyTheme, TopologyThemeContext } from './topology/theme';
import type { TopologyTheme } from './topology/theme';
import { LED, NodeIcon, RackTexture, TailnetBadge } from './topology/shapes';
import { LinkLayer } from './topology/links';
import { anchorPoint } from './topology/geometry';
import { TailscalePlane } from './topology/tailscale';
import {
  LINKS,
  NODES,
  PROXY_GROUPS,
  SITES,
  TIERS,
  tagColor,
  tailnetDevices,
} from './topology/data';
import type { ProxyGroup, SiteDef, TierDef, TopoNode } from './topology/data';

const CANVAS_W = 1440;
const CANVAS_H = 800;

function usePrefersReducedMotion(): boolean {
  return useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
}

function SiteBackground({ site, t }: { site: SiteDef; t: TopologyTheme }) {
  const accent = site.id === 'fl' ? t.siteFL : t.siteMDE;
  const tint = site.id === 'fl' ? t.siteBgFL : t.siteBgMDE;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={site.x}
        y="178"
        width={site.w}
        height={CANVAS_H - 220}
        fill={tint}
        fillOpacity="0.45"
        stroke={accent}
        strokeOpacity="0.16"
        strokeWidth="0.6"
        strokeDasharray="3 4"
      />
      <text x={site.x + 14} y="118" fontSize="9.5" fill={accent} fillOpacity="0.85" fontFamily={t.fontLabel} letterSpacing="0.22em">
        {site.id === 'fl' ? 'PRIMARY · 01' : 'REMOTE · 02'}
      </text>
      <text x={site.x + 14} y="148" fontSize="24" fill={t.ink} fontFamily={t.fontDisplay} fontWeight="400">
        <tspan>{site.flag}</tspan>
        <tspan dx="10">{site.label}</tspan>
      </text>
      <text x={site.x + 14} y="168" fontSize="10" fill={t.mute} fontFamily={t.fontMono} letterSpacing="0.1em">
        {site.subnet}
        {site.publicIp !== 'dynamic' ? ` · ${site.publicIp}` : ' · dynamic IP'}
      </text>
      <line x1={site.x} y1="178" x2={site.x + site.w} y2="178" stroke={accent} strokeOpacity="0.45" strokeWidth="0.8" />
    </g>
  );
}

function TierLabel({ tier, num, t }: { tier: TierDef; num: number; t: TopologyTheme }) {
  const y = tier.labelY;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <text x="20" y={y} fontSize="9.5" fill={t.accent} fontFamily={t.fontLabel} letterSpacing="0.2em" fontWeight="600">
        {`0${num}`}
      </text>
      <text x="42" y={y} fontSize="9.5" fill={t.dim} fontFamily={t.fontLabel} letterSpacing="0.18em" fontWeight="500">
        {tier.label.toUpperCase()}
      </text>
      <line x1="40" y1={y + 4} x2={CANVAS_W - 40} y2={y + 4} stroke={t.rule} strokeWidth="0.6" strokeDasharray="1 3" />
    </g>
  );
}

function NodeMeta({ node, t }: { node: TopoNode; t: TopologyTheme }) {
  if (!node.meta) return null;
  const badgePad = node.tailnet ? 24 : 8;
  const available = node.h - 42 - badgePad;
  const showCount = Math.max(1, Math.min(Object.keys(node.meta).length, Math.floor(available / 22)));
  const keys = Object.keys(node.meta).slice(0, showCount);
  return (
    <g style={{ pointerEvents: 'none' }}>
      {keys.map((k, i) => {
        const val = String(node.meta![k]);
        const y = node.y + 46 + i * 22;
        const truncated = val.length > 32 ? val.slice(0, 30) + '…' : val;
        return (
          <g key={k}>
            <text x={node.x + 12} y={y} fontSize="7.5" fill={t.cardMetaKey} fontFamily={t.fontMono} letterSpacing="0.1em">
              {k.toUpperCase()}
            </text>
            <text x={node.x + 12} y={y + 11} fontSize="10.5" fill={t.cardMetaVal} fontFamily={t.fontBody}>
              {truncated}
            </text>
          </g>
        );
      })}
    </g>
  );
}

interface NodeCardProps {
  node: TopoNode;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  t: TopologyTheme;
  animate: boolean;
}

function NodeCard({ node, isSelected, isHovered, onSelect, onHover, t, animate }: NodeCardProps) {
  const kindAccent = (() => {
    if (node.kind === 'k3s-cp') return t.cpAccent;
    if (node.kind === 'storage' || node.kind === 'storage-vm' || node.kind === 'storage-pi') return t.storageLink;
    if (node.kind === 'router') return t.siteMDE;
    return t.accent;
  })();

  const baseStroke = node.kind === 'k3s-cp' ? t.cpAccent : t.cardStroke;
  const accent = isSelected ? t.cardSelectedStroke : isHovered ? t.accent : baseStroke;
  const fill = isSelected ? t.cardSelectedFill : t.cardFill;
  const isK3sCp = node.kind === 'k3s-cp';
  const hasTexture = node.kind === 'hypervisor' || node.kind === 'baremetal' || node.kind === 'baremetal-arm';

  return (
    <g
      style={{ cursor: 'pointer', transition: 'opacity 200ms' }}
      role="button"
      tabIndex={0}
      aria-label={`${node.label}: ${node.sub}`}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(node.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(node.id);
        }
      }}
    >
      {(isHovered || isSelected) && (
        <rect
          x={node.x - 4}
          y={node.y - 4}
          width={node.w + 8}
          height={node.h + 8}
          rx={t.cardRadius + 2}
          fill="none"
          stroke={accent}
          strokeOpacity="0.28"
          strokeWidth="6"
        />
      )}

      <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={t.cardRadius} fill={fill} stroke={accent} strokeWidth={isSelected ? 1.5 : 1} />
      <rect x={node.x} y={node.y} width={node.w} height="2.5" fill={kindAccent} fillOpacity="0.95" />

      {hasTexture && <RackTexture x={node.x} y={node.y + 20} w={node.w} h={node.h - 30} color={kindAccent} />}

      <NodeIcon kind={node.kind} x={node.x + 10} y={node.y + 10} color={kindAccent} />
      <LED cx={node.x + node.w - 11} cy={node.y + 13} color={t.accentLED} animate={animate} />

      <text x={node.x + 34} y={node.y + 17} fontSize="12.5" fill={t.cardLabel} fontFamily={t.fontBody} fontWeight="500">
        {node.label}
      </text>
      <text x={node.x + 34} y={node.y + 28.5} fontSize="8.5" fill={t.cardSub} fontFamily={t.fontMono} letterSpacing="0.04em">
        {node.sub}
      </text>

      <NodeMeta node={node} t={t} />

      {node.tailnet && (
        <TailnetBadge x={node.x + node.w - 70} y={node.y + node.h - 17} ip={node.tailnet.ip} hovered={isHovered || isSelected} />
      )}

      {isK3sCp && (
        <g style={{ pointerEvents: 'none' }}>
          <rect x={node.x + node.w - 22} y={node.y + 33} width="14" height="11" rx="1" fill="#1F2A38" stroke="#8BB0E0" strokeWidth="0.6" />
          <text
            x={node.x + node.w - 15}
            y={node.y + 41.5}
            fontSize="7"
            fill="#8BB0E0"
            fontFamily="JetBrains Mono, monospace"
            textAnchor="middle"
            letterSpacing="0.06em"
          >
            CP
          </text>
        </g>
      )}
    </g>
  );
}

function EtcdBracket({ nodeIndex, t }: { nodeIndex: Record<string, TopoNode>; t: TopologyTheme }) {
  const cp1 = nodeIndex['k3s-cp1'];
  const cp2 = nodeIndex['k3s-cp2'];
  const cp3 = nodeIndex['k3s-cp3'];
  if (!cp1 || !cp2 || !cp3) return null;
  const top = cp1.y - 26;
  const bracketY = cp1.y - 16;
  const x1 = cp1.x + cp1.w / 2;
  const x3 = cp3.x + cp3.w / 2;
  const xMid = (x1 + x3) / 2;
  const color = t.etcdLink;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <line x1={x1} y1={bracketY} x2={x1} y2={cp1.y - 2} stroke={color} strokeOpacity="0.6" strokeDasharray="5 3" strokeWidth="1.1" />
      <line x1={cp2.x + cp2.w / 2} y1={bracketY} x2={cp2.x + cp2.w / 2} y2={cp2.y - 2} stroke={color} strokeOpacity="0.6" strokeDasharray="5 3" strokeWidth="1.1" />
      <line x1={x3} y1={bracketY} x2={x3} y2={cp3.y - 2} stroke={color} strokeOpacity="0.6" strokeDasharray="5 3" strokeWidth="1.1" />
      <line x1={x1} y1={bracketY} x2={x3} y2={bracketY} stroke={color} strokeOpacity="0.75" strokeDasharray="5 3" strokeWidth="1.1" />
      <rect x={xMid - 78} y={top - 7} width="156" height="14" rx="7" fill={t.surface} stroke={color} strokeOpacity="0.6" strokeWidth="0.6" />
      <text x={xMid} y={top + 3} fontSize="9" fill={color} textAnchor="middle" fontFamily={t.fontMono} letterSpacing="0.1em">
        etcd quorum · 3-node HA
      </text>
    </g>
  );
}

// When a node is selected, fire a pulse outward along every link touching it.
function PingLayer({
  selectedId,
  nodeIndex,
  t,
  animate,
}: {
  selectedId: string | null;
  nodeIndex: Record<string, TopoNode>;
  t: TopologyTheme;
  animate: boolean;
}) {
  if (!selectedId) return null;
  const sel = nodeIndex[selectedId];
  if (!sel) return null;
  const touching = LINKS.filter((l) => l.from === selectedId || l.to === selectedId);
  const ping = t.ping;
  return (
    <g style={{ pointerEvents: 'none' }}>
      {touching.map((l, i) => {
        const a = nodeIndex[l.from];
        const b = nodeIndex[l.to];
        if (!a || !b || a.hidden || b.hidden) return null;
        const fromSel = l.from === selectedId;
        const start = anchorPoint(fromSel ? a : b, fromSel ? b : a);
        const end = anchorPoint(fromSel ? b : a, fromSel ? a : b);
        const d = `M${start.x},${start.y} L${end.x},${end.y}`;
        return (
          <g key={`ping-${l.from}-${l.to}-${i}`}>
            <path d={d} stroke={ping} strokeWidth="2.4" strokeOpacity="0.55" fill="none" strokeLinecap="round" />
            {animate && (
              <>
                <circle r="3" fill={ping}>
                  <animateMotion dur="1.4s" repeatCount="indefinite" path={d} />
                  <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="1.4s" repeatCount="indefinite" />
                </circle>
                <circle cx={end.x} cy={end.y} r="4" fill="none" stroke={ping} strokeWidth="1.2">
                  <animate attributeName="r" values="3;14;3" dur="1.4s" repeatCount="indefinite" begin="0.9s" />
                  <animate attributeName="opacity" values="0.9;0;0.9" dur="1.4s" repeatCount="indefinite" begin="0.9s" />
                </circle>
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

function LegendItem({ dash, color, glow, label }: { dash: string; color: string; glow?: boolean; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <svg width="34" height="10" style={{ overflow: 'visible' }} aria-hidden>
        {glow && <line x1="0" y1="5" x2="34" y2="5" stroke={color} strokeOpacity="0.25" strokeWidth="5" strokeLinecap="round" />}
        <line x1="0" y1="5" x2="34" y2="5" stroke={color} strokeWidth={glow ? 2 : 1.4} strokeDasharray={dash} strokeLinecap="round" />
      </svg>
      <span>{label}</span>
    </span>
  );
}

// Node detail — rendered BENEATH the diagram so it never blocks the figure.
function DetailPanel({ node, t, onClose }: { node: TopoNode; t: TopologyTheme; onClose: () => void }) {
  const ts = node.tailnet;
  const myProxies = PROXY_GROUPS.filter((p) => p.node === node.label);
  const metaEntries = Object.entries(node.meta || {});
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{ marginTop: 16, background: t.panel, border: `1px solid ${t.ruleStrong}`, padding: '16px 18px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
        <div>
          <div style={{ fontFamily: t.fontLabel, fontSize: 10, color: t.accent, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            {node.tier} · {node.site === 'fl' ? '🇺🇸 FL' : '🇨🇴 MDE'}
          </div>
          <div style={{ fontFamily: t.fontDisplay, fontSize: 24, color: t.ink, marginTop: 4, lineHeight: 1 }}>{node.label}</div>
          <div style={{ fontFamily: t.fontBody, fontSize: 12, color: t.mute, marginTop: 4 }}>{node.sub}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close node details"
          style={{ background: 'transparent', border: 'none', color: t.dim, cursor: 'pointer', fontFamily: t.fontMono, fontSize: 11 }}
        >
          [ESC]
        </button>
      </div>

      <div
        style={{
          marginTop: 14,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {ts && (
          <div style={{ padding: '8px 10px', border: `1px solid ${t.ts}55`, background: t.tsBusBg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: t.ts, boxShadow: `0 0 6px ${t.ts}` }} />
              <span style={{ fontFamily: t.fontLabel, fontSize: 9, color: t.ts, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                tailnet
              </span>
            </div>
            <div style={{ fontFamily: t.fontMono, fontSize: 12, color: t.ink, marginTop: 4 }}>{ts.hostname} · tailnet</div>
            <div style={{ fontFamily: t.fontMono, fontSize: 11, color: t.mute, marginTop: 2 }}>
              {ts.ip} · {ts.tag}
            </div>
          </div>
        )}

        {metaEntries.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', columnGap: 10, rowGap: 6 }}>
            {metaEntries.map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.dim, letterSpacing: '0.12em', textTransform: 'uppercase', paddingTop: 1 }}>
                  {k}
                </div>
                <div style={{ fontFamily: t.fontBody, fontSize: 12, color: t.ink }}>{v}</div>
              </div>
            ))}
          </div>
        )}

        {myProxies.length > 0 && (
          <div>
            <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.dim, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>
              Tailscale ingress hosted here
            </div>
            {myProxies.map((p: ProxyGroup) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: tagColor(p.tag) }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: t.fontMono, fontSize: 11, color: t.ink }}>
                    {p.label} <span style={{ color: t.dim }}>· {p.kind}</span>
                  </div>
                  <div style={{ fontFamily: t.fontBody, fontSize: 11, color: t.mute }}>{p.services}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TopologyDiagram() {
  const { isRpg } = useTheme();
  const t = getTopologyTheme(isRpg);
  const animate = !usePrefersReducedMotion();

  const [selectedId, setSelected] = useState<string | null>(null);
  const [hoveredId, setHovered] = useState<string | null>(null);

  const nodeIndex = useMemo(() => Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<string, TopoNode>, []);
  const selected = selectedId ? nodeIndex[selectedId] : null;
  const devices = useMemo(() => tailnetDevices(), []);

  // Esc closes the detail panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggle = (id: string) => setSelected((prev) => (prev === id ? null : id));

  return (
    <TopologyThemeContext.Provider value={t}>
      <div style={{ position: 'relative', width: '100%', fontFamily: t.fontBody }}>
        {/* Figure caption / live meta */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            padding: '8px 0 10px',
            borderBottom: `1px solid ${t.rule}`,
            marginBottom: 8,
          }}
        >
          <span style={{ fontFamily: t.fontLabel, fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.accent }}>
            FIG. 01 — Geo-distributed K3s topology
          </span>
          <span style={{ display: 'flex', gap: 18, alignItems: 'center', fontFamily: t.fontMono, fontSize: 11, color: t.dim, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: t.accentLED,
                  boxShadow: `0 0 8px ${t.accentLED}`,
                  display: 'inline-block',
                }}
              />
              5 nodes online
            </span>
            <span>pod CIDR · 10.42.0.0/16</span>
            <span>etcd HA · cp1·cp2·cp3</span>
          </span>
        </div>

        <div className="overflow-x-auto -mx-2 px-2">
          <svg
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            className="w-full h-auto min-w-[900px]"
            style={{ display: 'block', background: t.bg, imageRendering: t.rendering }}
            shapeRendering={t.crt ? 'crispEdges' : 'auto'}
            role="img"
            aria-label="Homelab network topology diagram"
          >
            <defs>
              <pattern id="topo-bg-dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.7" fill={t.rule} opacity="0.55" />
              </pattern>
            </defs>
            <rect x="0" y="0" width={CANVAS_W} height={CANVAS_H} fill="url(#topo-bg-dots)" />

            {Object.values(SITES).map((s) => (
              <SiteBackground key={s.id} site={s} t={t} />
            ))}

            {Object.entries(TIERS).map(([k, tier], i) => (
              <TierLabel key={k} tier={tier} num={i + 1} t={t} />
            ))}

            <line
              x1={CANVAS_W / 2 - 20}
              y1="178"
              x2={CANVAS_W / 2 - 20}
              y2={CANVAS_H - 40}
              stroke="#1A1F19"
              strokeWidth="0.6"
              strokeDasharray="2 4"
            />

            <LinkLayer links={LINKS} nodeIndex={nodeIndex} show={{}} />

            {NODES.filter((n) => !n.hidden).map((n) => (
              <NodeCard
                key={n.id}
                node={n}
                isSelected={selectedId === n.id}
                isHovered={hoveredId === n.id}
                onSelect={toggle}
                onHover={setHovered}
                t={t}
                animate={animate}
              />
            ))}

            <EtcdBracket nodeIndex={nodeIndex} t={t} />
            <PingLayer selectedId={selectedId} nodeIndex={nodeIndex} t={t} animate={animate} />

            <TailscalePlane
              canvasW={CANVAS_W}
              mode="full"
              nodeIndex={nodeIndex}
              proxyGroups={PROXY_GROUPS}
              devices={devices}
              hoveredDeviceId={hoveredId}
              animate={animate}
            />
          </svg>
        </div>

        {/* Legend — HTML below the SVG so it scales with body text */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '14px 28px',
            padding: '12px 0 2px',
            borderTop: `1px solid ${t.rule}`,
            marginTop: 4,
            fontFamily: t.fontMono,
            fontSize: 11.5,
            color: t.mute,
            alignItems: 'center',
          }}
        >
          <span style={{ color: t.accent, letterSpacing: '0.18em' }}>LEGEND</span>
          <LegendItem dash="none" color={t.mute} label="LAN" />
          <LegendItem dash="none" color={t.storageLink} glow label="storage NIC · MTU 9000" />
          <LegendItem dash="2 3" color={t.accent} label="runs on (VM / k3s)" />
          <LegendItem dash="5 3" color={t.etcdLink} label="etcd quorum" />
          <LegendItem dash="4 4" color={t.ts} label="Tailscale overlay · WireGuard" />
          <span style={{ color: t.dim, marginLeft: 'auto' }}>Tap a node → details below + pulse along its links.</span>
        </div>

        {/* Detail panel — beneath the diagram */}
        <AnimatePresence>
          {selected && <DetailPanel key={selected.id} node={selected} t={t} onClose={() => setSelected(null)} />}
        </AnimatePresence>

        {/* RPG scanline overlay, scoped to the diagram */}
        {t.crt && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 3px)',
              mixBlendMode: 'multiply',
            }}
          />
        )}
      </div>
    </TopologyThemeContext.Provider>
  );
}

export default TopologyDiagram;
