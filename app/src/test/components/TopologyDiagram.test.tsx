import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TopologyDiagram from '../../components/homelab/TopologyDiagram';
import { NODES, PROXY_GROUPS, SITES } from '../../components/homelab/topology/data';

describe('TopologyDiagram', () => {
  it('renders the diagram with current node names', () => {
    render(<TopologyDiagram />);
    expect(screen.getByRole('img', { name: /topology/i })).toBeInTheDocument();
    // Post-migration node names (not the old pve / pve-home1 / k3s-home2).
    expect(screen.getAllByText('fl-pve1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('mde-pve1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('mde-k3s-w1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('k3s-cp1').length).toBeGreaterThan(0);
    // MDE site gateway (UCG-Fiber, replaced the UCG Max in 2026-07).
    expect(screen.getAllByText('UCG-Fiber').length).toBeGreaterThan(0);
    // Post-2026-09-02 fleet: the Pi 5 is a worker, and mde-pve1 hosts TrueNAS.
    expect(screen.getAllByText('mde-k3s-w2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('mde-truenas').length).toBeGreaterThan(0);
  });

  // The page is public — the 2D model must not leak addresses either.
  it('carries no IP addresses or CIDRs', () => {
    const blob = JSON.stringify([NODES, PROXY_GROUPS, SITES]);
    expect(blob).not.toMatch(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  });

  it('reveals node detail beneath the diagram on click (not a floating popup)', () => {
    render(<TopologyDiagram />);
    // No detail panel until a node is selected.
    expect(screen.queryByLabelText('Close node details')).not.toBeInTheDocument();

    const node = screen.getByRole('button', { name: /fl-pve1: Lenovo P520/ });
    fireEvent.click(node);

    const close = screen.getByLabelText('Close node details');
    expect(close).toBeInTheDocument();

    // The panel renders AFTER the diagram in document order — i.e. beneath it,
    // rather than as an overlay that occludes the figure.
    const svg = screen.getByRole('img', { name: /topology/i });
    expect(svg.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
