import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useThemeState } from '../hooks/useTheme';
import type { Theme } from '../hooks/useTheme';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  isRpg: boolean;
  isProfessional: boolean;
}

// Writers fail loudly in dev when called outside a provider — silent no-ops in
// prod let SSR/tests render without forcing every consumer to wrap.
function warnMissingProvider(fn: string) {
  if (import.meta.env.DEV) {
    console.error(
      `[ThemeContext] ${fn}() called outside <ThemeProvider>. ` +
      'Theme change will not apply. Wrap this subtree in <ThemeProvider>.'
    );
  }
}

const defaultValue: ThemeContextType = {
  theme: 'professional',
  setTheme: () => warnMissingProvider('setTheme'),
  toggleTheme: () => warnMissingProvider('toggleTheme'),
  isRpg: false,
  isProfessional: true,
};

const ThemeContext = createContext<ThemeContextType>(defaultValue);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useThemeState();
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}
