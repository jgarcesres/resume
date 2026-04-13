import { useEffect, useRef, useState, useCallback } from 'react';
import skillTreeData from '@resources/skill_tree.json';

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
  targetX?: number;
  targetY?: number;
}

// ── Colors ──

const CATEGORY_COLORS: Record<string, string> = {
  root: '#ffd700',
  cloud: '#4d8cff',
  devops: '#00e5ff',
  monitoring: '#39ff14',
  security: '#ff2daa',
  languages: '#ff8c00',
  networking: '#e74cff',
  ai: '#ff6b6b',
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '#c8d6e5';
}

// ── Force simulation ──

function initPositions(nodes: SkillNode[], width: number, height: number): SimNode[] {
  const cx = width / 2;
  const cy = height / 2;
  const categoryAngles: Record<string, number> = {};
  const categories = [...new Set(nodes.filter(n => n.category !== 'root').map(n => n.category))];
  categories.forEach((cat, i) => {
    categoryAngles[cat] = (i / categories.length) * Math.PI * 2 - Math.PI / 2;
  });

  return nodes.map((node) => {
    let x: number, y: number;
    if (node.id === 'root') {
      x = cx;
      y = cy;
    } else {
      const angle = categoryAngles[node.category] || 0;
      const isParent = nodes.some(n => n.id !== node.id && n.category === node.category &&
        skillTreeData.edges.some(e => e.from === node.id && e.to === n.id));
      const dist = isParent ? 140 : 240 + Math.random() * 40;
      x = cx + Math.cos(angle) * dist + (Math.random() - 0.5) * 60;
      y = cy + Math.sin(angle) * dist + (Math.random() - 0.5) * 60;
    }
    const radius = node.id === 'root' ? 32 : (node.level >= 85 ? 24 : 18);
    return { ...node, x, y, vx: 0, vy: 0, radius, targetX: x, targetY: y };
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

  // Repulsion between all node pairs
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

  // Spring forces along edges
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

  // Center pull + update positions
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

    // Keep in bounds
    const pad = node.radius + 10;
    node.x = Math.max(pad, Math.min(width - pad, node.x));
    node.y = Math.max(pad, Math.min(height - pad, node.y));
  }
}

// ── Drawing ──

function drawTree(
  ctx: CanvasRenderingContext2D,
  nodes: SimNode[],
  edges: SkillEdge[],
  hoveredId: string | null,
  width: number,
  height: number,
  time: number,
  dpr: number,
) {
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Draw edges
  for (const edge of edges) {
    const a = nodeMap.get(edge.from);
    const b = nodeMap.get(edge.to);
    if (!a || !b) continue;

    const isHighlighted = hoveredId && (edge.from === hoveredId || edge.to === hoveredId);
    const color = getCategoryColor(a.category);

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = isHighlighted ? color : `${color}33`;
    ctx.lineWidth = isHighlighted ? 2 : 1;
    ctx.stroke();

    // Animated particle along edge when highlighted
    if (isHighlighted) {
      const t = (time * 0.001) % 1;
      const px = a.x + (b.x - a.x) * t;
      const py = a.y + (b.y - a.y) * t;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  // Draw nodes
  for (const node of nodes) {
    const color = getCategoryColor(node.category);
    const isHovered = node.id === hoveredId;
    const isConnected = hoveredId && edges.some(
      e => (e.from === hoveredId && e.to === node.id) || (e.to === hoveredId && e.from === node.id)
    );
    const dimmed = hoveredId && !isHovered && !isConnected && hoveredId !== node.id;

    // Glow
    if (isHovered || node.id === 'root') {
      const pulse = Math.sin(time * 0.003) * 0.3 + 0.7;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(
        node.x, node.y, node.radius,
        node.x, node.y, node.radius + 12,
      );
      grad.addColorStop(0, `${color}${isHovered ? '66' : '33'}`);
      grad.addColorStop(1, `${color}00`);
      ctx.fillStyle = grad;
      ctx.globalAlpha = pulse;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = dimmed ? '#141c33' : '#0f1628';
    ctx.fill();
    ctx.strokeStyle = dimmed ? `${color}44` : color;
    ctx.lineWidth = node.id === 'root' ? 3 : 2;
    ctx.stroke();

    // Level arc (fills clockwise based on level %)
    if (!dimmed) {
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (node.level / 100) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + 3, startAngle, endAngle);
      ctx.strokeStyle = `${color}88`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Label
    const fontSize = node.id === 'root' ? 9 : 7;
    ctx.font = `${fontSize}px "Press Start 2P", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = dimmed ? '#6b7fa355' : '#e8f0ff';
    ctx.fillText(node.label, node.x, node.y);

    // Level text below
    if (!dimmed && node.id !== 'root') {
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillStyle = `${color}aa`;
      ctx.fillText(`Lv.${node.level}`, node.x, node.y + node.radius + 14);
    }
  }

  ctx.restore();
}

// ── Component ──

interface SkillTreeProps {
  className?: string;
}

function SkillTree({ className = '' }: SkillTreeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const hoveredIdRef = useRef<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const rafRef = useRef<number>(0);
  const sizeRef = useRef({ width: 800, height: 600 });
  const simulationSettled = useRef(false);

  const getCanvasSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { width: 800, height: 600 };
    return { width: el.clientWidth, height: Math.min(el.clientWidth * 0.75, 600) };
  }, []);

  // Keep hoveredId ref in sync without triggering effect re-runs
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

    const nodes = initPositions(skillTreeData.nodes as SkillNode[], width, height);
    nodesRef.current = nodes;

    // Run simulation for initial settling
    for (let i = 0; i < 200; i++) {
      simulate(nodes, skillTreeData.edges, width, height);
    }
    simulationSettled.current = true;

    let frameCount = 0;

    const frame = (time: number) => {
      const { width: w, height: h } = sizeRef.current;
      frameCount++;

      // Run simulation until settled, then stop
      if (!simulationSettled.current && frameCount % 3 === 0) {
        simulate(nodes, skillTreeData.edges, w, h);
        // Check if kinetic energy is low enough to stop
        let energy = 0;
        for (const node of nodes) {
          energy += node.vx * node.vx + node.vy * node.vy;
        }
        if (energy < 0.01) {
          simulationSettled.current = true;
        }
      }

      drawTree(ctx, nodes, skillTreeData.edges, hoveredIdRef.current, w, h, time, dpr);
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

      // Scale node positions proportionally
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
  }, [getCanvasSize]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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

  const handlePointerLeave = useCallback(() => setHoveredNode(null), []);

  // Compute tooltip position with vertical clamping
  const tooltipStyle = hoveredNode ? (() => {
    const containerW = containerRef.current?.clientWidth ?? 800;
    const containerH = containerRef.current?.clientHeight ?? 600;
    const tooltipH = 100; // approximate tooltip height
    const left = Math.min(hoveredNode.x, containerW - 240);
    let top = hoveredNode.y + hoveredNode.radius + 20;
    // Flip above node if it would overflow bottom
    if (top + tooltipH > containerH) {
      top = hoveredNode.y - hoveredNode.radius - tooltipH - 10;
    }
    return { left, top: Math.max(0, top) };
  })() : null;

  // Build accessible skill summary for screen readers
  const skillSummary = (skillTreeData.nodes as SkillNode[])
    .filter(n => n.id !== 'root')
    .map(n => `${n.label} (Lv.${n.level})`)
    .join(', ');

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="w-full cursor-crosshair"
        role="img"
        aria-label="Interactive skill tree showing technical skills organized by category with proficiency levels"
        style={{ imageRendering: 'auto' }}
      >
        {/* Fallback for screen readers */}
        <p>Skill tree: {skillSummary}</p>
      </canvas>
      {/* Tooltip */}
      {hoveredNode && tooltipStyle && (
        <div
          className="absolute pointer-events-none rpg-border p-3 max-w-[220px] z-10"
          style={tooltipStyle}
        >
          <div className="font-pixel text-[8px] uppercase tracking-wider mb-1"
            style={{ color: getCategoryColor(hoveredNode.category) }}>
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
          {/* Mini stat bar */}
          {hoveredNode.id !== 'root' && (
            <div className="mt-2 h-1.5 bg-rpg-void rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all duration-500"
                style={{
                  width: `${hoveredNode.level}%`,
                  backgroundColor: getCategoryColor(hoveredNode.category),
                }}
              />
            </div>
          )}
        </div>
      )}
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
        {Object.entries(CATEGORY_COLORS)
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
