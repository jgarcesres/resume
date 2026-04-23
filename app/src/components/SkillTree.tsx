import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import skillTreeData from '@resources/skill_tree.json';
import { useTheme } from '../context/ThemeContext';
import SkillTreeParticles, { type PointerState } from './SkillTreeParticles';

// ── Types ──

interface SkillNode {
  id: string;
  label: string;
  category: string;
  level: number;
  description: string;
}

interface SkillEdge {
  from: string;
  to: string;
}

interface SimNode extends SkillNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  depth: number;
  revealAt: number; // ms from mount
}

// ── Palettes ──

// RPG: saturated neons — matches cyberpunk CRT theme.
const RPG_COLORS: Record<string, string> = {
  root: '#ffd700',
  cloud: '#4d8cff',
  devops: '#00e5ff',
  monitoring: '#39ff14',
  security: '#ff2daa',
  languages: '#ff8c00',
  networking: '#e74cff',
  ai: '#ff6b6b',
};

// Professional: editorial palette derived from index.css tokens. Fern green
// as the primary accent, warm gold and muted earth tones for categories.
const PRO_COLORS: Record<string, string> = {
  root: '#E8B339',
  cloud: '#5FA97B',
  devops: '#7FC4A0',
  monitoring: '#3FD771',
  security: '#E5484D',
  languages: '#C88F4A',
  networking: '#9B7FB8',
  ai: '#D4A5A5',
};

function getCategoryColor(palette: Record<string, string>, category: string): string {
  return palette[category] || '#c8d6e5';
}

// ── Graph helpers ──

function computeDepths(nodes: SkillNode[], edges: SkillEdge[]): Map<string, number> {
  const depths = new Map<string, number>();
  depths.set('root', 0);
  const queue: string[] = ['root'];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const d = depths.get(id)!;
    for (const edge of edges) {
      let neighbor: string | null = null;
      if (edge.from === id && !depths.has(edge.to)) neighbor = edge.to;
      else if (edge.to === id && !depths.has(edge.from)) neighbor = edge.from;
      if (neighbor) {
        depths.set(neighbor, d + 1);
        queue.push(neighbor);
      }
    }
  }
  const orphans: string[] = [];
  for (const n of nodes) {
    if (!depths.has(n.id)) {
      depths.set(n.id, 99);
      orphans.push(n.id);
    }
  }
  if (orphans.length > 0) {
    console.warn(
      `[SkillTree] ${orphans.length} orphan node(s) with no path from root — they will be revealed last:`,
      orphans,
    );
  }
  return depths;
}

// ── Force simulation ──

function initPositions(
  nodes: SkillNode[],
  edges: SkillEdge[],
  depths: Map<string, number>,
  width: number,
  height: number,
): SimNode[] {
  const cx = width / 2;
  const cy = height / 2;
  const categoryAngles: Record<string, number> = {};
  const categories = [...new Set(nodes.filter(n => n.category !== 'root').map(n => n.category))];
  categories.forEach((cat, i) => {
    categoryAngles[cat] = (i / categories.length) * Math.PI * 2 - Math.PI / 2;
  });

  const DEPTH_STAGGER_MS = 140;
  const JITTER_MS = 90;

  return nodes.map((node) => {
    let x: number, y: number;
    if (node.id === 'root') {
      x = cx;
      y = cy;
    } else {
      const angle = categoryAngles[node.category] || 0;
      const isParent = nodes.some(n => n.id !== node.id && n.category === node.category &&
        edges.some(e => e.from === node.id && e.to === n.id));
      const dist = isParent ? 140 : 240 + Math.random() * 40;
      x = cx + Math.cos(angle) * dist + (Math.random() - 0.5) * 60;
      y = cy + Math.sin(angle) * dist + (Math.random() - 0.5) * 60;
    }
    const radius = node.id === 'root' ? 32 : (node.level >= 85 ? 24 : 18);
    const depth = depths.get(node.id) ?? 99;
    const revealAt = depth * DEPTH_STAGGER_MS + Math.random() * JITTER_MS;
    return { ...node, x, y, vx: 0, vy: 0, radius, depth, revealAt };
  });
}

