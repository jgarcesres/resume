import { render, screen } from '@testing-library/react';
import { afterEach, describe, it, expect } from 'vitest';
import App from '../App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(document.querySelector('nav')).toBeInTheDocument();
  });

  it('renders the home page by default', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('serves the tools index at /tools', async () => {
    window.history.pushState({}, '', '/tools');
    render(<App />);
    expect(await screen.findByRole('link', { name: /pdf unlock/i })).toHaveAttribute('href', '/tools/pdf-unlock');
  });

  it('serves the PDF unlock tool at /tools/pdf-unlock', async () => {
    window.history.pushState({}, '', '/tools/pdf-unlock');
    render(<App />);
    expect(await screen.findByLabelText(/choose a pdf/i)).toBeInTheDocument();
  });
});
