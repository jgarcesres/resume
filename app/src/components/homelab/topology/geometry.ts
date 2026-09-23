// geometry.ts — pure path/anchor math for the topology diagram. Kept separate
// from the rendering components so it can be shared (links + ping layer)
// without tripping react-refresh's only-export-components rule.

import type { TopoNode } from './data';

export interface Point {
  x: number;
  y: number;
}

// Attachment point on a card's perimeter for a link toward `target`. Snaps to
// the top/bottom/left/right edge midpoint depending on relative direction.
export function anchorPoint(node: TopoNode, target: TopoNode): Point {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const tcx = target.x + target.w / 2;
  const tcy = target.y + target.h / 2;
  const dx = tcx - cx;
  const dy = tcy - cy;
  // Vertical-dominant
  if (Math.abs(dy) * (node.w / Math.max(1, node.h)) > Math.abs(dx)) {
    return { x: cx, y: dy > 0 ? node.y + node.h : node.y };
  }
  return { x: dx > 0 ? node.x + node.w : node.x, y: cy };
}

// Orthogonal "elbow" path — cleaner than straight diagonals for grid-aligned
// cards.
export function pathBetween(a: Point, b: Point): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dy) < 4) return `M${a.x},${a.y} L${b.x},${b.y}`;
  if (Math.abs(dx) < 4) return `M${a.x},${a.y} L${b.x},${b.y}`;
  const r = Math.min(10, Math.abs(dy) / 2, Math.abs(dx) / 2);
  const sgnX = dx > 0 ? 1 : -1;
  const sgnY = dy > 0 ? 1 : -1;
  return `M${a.x},${a.y} L${a.x},${b.y - sgnY * r} Q${a.x},${b.y} ${a.x + sgnX * r},${b.y} L${b.x},${b.y}`;
}
