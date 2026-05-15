import {
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  applyResolvedTheme,
  getStoredThemePreference,
  resolveTheme,
  systemThemeQuery,
  ThemeContext,
  themeStorageKey,
  type ResolvedTheme,
  type ThemePreference,
} from './themePreferences';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(getStoredThemePreference);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(preference));

  useLayoutEffect(() => {
    const mediaQuery = window.matchMedia(systemThemeQuery);

    const syncResolvedTheme = () => {
      const nextTheme = resolveTheme(preference);
      applyResolvedTheme(nextTheme);
      setResolvedTheme(nextTheme);
    };

    syncResolvedTheme();

    if (preference !== 'system') return undefined;

    mediaQuery.addEventListener('change', syncResolvedTheme);
    return () => mediaQuery.removeEventListener('change', syncResolvedTheme);
  }, [preference]);

  const setPreference = (nextPreference: ThemePreference) => {
    try {
      window.localStorage.setItem(themeStorageKey, nextPreference);
    } catch {
      // Non-critical: theme still applies for the current session.
    }

    setPreferenceState(nextPreference);
  };

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}
