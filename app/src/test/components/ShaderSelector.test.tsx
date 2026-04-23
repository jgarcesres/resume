import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ShaderSelector from '../../components/ShaderSelector';
import { SHADER_PRESETS } from '../../hooks/useShaderPreset';

describe('ShaderSelector', () => {
  it('renders a select associated with a visible label', () => {
    render(<ShaderSelector preset="crt" onChange={() => {}} />);
    const select = screen.getByLabelText(/shader overlay/i);
    expect(select.tagName).toBe('SELECT');
  });

  it('renders one option per preset and preselects the current value', () => {
    render(<ShaderSelector preset="matrix" onChange={() => {}} />);
    const select = screen.getByLabelText(/shader overlay/i) as HTMLSelectElement;
    expect(select.options).toHaveLength(SHADER_PRESETS.length);
    expect(Array.from(select.options).map((o) => o.value))
      .toEqual([...SHADER_PRESETS]);
    expect(select.value).toBe('matrix');
  });
});
