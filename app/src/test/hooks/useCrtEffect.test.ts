import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useCrtEffect } from '../../hooks/useCrtEffect';

describe('useCrtEffect', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to enabled', () => {
    const { result } = renderHook(() => useCrtEffect());
    expect(result.current.crtEnabled).toBe(true);
  });

  it('toggles state and persists to localStorage', () => {
    const { result } = renderHook(() => useCrtEffect());
    act(() => result.current.toggleCrt());
    expect(result.current.crtEnabled).toBe(false);
    expect(localStorage.getItem('crt-effect')).toBe('false');
  });

  it('reads persisted value from localStorage', () => {
    localStorage.setItem('crt-effect', 'false');
    const { result } = renderHook(() => useCrtEffect());
    expect(result.current.crtEnabled).toBe(false);
  });
});
