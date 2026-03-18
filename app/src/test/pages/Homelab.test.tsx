import { render, screen } from '@testing-library/react';
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

  it('renders topology diagram', () => {
    render(<BrowserRouter><Homelab /></BrowserRouter>);
    expect(screen.getByRole('img', { name: /topology/i })).toBeInTheDocument();
  });
});
