import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useKonamiCode } from '../../hooks/useKonamiCode';

const fireKey = (key: string) => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
};

const enterKonamiCode = () => {
  fireKey('ArrowUp');
  fireKey('ArrowUp');
  fireKey('ArrowDown');
  fireKey('ArrowDown');
  fireKey('ArrowLeft');
  fireKey('ArrowRight');
  fireKey('ArrowLeft');
  fireKey('ArrowRight');
  fireKey('b');
  fireKey('a');
};

describe('useKonamiCode', () => {
  it('starts inactive', () => {
    const { result } = renderHook(() => useKonamiCode());
    expect(result.current.activated).toBe(false);
  });

  it('activates on correct sequence', () => {
    const { result } = renderHook(() => useKonamiCode());
    act(() => enterKonamiCode());
    expect(result.current.activated).toBe(true);
  });

  it('does not activate on wrong sequence', () => {
    const { result } = renderHook(() => useKonamiCode());
    act(() => {
      fireKey('ArrowUp');
      fireKey('ArrowDown'); // wrong — should be ArrowUp
    });
    expect(result.current.activated).toBe(false);
  });

  it('dismiss resets activated state', () => {
    const { result } = renderHook(() => useKonamiCode());
    act(() => enterKonamiCode());
    expect(result.current.activated).toBe(true);
    act(() => result.current.dismiss());
    expect(result.current.activated).toBe(false);
  });
});
