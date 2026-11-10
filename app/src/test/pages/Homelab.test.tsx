import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Homelab from '../../pages/Homelab';

describe('Homelab Page', () => {
  it('renders the page heading', () => {
    render(<BrowserRouter><Homelab /></BrowserRouter>);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders service status section', () => {
    render(<BrowserRouter><Homelab /></BrowserRouter>);
    expect(screen.getByText('Plex')).toBeInTheDocument();
    expect(screen.getAllByText('Grafana').length).toBeGreaterThan(0);
  });

  it('renders the live map by default, and the reading guide only for the schematic', () => {
    render(<BrowserRouter><Homelab /></BrowserRouter>);
    expect(screen.getByRole('region', { name: /live map/i })).toBeInTheDocument();
    expect(screen.queryByText('Reading the diagram')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: '2D' }));
    expect(screen.getByRole('img', { name: /topology/i })).toBeInTheDocument();
    expect(screen.getByText('Reading the diagram')).toBeInTheDocument();
  });
});
