import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Home from '../../pages/Home';

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Home Page', () => {
  it('renders the page title from JSON content', () => {
    renderWithRouter(<Home />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders skill cards', () => {
    renderWithRouter(<Home />);
    // Should render at least one skill card
    const skillHeadings = screen.getAllByRole('heading', { level: 3 });
    expect(skillHeadings.length).toBeGreaterThan(0);
  });

  it('renders social links', () => {
    renderWithRouter(<Home />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(2);
  });
});
