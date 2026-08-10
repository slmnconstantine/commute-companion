/**
 * ThemeContext
 *
 * Provides the current `Theme` object and a `toggleTheme()` function
 * to every component in the tree. Defaults to the device colour scheme
 * via `useColorScheme()` and keeps the StatusBar in sync.
 */

import React, { createContext, useContext, useState, useMemo, useEffect, type PropsWithChildren } from 'react';
import { StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTheme, type Theme } from '@/theme';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';

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
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>('light');

  // Load user-saved theme preference on mount (defaults to 'light')
  useEffect(() => {
    AsyncStorage.getItem('@app_theme_mode').then((savedMode) => {
      if (savedMode === 'dark' || savedMode === 'light') {
        setMode(savedMode);
      }
    }).catch(() => {});
  }, []);

  // Load Inter font family
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const toggleTheme = () => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem('@app_theme_mode', next).catch(() => {});
      return next;
    });
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: getTheme(mode),
      mode,
      toggleTheme,
    }),
    [mode],
  );

  // Prevent rendering until fonts are loaded
  if (!fontsLoaded) {
    return null; // could render a splash screen here
  }

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
