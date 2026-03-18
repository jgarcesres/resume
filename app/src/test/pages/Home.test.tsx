import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Home from '../../pages/Home';

const renderWithRouter = (component: ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Home Page', () => {
  it('renders the page title from JSON content', () => {
    renderWithRouter(<Home />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders skill stat bars', () => {
    renderWithRouter(<Home />);
    // Skills are now rendered as stat bars with labels
    expect(screen.getByText('DevOps')).toBeInTheDocument();
    expect(screen.getByText('Automation')).toBeInTheDocument();
  });

  it('renders social links', () => {
    renderWithRouter(<Home />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(2);
  });
});
