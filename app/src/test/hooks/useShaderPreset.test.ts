import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useShaderPreset } from '../../hooks/useShaderPreset';

describe('useShaderPreset', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to crt when nothing is stored', () => {
    const { result } = renderHook(() => useShaderPreset());
    expect(result.current.preset).toBe('crt');
  });

  it('reads a persisted preset from localStorage', () => {
    localStorage.setItem('shader-preset', 'matrix');
    const { result } = renderHook(() => useShaderPreset());
    expect(result.current.preset).toBe('matrix');
  });

  it('ignores unknown stored values and falls back to default', () => {
    localStorage.setItem('shader-preset', 'not-a-preset');
    const { result } = renderHook(() => useShaderPreset());
    expect(result.current.preset).toBe('crt');
  });

  it('setPreset persists to localStorage', () => {
    const { result } = renderHook(() => useShaderPreset());
    act(() => result.current.setPreset('bloom'));
    expect(result.current.preset).toBe('bloom');
    expect(localStorage.getItem('shader-preset')).toBe('bloom');
  });

  it('migrates legacy crt-effect=true to crt and clears the old key', () => {
    localStorage.setItem('crt-effect', 'true');
    const { result } = renderHook(() => useShaderPreset());
    expect(result.current.preset).toBe('crt');
    expect(localStorage.getItem('shader-preset')).toBe('crt');
    expect(localStorage.getItem('crt-effect')).toBeNull();
  });

  it('migrates legacy crt-effect=false to none', () => {
    localStorage.setItem('crt-effect', 'false');
    const { result } = renderHook(() => useShaderPreset());
    expect(result.current.preset).toBe('none');
    expect(localStorage.getItem('shader-preset')).toBe('none');
    expect(localStorage.getItem('crt-effect')).toBeNull();
  });

  it('falls back to default for unexpected legacy values', () => {
    localStorage.setItem('crt-effect', 'yes');
    const { result } = renderHook(() => useShaderPreset());
    expect(result.current.preset).toBe('crt');
    expect(localStorage.getItem('shader-preset')).toBe('crt');
    expect(localStorage.getItem('crt-effect')).toBeNull();
  });

  it('prefers new key over legacy key when both exist', () => {
    localStorage.setItem('shader-preset', 'retro');
    localStorage.setItem('crt-effect', 'false');
    const { result } = renderHook(() => useShaderPreset());
    expect(result.current.preset).toBe('retro');
    // Legacy key is left alone when no migration is needed — it's harmless
    // and leaving it untouched avoids any chance of stepping on concurrent tabs.
    expect(localStorage.getItem('crt-effect')).toBe('false');
  });
});
