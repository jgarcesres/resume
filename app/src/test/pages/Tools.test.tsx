import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import Tools from '../../pages/Tools';
import { ThemeProvider } from '../../context/ThemeContext';

function renderTools() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <Tools />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('Tools page', () => {
  beforeEach(() => localStorage.clear());

  it('links to the PDF unlock tool', () => {
    renderTools();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tools');
    expect(screen.getByRole('link', { name: /pdf unlock/i })).toHaveAttribute('href', '/tools/pdf-unlock');
  });

  it('uses RPG naming in RPG mode', () => {
    localStorage.setItem('site-theme', 'rpg');
    renderTools();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('The Forge');
    expect(screen.getByRole('link', { name: /unseal a scroll/i })).toHaveAttribute('href', '/tools/pdf-unlock');
  });
});
