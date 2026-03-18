import { useState, useEffect, useCallback, useRef } from 'react';

const KONAMI_SEQUENCE = [
  'ArrowUp', 'ArrowUp',
  'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight',
  'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

export function useKonamiCode() {
  const [activated, setActivated] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const reset = useCallback(() => {
    indexRef.current = 0;
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const expected = KONAMI_SEQUENCE[indexRef.current];

      if (e.key === expected || e.key.toLowerCase() === expected) {
        indexRef.current++;

        // Reset if no input within 2 seconds
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(reset, 2000);

        if (indexRef.current === KONAMI_SEQUENCE.length) {
          setActivated(true);
          reset();
        }
      } else {
        reset();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      clearTimeout(timerRef.current);
    };
  }, [reset]);

  const dismiss = useCallback(() => setActivated(false), []);

  return { activated, dismiss };
}
