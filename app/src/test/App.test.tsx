import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '../App';
import { ThemeProvider } from '../context/ThemeContext';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = '';
  });

  it('renders without crashing', () => {
    render(<App />);
    expect(document.querySelector('nav')).toBeInTheDocument();
  });

  it('renders the home page by default', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('Navbar pixel-mode toggle flips theme, swaps labels, and persists', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );

    // Pro mode default: "Projects" label in navbar, no "Quests" yet.
    expect(screen.getAllByText('Projects').length).toBeGreaterThan(0);
    expect(screen.queryByText('Quests')).toBeNull();

    const toggle = screen.getByTitle('Enter pixel mode');
    act(() => {
      fireEvent.click(toggle);
    });

    expect(document.documentElement.dataset.theme).toBe('rpg');
    expect(localStorage.getItem('site-theme')).toBe('rpg');
    expect(screen.getAllByText('Quests').length).toBeGreaterThan(0);
  });
});
