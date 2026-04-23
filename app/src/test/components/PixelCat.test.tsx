import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import PixelCat from '../../components/PixelCat';
import { ThemeProvider } from '../../context/ThemeContext';

describe('PixelCat', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = '';
  });

  const renderCat = () =>
    render(
      <ThemeProvider>
        <PixelCat />
      </ThemeProvider>
    );

  it('advertises pixel-mode unlock in pro mode', () => {
    renderCat();
    expect(screen.getByRole('button', { name: 'unlock pixel mode' })).toBeInTheDocument();
  });

  it('first click switches theme to rpg, second click shows Nya~!', () => {
    renderCat();
    const cat = screen.getByRole('button', { name: 'unlock pixel mode' });

    act(() => {
      fireEvent.click(cat);
    });

    expect(document.documentElement.dataset.theme).toBe('rpg');
    expect(localStorage.getItem('site-theme')).toBe('rpg');

    // After switching, the button re-labels; we re-query for the rpg-mode handle.
    const rpgCat = screen.getByRole('button', { name: 'meow' });
    act(() => {
      fireEvent.click(rpgCat);
    });

    expect(document.documentElement.dataset.theme).toBe('rpg');
    expect(screen.getByText('Nya~!')).toBeInTheDocument();
  });
});
