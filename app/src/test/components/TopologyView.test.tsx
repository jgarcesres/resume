import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TopologyView from '../../components/homelab/TopologyView';
import { ThemeProvider } from '../../context/ThemeContext';
import { NODES, CHIPS } from '../../components/homelab/topology3d/data';

// jsdom has no WebGL, so stand in for the lazily-loaded three.js view.
vi.mock('../../components/homelab/topology3d/Topology3D', () => ({
  default: () => <div data-testid="topology-3d" />,
}));
vi.mock('../../components/homelab/topologyPixel/TopologyPixel', () => ({
  default: () => <div data-testid="topology-pixel" />,
}));

describe('TopologyView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the live map by default with a Live/2D/3D switch', () => {
    render(<TopologyView />);
    expect(screen.getByRole('region', { name: /live map/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Live' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByRole('img', { name: /topology/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('topology-3d')).not.toBeInTheDocument();
  });

  it('swaps to the 2D diagram when 2D is picked', () => {
    render(<TopologyView />);
    fireEvent.click(screen.getByRole('radio', { name: '2D' }));
    expect(screen.getByRole('img', { name: /topology/i })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /live map/i })).not.toBeInTheDocument();
  });

  it('swaps to the 3D scene when 3D is picked', async () => {
    render(<TopologyView />);
    fireEvent.click(screen.getByRole('radio', { name: '3D' }));
    expect(await screen.findByTestId('topology-3d')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /live map/i })).not.toBeInTheDocument();
  });

  it('swaps to the pixel-art scene when 3D is picked in RPG mode', async () => {
    localStorage.setItem('site-theme', 'rpg');
    render(<ThemeProvider><TopologyView /></ThemeProvider>);
    fireEvent.click(screen.getByRole('radio', { name: '3D' }));
    expect(await screen.findByTestId('topology-pixel')).toBeInTheDocument();
    expect(screen.queryByTestId('topology-3d')).not.toBeInTheDocument();
  });
});

describe('topology3d data', () => {
  const ids = new Set([...NODES, ...CHIPS].map(n => n.id));

  it('has unique ids and chips that point at real nodes', () => {
    expect(ids.size).toBe(NODES.length + CHIPS.length);
    for (const c of CHIPS) {
      for (const h of c.hosts) expect(ids).toContain(h);
      if (c.target) expect(ids).toContain(c.target);
    }
  });

  // The page is public — the model must not leak addresses.
  it('carries no IP addresses', () => {
    const blob = JSON.stringify([NODES, CHIPS]);
    expect(blob).not.toMatch(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    expect(blob).not.toMatch(/100\.x\.|192\.168\./);
  });
});
