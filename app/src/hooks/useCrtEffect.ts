import { useState, useCallback } from 'react';

export function useCrtEffect() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('crt-effect');
    return stored === null ? true : stored === 'true';
  });

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('crt-effect', String(next));
      return next;
    });
  }, []);

  return { crtEnabled: enabled, toggleCrt: toggle };
}