function simulate(nodes: SimNode[], edges: SkillEdge[], width: number, height: number) {
  const cx = width / 2;
  const cy = height / 2;
  const REPULSION = 3000;
  const SPRING = 0.005;
  const SPRING_LENGTH = 120;
  const DAMPING = 0.85;
  const CENTER_PULL = 0.001;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = REPULSION / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx -= fx; a.vy -= fy;
      b.vx += fx; b.vy += fy;
    }
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  for (const edge of edges) {
    const a = nodeMap.get(edge.from);
    const b = nodeMap.get(edge.to);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const force = (dist - SPRING_LENGTH) * SPRING;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    a.vx += fx; a.vy += fy;
    b.vx -= fx; b.vy -= fy;
  }

  for (const node of nodes) {
    if (node.id === 'root') {
      node.x = cx; node.y = cy;
      node.vx = 0; node.vy = 0;
      continue;
    }
    node.vx += (cx - node.x) * CENTER_PULL;
    node.vy += (cy - node.y) * CENTER_PULL;
    node.vx *= DAMPING;
    node.vy *= DAMPING;
    node.x += node.vx;
    node.y += node.vy;

    const pad = node.radius + 10;
    node.x = Math.max(pad, Math.min(width - pad, node.x));
    node.y = Math.max(pad, Math.min(height - pad, node.y));
  }
}

// ── Drawing ──

