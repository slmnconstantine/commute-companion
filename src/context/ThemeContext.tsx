/**
 * ThemeContext
 *
 * Provides the current `Theme` object and a `toggleTheme()` function
 * to every component in the tree.  Defaults to the device colour scheme
 * via `useColorScheme()` and keeps the StatusBar in sync.
 */

import React, { createContext, useContext, useState, useMemo, useEffect, type PropsWithChildren } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTheme, type Theme } from '@/theme';
import type { ThemePreset } from '@/theme/colors';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  /** The resolved theme (colors + typography + spacing + borderRadius) */
  theme: Theme;
  /** Current mode — useful for conditional logic */
  mode: ThemeMode;
  /** Current preset */
  preset: ThemePreset;
  /** Toggle between light and dark mode */
  toggleTheme: () => void;
  /** Set active preset */
  setPreset: (preset: ThemePreset) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const PRESET_STORAGE_KEY = '@commute_companion_theme_preset';

/**
 * Wrap your app root with `<ThemeProvider>` to enable theming everywhere.
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  const deviceScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(deviceScheme === 'dark' ? 'dark' : 'light');
  const [preset, setPresetState] = useState<ThemePreset>('glass_emerald');

  useEffect(() => {
    AsyncStorage.getItem(PRESET_STORAGE_KEY).then((saved) => {
      if (saved === 'emerald' || saved === 'glass_emerald' || saved === 'extracta-system-terminal-DESIGN') {
        setPresetState(saved as ThemePreset);
      }
    });
  }, []);

  const toggleTheme = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  
  const setPreset = (newPreset: ThemePreset) => {
    setPresetState(newPreset);
    AsyncStorage.setItem(PRESET_STORAGE_KEY, newPreset);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: getTheme(mode, preset),
      mode,
      preset,
      toggleTheme,
      setPreset,
    }),
    [mode, preset],
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
