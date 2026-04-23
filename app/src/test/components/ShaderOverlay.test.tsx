import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ShaderOverlay from '../../components/ShaderOverlay';

// jsdom has no navigator.gpu, so ShaderOverlay's init path always falls through
// to the unavailable state. That lets us cover the CSS-fallback and toast
// branches without mocking WebGPU.
describe('ShaderOverlay', () => {
  it('renders nothing for the none preset', () => {
    const { container } = render(<ShaderOverlay preset="none" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the CSS crt-overlay fallback when preset=crt and WebGPU is unavailable', async () => {
    const { container } = render(<ShaderOverlay preset="crt" />);
    // First pass: canvas is rendered while unavailable is still false; then the
    // init effect runs, sets unavailable, and React re-renders to the fallback.
    await waitFor(() => {
      expect(container.querySelector('.crt-overlay')).not.toBeNull();
    });
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('shows a toast when a non-CRT preset is picked and WebGPU is unavailable', async () => {
    render(<ShaderOverlay preset="bloom" />);
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/bloom/i);
    expect(status).toHaveTextContent(/webgpu/i);
  });

  it('does not render the CRT toast when falling back to CSS', async () => {
    render(<ShaderOverlay preset="crt" />);
    await waitFor(() => {
      expect(document.querySelector('.crt-overlay')).not.toBeNull();
    });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
