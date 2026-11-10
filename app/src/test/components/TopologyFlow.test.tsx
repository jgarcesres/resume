import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TopologyFlow from '../../components/homelab/topologyFlow/TopologyFlow';
import {
  HULLS, LAYOUTS, NODES, SCENARIOS, STATIC_LINKS, HEARTBEATS, downAt, hopAllowed, nodeById, project,
} from '../../components/homelab/topologyFlow/data';
import { nodePos, siteOutline, tunnelMid } from '../../components/homelab/topologyFlow/engine';
import { LAND, isLandCell } from '../../components/homelab/topologyFlow/land';

// jsdom has no 2D canvas (see test/setup.ts): everything below runs on the DOM layer alone.

describe('topologyFlow data', () => {
  const ids = new Set(NODES.map(n => n.id));

  it('has unique node ids and one gateway per site', () => {
    expect(ids.size).toBe(NODES.length);
    for (const site of ['fl', 'mde'] as const) {
      expect(NODES.filter(n => n.site === site && n.kind === 'gateway')).toHaveLength(1);
    }
  });

  it('places every node inside both layouts', () => {
    for (const id of ['wide', 'tall'] as const) {
      const { w, h } = LAYOUTS[id];
      for (const n of NODES) {
        const [x, y] = nodePos(id, n);
        expect(x, `${n.id} x in ${id}`).toBeGreaterThan(0);
        expect(x, `${n.id} x in ${id}`).toBeLessThan(w);
        expect(y, `${n.id} y in ${id}`).toBeGreaterThan(0);
        expect(y, `${n.id} y in ${id}`).toBeLessThan(h);
      }
    }
  });

  it('keeps every VM inside the outline of its Proxmox host', () => {
    for (const n of NODES.filter(n => n.host)) {
      const hull = HULLS.find(h => h.id === n.host);
      expect(hull, `${n.id} host`).toBeDefined();
      expect(nodeById(n.host!).kind).toBe('host');
      for (const id of ['wide', 'tall'] as const) {
        const [hx, hy, hw, hh] = hull![id];
        const [x, y] = nodePos(id, n);
        expect(x > hx && x < hx + hw && y > hy && y < hy + hh, `${n.id} inside ${n.host} (${id})`).toBe(true);
      }
    }
  });

  it('only routes packets along hops that exist', () => {
    for (const s of SCENARIOS) {
      for (const step of s.steps) {
        expect(step.flows.length, `${s.id} / ${step.title}`).toBeGreaterThan(0);
        for (const flow of step.flows) {
          expect(flow.path.length).toBeGreaterThan(1);
          for (let i = 0; i < flow.path.length - 1; i++) {
            const a = nodeById(flow.path[i]), b = nodeById(flow.path[i + 1]);
            expect(hopAllowed(a, b), `${s.id} / ${step.title}: ${a.id} → ${b.id}`).toBe(true);
          }
        }
        for (const id of step.down ?? []) expect(ids).toContain(id);
      }
    }
    for (const l of STATIC_LINKS) { expect(ids).toContain(l.from); expect(ids).toContain(l.to); }
    for (const [a, b] of HEARTBEATS) { expect(ids).toContain(a); expect(ids).toContain(b); }
  });

  it('makes cross-site traffic go through both gateways', () => {
    expect(hopAllowed(nodeById('w1'), nodeById('k3s-pve'))).toBe(false);
    expect(hopAllowed(nodeById('viewer'), nodeById('k3s-pve'))).toBe(false);
    expect(hopAllowed(nodeById('mde-gw'), nodeById('fl-gw'))).toBe(true);
    expect(hopAllowed(nodeById('viewer'), nodeById('fl-gw'))).toBe(true);
  });

  it('keeps nodes powered off for the rest of a story', () => {
    const power = SCENARIOS.find(s => s.id === 'power')!;
    expect(downAt(power, 1).size).toBe(0);
    expect([...downAt(power, 2)].sort()).toEqual(['cp1', 'cp2', 'cp3']);
    expect(downAt(power, 3).has('cp1')).toBe(true);
  });

  // The page is public: the model must not leak addresses or names.
  it('carries no addresses, tailnet name or domains', () => {
    const blob = JSON.stringify([NODES, SCENARIOS]);
    expect(blob).not.toMatch(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    expect(blob).not.toMatch(/ts\.net|\.xyz|\.io\b|192\.168\.|100\.\d/);
  });
});

describe('topologyFlow geometry', () => {
  it('puts the gateways on land, at their sites', () => {
    for (const id of ['fl-gw', 'mde-gw']) {
      const [lon, lat] = nodeById(id).geo!;
      const row = Math.floor((LAND.lat1 - lat) / LAND.step), col = Math.floor((lon - LAND.lon0) / LAND.step);
      expect(isLandCell(row, col), id).toBe(true);
    }
    // Open ocean south of Bermuda.
    expect(isLandCell(Math.floor((LAND.lat1 - 28) / LAND.step), Math.floor((-60 - LAND.lon0) / LAND.step))).toBe(false);
  });

  it('covers both layouts with the land mask', () => {
    for (const layout of Object.values(LAYOUTS)) {
      expect(layout.lon0).toBeGreaterThanOrEqual(LAND.lon0);
      expect(layout.lon0 + layout.w / layout.ppd).toBeLessThanOrEqual(LAND.lon0 + LAND.cols * LAND.step);
      expect(layout.latTop).toBeLessThanOrEqual(LAND.lat1);
      expect(layout.latTop - layout.h / layout.ppd).toBeGreaterThanOrEqual(LAND.lat1 - LAND.rows * LAND.step);
    }
  });

  it('draws each site outline as a blob that reaches its gateway', () => {
    for (const id of ['wide', 'tall'] as const) {
      for (const site of ['fl', 'mde'] as const) {
        const outline = siteOutline(id, site, 24);
        const gw = project(LAYOUTS[id], ...nodeById(`${site}-gw`).geo!);
        expect(outline.length).toBeGreaterThan(8);
        expect(outline.some(([x, y]) => Math.hypot(x - gw[0], y - gw[1]) < 0.01)).toBe(true);
      }
      const [mx, my] = tunnelMid(id);
      expect(Number.isFinite(mx) && Number.isFinite(my)).toBe(true);
    }
  });
});

describe('TopologyFlow', () => {
  it('starts on the first story and steps through it', () => {
    render(<TopologyFlow />);
    const first = SCENARIOS[0];
    expect(screen.getByRole('button', { name: new RegExp(first.title) })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: first.steps[0].title })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(screen.getByRole('heading', { name: first.steps[1].title })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous step' }));
    expect(screen.getByRole('heading', { name: first.steps[0].title })).toBeInTheDocument();
  });

  it('wraps from the last step of a story into the next one', () => {
    render(<TopologyFlow />);
    for (let i = 0; i < SCENARIOS[0].steps.length; i++) fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(screen.getByRole('button', { name: new RegExp(SCENARIOS[1].title) })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: SCENARIOS[1].steps[0].title })).toBeInTheDocument();
  });

  it('switches story from the picker and shows its caption', () => {
    render(<TopologyFlow />);
    const power = SCENARIOS.find(s => s.id === 'power')!;
    fireEvent.click(screen.getByRole('button', { name: new RegExp(power.title) }));
    expect(screen.getByRole('heading', { name: power.steps[0].title })).toBeInTheDocument();
    expect(screen.getByText(power.steps[0].text)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `Step 3: ${power.steps[2].title}` }));
    expect(screen.getByText(power.steps[2].text)).toBeInTheDocument();
  });

  it('opens a fact card for a machine and closes it with Escape', () => {
    // jsdom reports no layout, so give the stage a width to place labels in.
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 960 });
    try {
      render(<TopologyFlow />);
      const node = nodeById('cp3');
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${node.label}:`) }));
      const card = screen.getByRole('dialog', { name: `${node.label} details` });
      expect(within(card).getByText(node.sub)).toBeInTheDocument();
      expect(within(card).getByText(node.facts[0][1])).toBeInTheDocument();
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    } finally {
      delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
    }
  });
});