const GROW_MS = 420;
const EDGE_GROW_MS = 320;

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface DrawStyle {
  palette: Record<string, string>;
  isRpg: boolean;
  nodeFill: string;
  nodeFillDim: string;
  edgeBase: string; // default (unhovered) edge color
  labelColor: string;
  labelDim: string;
  labelFont: string;
  levelFont: string;
  edgeLineWidth: number;
  edgeHighlightWidth: number;
  nodeLineWidth: number;
  showEdgeParticle: boolean;
  showLevelText: boolean;
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  nodes: SimNode[],
  edges: SkillEdge[],
  hoveredId: string | null,
  width: number,
  height: number,
  time: number,
  elapsed: number,
  dpr: number,
  style: DrawStyle,
) {
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Edges — each draws progressively from parent (lower depth) to child.
  for (const edge of edges) {
    const a = nodeMap.get(edge.from);
    const b = nodeMap.get(edge.to);
    if (!a || !b) continue;

    const parent = a.depth <= b.depth ? a : b;
    const child = a.depth <= b.depth ? b : a;
    const edgeStart = Math.max(parent.revealAt, child.revealAt - 120);
    const edgeProgress = Math.max(0, Math.min(1, (elapsed - edgeStart) / EDGE_GROW_MS));
    if (edgeProgress <= 0) continue;
    const drawT = easeOutCubic(edgeProgress);

    const isHighlighted = hoveredId && (edge.from === hoveredId || edge.to === hoveredId);
    const color = getCategoryColor(style.palette, parent.category);

    const endX = parent.x + (child.x - parent.x) * drawT;
    const endY = parent.y + (child.y - parent.y) * drawT;

    ctx.beginPath();
    ctx.moveTo(parent.x, parent.y);
    ctx.lineTo(endX, endY);
    if (isHighlighted) {
      ctx.strokeStyle = color;
      ctx.lineWidth = style.edgeHighlightWidth;
    } else {
      ctx.strokeStyle = style.isRpg ? `${color}33` : style.edgeBase;
      ctx.lineWidth = style.edgeLineWidth;
    }
    ctx.stroke();

    // RPG-only animated particle along hovered edge (pro stays quiet).
    if (isHighlighted && style.showEdgeParticle && edgeProgress >= 1) {
      const t = (time * 0.001) % 1;
      const px = parent.x + (child.x - parent.x) * t;
      const py = parent.y + (child.y - parent.y) * t;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  // Nodes
  for (const node of nodes) {
    const nodeProgress = Math.max(0, Math.min(1, (elapsed - node.revealAt) / GROW_MS));
    if (nodeProgress <= 0) continue;
    const scale = easeOutBack(nodeProgress);
    const drawRadius = node.radius * Math.max(0, scale);

    const color = getCategoryColor(style.palette, node.category);
    const isHovered = node.id === hoveredId;
    const isConnected = hoveredId && edges.some(
      e => (e.from === hoveredId && e.to === node.id) || (e.to === hoveredId && e.from === node.id)
    );
    const dimmed = hoveredId && !isHovered && !isConnected && hoveredId !== node.id;

    // Ambient glow — subtle on pro, pulsing on rpg.
    if (isHovered || node.id === 'root') {
      const pulse = style.isRpg
        ? (Math.sin(time * 0.003) * 0.3 + 0.7)
        : 0.55;
      ctx.beginPath();
      ctx.arc(node.x, node.y, drawRadius + 10, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(
        node.x, node.y, drawRadius,
        node.x, node.y, drawRadius + (style.isRpg ? 14 : 18),
      );
      const hexAlpha = style.isRpg
        ? (isHovered ? '66' : '33')
        : (isHovered ? '40' : '22');
      grad.addColorStop(0, `${color}${hexAlpha}`);
      grad.addColorStop(1, `${color}00`);
      ctx.fillStyle = grad;
      ctx.globalAlpha = pulse * nodeProgress;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Node disc
    ctx.beginPath();
    ctx.arc(node.x, node.y, drawRadius, 0, Math.PI * 2);
    ctx.fillStyle = dimmed ? style.nodeFillDim : style.nodeFill;
    ctx.fill();
    ctx.strokeStyle = dimmed ? `${color}44` : color;
    ctx.lineWidth = node.id === 'root' ? style.nodeLineWidth + 1 : style.nodeLineWidth;
    ctx.stroke();

    // Level arc: fills clockwise as reveal completes, then stays at level %.
    if (!dimmed) {
      const arcProgress = Math.min(1, nodeProgress * 1.15);
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (node.level / 100) * Math.PI * 2 * arcProgress;
      if (endAngle > startAngle + 0.01) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, drawRadius + 3, startAngle, endAngle);
        ctx.strokeStyle = `${color}88`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Label — fade in with node
    const labelAlpha = Math.min(1, (nodeProgress - 0.2) / 0.6);
    if (labelAlpha > 0) {
      ctx.globalAlpha = labelAlpha;
      const fontSize = node.id === 'root' ? 10 : 8;
      ctx.font = `${fontSize}px ${style.labelFont}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = dimmed ? style.labelDim : style.labelColor;
      ctx.fillText(node.label, node.x, node.y);

      if (!dimmed && node.id !== 'root' && style.showLevelText) {
        ctx.font = `7px ${style.levelFont}`;
        ctx.fillStyle = `${color}aa`;
        ctx.fillText(`Lv.${node.level}`, node.x, node.y + drawRadius + 14);
      }
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
}

function styleForTheme(isRpg: boolean): DrawStyle {
  if (isRpg) {
    return {
      palette: RPG_COLORS,
      isRpg: true,
      nodeFill: '#0f1628',
      nodeFillDim: '#141c33',
      edgeBase: '#ffffff22', // unused — RPG uses per-edge tint with alpha
      labelColor: '#e8f0ff',
      labelDim: '#6b7fa355',
      labelFont: '"Press Start 2P", monospace',
      levelFont: '"Press Start 2P", monospace',
      edgeLineWidth: 1,
      edgeHighlightWidth: 2,
      nodeLineWidth: 2,
      showEdgeParticle: true,
      showLevelText: true,
    };
  }
  return {
    palette: PRO_COLORS,
    isRpg: false,
    nodeFill: '#111411',
    nodeFillDim: '#0E120E',
    edgeBase: '#22261F',
    labelColor: '#E8E4DA',
    labelDim: '#7A7D7255',
    labelFont: '500 10px "JetBrains Mono", ui-monospace, monospace',
    levelFont: '500 8px "JetBrains Mono", ui-monospace, monospace',
    edgeLineWidth: 1,
    edgeHighlightWidth: 1.5,
    nodeLineWidth: 1.5,
    showEdgeParticle: false,
    showLevelText: false,
  };
}

// ── Component ──

interface SkillTreeProps {
  className?: string;
}

function SkillTree({ className = '' }: SkillTreeProps) {
  const { isRpg } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const hoveredIdRef = useRef<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const rafRef = useRef<number>(0);
  const sizeRef = useRef({ width: 800, height: 600 });
  const simulationSettled = useRef(false);
  const pointerRef = useRef<PointerState>({ x: 0, y: 0, active: false });
  const revealProgressRef = useRef(0);
  const isRpgRef = useRef(isRpg);
  const mountTimeRef = useRef<number>(0);

  // Keep the theme ref up to date so WebGPU frame callbacks see fresh values.
  useEffect(() => {
    isRpgRef.current = isRpg;
  }, [isRpg]);

  const depths = useMemo(
    () => computeDepths(skillTreeData.nodes as SkillNode[], skillTreeData.edges as SkillEdge[]),
    [],
  );
  const maxDepth = useMemo(() => {
    let max = 0;
    depths.forEach((d) => { if (d !== 99 && d > max) max = d; });
    return max;
  }, [depths]);
  const totalRevealMs = (maxDepth + 1) * 140 + GROW_MS + 120;

  const getCanvasSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { width: 800, height: 600 };
    return { width: el.clientWidth, height: Math.min(el.clientWidth * 0.75, 600) };
  }, []);

  useEffect(() => {
    hoveredIdRef.current = hoveredNode?.id ?? null;
  }, [hoveredNode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = getCanvasSize();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    sizeRef.current = { width, height };

    const nodes = initPositions(
      skillTreeData.nodes as SkillNode[],
      skillTreeData.edges as SkillEdge[],
      depths,
      width,
      height,
    );
    nodesRef.current = nodes;

    // Settle positions off-screen before reveal begins.
    for (let i = 0; i < 200; i++) {
      simulate(nodes, skillTreeData.edges as SkillEdge[], width, height);
    }
    simulationSettled.current = true;

    mountTimeRef.current = performance.now();
    let frameCount = 0;

    const frame = (time: number) => {
      const { width: w, height: h } = sizeRef.current;
      frameCount++;

      const elapsed = time - mountTimeRef.current;
      revealProgressRef.current = Math.max(0, Math.min(1, elapsed / totalRevealMs));

      if (!simulationSettled.current && frameCount % 3 === 0) {
        simulate(nodes, skillTreeData.edges as SkillEdge[], w, h);
        let energy = 0;
        for (const node of nodes) energy += node.vx * node.vx + node.vy * node.vy;
        if (energy < 0.01) simulationSettled.current = true;
      }

      const style = styleForTheme(isRpgRef.current);
      drawTree(
        ctx,
        nodes,
        skillTreeData.edges as SkillEdge[],
        hoveredIdRef.current,
        w,
        h,
        time,
        elapsed,
        dpr,
        style,
      );
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);

    const handleResize = () => {
      const oldW = sizeRef.current.width;
      const oldH = sizeRef.current.height;
      const { width: w, height: h } = getCanvasSize();
      const d = window.devicePixelRatio || 1;
      canvas.width = w * d;
      canvas.height = h * d;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      if (oldW > 0 && oldH > 0) {
        const sx = w / oldW;
        const sy = h / oldH;
        for (const node of nodes) {
          node.x *= sx;
          node.y *= sy;
        }
      }
      sizeRef.current = { width: w, height: h };
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [getCanvasSize, depths, totalRevealMs]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    pointerRef.current = { x, y, active: true };

    const nodes = nodesRef.current;
    let found: SimNode | null = null;
    for (const node of nodes) {
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy < (node.radius + 6) * (node.radius + 6)) {
        found = node;
        break;
      }
    }
    setHoveredNode(found);
  }, []);

  const handlePointerLeave = useCallback(() => {
    pointerRef.current = { ...pointerRef.current, active: false };
    setHoveredNode(null);
  }, []);

  // Tooltip position with edge clamping
  const tooltipStyle = hoveredNode ? (() => {
    const containerW = containerRef.current?.clientWidth ?? 800;
    const containerH = containerRef.current?.clientHeight ?? 600;
    const tooltipH = 100;
    const left = Math.min(hoveredNode.x, containerW - 240);
    let top = hoveredNode.y + hoveredNode.radius + 20;
    if (top + tooltipH > containerH) {
      top = hoveredNode.y - hoveredNode.radius - tooltipH - 10;
    }
    return { left, top: Math.max(0, top) };
  })() : null;

  const palette = isRpg ? RPG_COLORS : PRO_COLORS;

  const skillSummary = (skillTreeData.nodes as SkillNode[])
    .filter(n => n.id !== 'root')
    .map(n => `${n.label} (Lv.${n.level})`)
    .join(', ');

  const tooltipClass = isRpg
    ? 'absolute pointer-events-none rpg-border p-3 max-w-[220px] z-10'
    : 'absolute pointer-events-none pro-panel p-3 max-w-[220px] z-10';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <SkillTreeParticles
        sizeRef={sizeRef}
        nodesRef={nodesRef as unknown as React.MutableRefObject<{ id: string; x: number; y: number }[]>}
        edges={skillTreeData.edges as SkillEdge[]}
        pointerRef={pointerRef}
        revealProgressRef={revealProgressRef}
        isRpgRef={isRpgRef}
      />
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="relative w-full cursor-crosshair"
        role="img"
        aria-label="Interactive skill tree showing technical skills organized by category with proficiency levels"
        style={{ imageRendering: isRpg ? 'pixelated' : 'auto' }}
      >
        <p>Skill tree: {skillSummary}</p>
      </canvas>

      {hoveredNode && tooltipStyle && (
        <div className={tooltipClass} style={tooltipStyle}>
          <div
            className="font-pixel text-[8px] uppercase tracking-wider mb-1"
            style={{ color: getCategoryColor(palette, hoveredNode.category) }}
          >
            {hoveredNode.category}
          </div>
          <div className="font-pixel text-[10px] text-rpg-text-bright mb-1">
            {hoveredNode.label}
            {hoveredNode.id !== 'root' && (
              <span className="text-neon-gold ml-2">Lv.{hoveredNode.level}</span>
            )}
          </div>
          <div className="font-body text-[11px] text-rpg-text-dim leading-relaxed">
            {hoveredNode.description}
          </div>
          {hoveredNode.id !== 'root' && (
            <div className="mt-2 h-1.5 bg-rpg-void rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all duration-500"
                style={{
                  width: `${hoveredNode.level}%`,
                  backgroundColor: getCategoryColor(palette, hoveredNode.category),
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
        {Object.entries(palette)
          .filter(([key]) => key !== 'root')
          .map(([category, color]) => (
            <div key={category} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="font-pixel text-[7px] text-rpg-text-dim uppercase">{category}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

export default SkillTree;
