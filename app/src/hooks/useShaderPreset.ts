import { useState, useCallback } from 'react';

export const SHADER_PRESETS = ['none', 'crt', 'bloom', 'chromatic', 'retro', 'matrix'] as const;
export type ShaderPreset = typeof SHADER_PRESETS[number];

const STORAGE_KEY = 'shader-preset';
const LEGACY_KEY = 'crt-effect';
const DEFAULT_PRESET: ShaderPreset = 'crt';

function isShaderPreset(value: string | null): value is ShaderPreset {
  return value !== null && (SHADER_PRESETS as readonly string[]).includes(value);
}

// Reads the current preset, migrating the legacy `crt-effect` boolean once if
// the new key has not been written yet. `crt-effect=true` → `crt`, `false` → `none`.
function readInitial(): ShaderPreset {
  if (typeof window === 'undefined') return DEFAULT_PRESET;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (isShaderPreset(stored)) return stored;

  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy !== null) {
    // Only treat the two values the legacy hook ever wrote as migratable.
    // Anything else falls through to the default rather than being silently
    // mapped to an on/off state.
    const migrated: ShaderPreset =
      legacy === 'true' ? 'crt' : legacy === 'false' ? 'none' : DEFAULT_PRESET;
    localStorage.setItem(STORAGE_KEY, migrated);
    localStorage.removeItem(LEGACY_KEY);
    return migrated;
  }

  return DEFAULT_PRESET;
}

export function useShaderPreset() {
  const [preset, setPresetState] = useState<ShaderPreset>(readInitial);

  const setPreset = useCallback((next: ShaderPreset) => {
    setPresetState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return { preset, setPreset };
}
