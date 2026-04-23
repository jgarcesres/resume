import { useState, useCallback, useEffect } from 'react';

export type Theme = 'professional' | 'rpg';

const STORAGE_KEY = 'site-theme';

function readStored(): Theme {
  if (typeof window === 'undefined') return 'professional';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'rpg' ? 'rpg' : 'professional';
}

export function useThemeState() {
  const [theme, setThemeState] = useState<Theme>(readStored);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'rpg' ? 'professional' : 'rpg';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return {
    theme,
    setTheme,
    toggleTheme,
    isRpg: theme === 'rpg',
    isProfessional: theme === 'professional',
  };
}
