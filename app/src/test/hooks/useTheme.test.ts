import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeState } from '../../hooks/useTheme';

describe('useThemeState', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = '';
  });

  it('defaults to professional when nothing is stored', () => {
    const { result } = renderHook(() => useThemeState());
    expect(result.current.theme).toBe('professional');
    expect(result.current.isProfessional).toBe(true);
    expect(result.current.isRpg).toBe(false);
  });

  it('reads persisted rpg value from localStorage', () => {
    localStorage.setItem('site-theme', 'rpg');
    const { result } = renderHook(() => useThemeState());
    expect(result.current.theme).toBe('rpg');
    expect(result.current.isRpg).toBe(true);
  });

  it('setTheme persists to localStorage and updates data-theme attribute', () => {
    const { result } = renderHook(() => useThemeState());
    act(() => result.current.setTheme('rpg'));
    expect(result.current.theme).toBe('rpg');
    expect(localStorage.getItem('site-theme')).toBe('rpg');
    expect(document.documentElement.dataset.theme).toBe('rpg');
  });

  it('toggleTheme flips between professional and rpg', () => {
    const { result } = renderHook(() => useThemeState());
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('rpg');
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('professional');
    expect(localStorage.getItem('site-theme')).toBe('professional');
  });

  it('treats unknown stored values as professional', () => {
    localStorage.setItem('site-theme', 'whatever');
    const { result } = renderHook(() => useThemeState());
    expect(result.current.theme).toBe('professional');
  });
});
