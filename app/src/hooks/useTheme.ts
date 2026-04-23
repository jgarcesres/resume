import { useState, useCallback, useEffect } from 'react';

export type Theme = 'professional' | 'rpg';

const STORAGE_KEY = 'site-theme';

// localStorage throws in Safari private mode / sandboxed iframes / when storage
// is disabled. Swallow and fall back so the app never crashes on mount.
function safeGet(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeSet(value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* storage unavailable — selection holds for the session only */
  }
}

function readStored(): Theme {
  return safeGet() === 'rpg' ? 'rpg' : 'professional';
}

export function useThemeState() {
  const [theme, setThemeState] = useState<Theme>(readStored);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
    }
    safeSet(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'rpg' ? 'professional' : 'rpg'));
  }, []);

  return {
    theme,
    setTheme,
    toggleTheme,
    isRpg: theme === 'rpg',
    isProfessional: theme === 'professional',
  };
}
