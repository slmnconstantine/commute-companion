/**
 * ThemeContext
 *
 * Provides the current `Theme` object and a `toggleTheme()` function
 * to every component in the tree.  Defaults to the device colour scheme
 * via `useColorScheme()` and keeps the StatusBar in sync.
 */

import React, { createContext, useContext, useState, useMemo, type PropsWithChildren } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import { lightTheme, darkTheme, type Theme } from '@/theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  /** The resolved theme (colors + typography + spacing + borderRadius) */
  theme: Theme;
  /** Current mode — useful for conditional logic */
  mode: ThemeMode;
  /** Toggle between light and dark mode */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Wrap your app root with `<ThemeProvider>` to enable theming everywhere.
 *
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  const deviceScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(deviceScheme === 'dark' ? 'dark' : 'light');

  const toggleTheme = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'));

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: mode === 'light' ? lightTheme : darkTheme,
      mode,
      toggleTheme,
    }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar
        barStyle={mode === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={value.theme.colors.background}
      />
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Access the current theme anywhere in the component tree.
 *
 * @example
 * ```tsx
 * const { theme, toggleTheme } = useTheme();
 * ```
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return ctx;
}
