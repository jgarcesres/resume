import { useId } from 'react';
import { SHADER_PRESETS, type ShaderPreset } from '../hooks/useShaderPreset';

const LABELS: Record<ShaderPreset, string> = {
  none: 'Off',
  crt: 'CRT',
  bloom: 'Bloom',
  chromatic: 'Chromatic',
  retro: 'Retro',
  matrix: 'Matrix',
};

interface ShaderSelectorProps {
  preset: ShaderPreset;
  onChange: (next: ShaderPreset) => void;
  variant?: 'desktop' | 'mobile';
}

function ShaderSelector({ preset, onChange, variant = 'desktop' }: ShaderSelectorProps) {
  const labelId = useId();

  const baseSelectClass =
    'font-pixel uppercase tracking-wider bg-rpg-deep text-rpg-text border border-rpg-border ' +
    'hover:border-neon-cyan focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan ' +
    'transition-colors cursor-pointer';

  const sizeClass = variant === 'desktop'
    ? 'text-[8px] px-2 py-1'
    : 'text-[9px] px-2 py-2 w-full';

  return (
    <div className={variant === 'desktop' ? 'flex items-center gap-2' : 'flex flex-col gap-1'}>
      <label
        id={labelId}
        htmlFor={`${labelId}-select`}
        className="font-pixel text-[8px] text-rpg-text-dim uppercase"
      >
        Shader
      </label>
      <select
        id={`${labelId}-select`}
        value={preset}
        onChange={(e) => onChange(e.target.value as ShaderPreset)}
        className={`${baseSelectClass} ${sizeClass}`}
        aria-label="Shader overlay preset"
      >
        {SHADER_PRESETS.map((p) => (
          <option key={p} value={p}>{LABELS[p]}</option>
        ))}
      </select>
    </div>
  );
}

export default ShaderSelector;
