import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import Navbar from '../../components/Navbar';
import { ThemeProvider } from '../../context/ThemeContext';

function renderNavbar() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <Navbar shaderPreset="crt" onShaderPresetChange={() => {}} />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('Navbar shader selector visibility', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = '';
  });

  it('hides the shader selector in professional mode', () => {
    renderNavbar();
    expect(screen.queryByLabelText(/shader overlay/i)).toBeNull();
  });

  it('shows the shader selector in rpg mode', () => {
    localStorage.setItem('site-theme', 'rpg');
    renderNavbar();
    // Desktop + mobile variants both render the selector; either is proof that
    // the RPG branch is active.
    const selectors = screen.getAllByLabelText(/shader overlay/i);
    expect(selectors.length).toBeGreaterThan(0);
    expect((selectors[0] as HTMLSelectElement).tagName).toBe('SELECT');
  });
});
