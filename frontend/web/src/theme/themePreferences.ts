import { createContext, useContext } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const themePreferenceValues = ['light', 'dark', 'system'] as const;
export const themeStorageKey = 'monitoring-tfg:theme-preference';
export const systemThemeQuery = '(prefers-color-scheme: dark)';

export type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemePreference(value: string | null): value is ThemePreference {
  return themePreferenceValues.some((preference) => preference === value);
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';

  try {
    const storedPreference = window.localStorage.getItem(themeStorageKey);
    return isThemePreference(storedPreference) ? storedPreference : 'system';
  } catch {
    return 'system';
  }
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia(systemThemeQuery).matches ? 'dark' : 'light';
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? getSystemTheme() : preference;
}

export function applyResolvedTheme(theme: ResolvedTheme) {
  if (typeof document === 'undefined') return;

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function applyThemePreference(preference: ThemePreference) {
  applyResolvedTheme(resolveTheme(preference));
}

export function useThemePreference() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemePreference must be used inside ThemeProvider');
  }

  return context;
}
