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

const defaultValue: ThemeContextType = {
  theme: 'professional',
  setTheme: () => {},
  toggleTheme: () => {},
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
