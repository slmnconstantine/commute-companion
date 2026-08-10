/**
 * Color palette for Commute Companion
 *
 * Supports switching between themes dynamically via ThemeContext.
 */

export interface Colors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primarySubtle: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  white: string;
  black: string;
  transparent: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  border: string;
  shadow: string;
  overlay: string;
  inputBackground: string;
  glassBackground: string;
  glassBorder: string;
  shimmer: string;
  routeGlow: string;
  gradientPrimary: [string, string];
  gradientAccent: [string, string];
  statusBar: 'dark-content' | 'light-content';
}

const shared = {
  accent: '#F59E0B',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#0057FF',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  gradientAccent: ['#FBBF24', '#F59E0B'] as [string, string],
};

const light: Colors = {
  ...shared,
  primary: '#0057FF',
  primaryDark: '#0040C1',
  primaryLight: '#4D8BFF',
  primarySubtle: '#EBF2FF',
  gradientPrimary: ['#0057FF', '#0040C1'] as [string, string],
  background: '#F8F7F4',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E8E6DF',
  shadow: 'rgba(0, 87, 255, 0.08)',
  overlay: 'rgba(0, 40, 120, 0.5)',
  inputBackground: '#F0EFEA',
  glassBackground: '#FFFFFF',
  glassBorder: '#E8E6DF',
  shimmer: '#E8E6DF',
  routeGlow: 'rgba(0, 87, 255, 0.20)',
  statusBar: 'dark-content',
};

const dark: Colors = {
  ...shared,
  primary: '#90CAF9',
  primaryDark: '#2196F3',
  primaryLight: '#E3F2FD',
  primarySubtle: 'rgba(144, 202, 249, 0.15)',
  gradientPrimary: ['#90CAF9', '#2196F3'] as [string, string],
  background: '#080C14',
  surface: '#111827',
  surfaceElevated: '#1A2235',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  border: '#1F2A3D',
  shadow: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.75)',
  inputBackground: '#1A2235',
  glassBackground: '#1A2235',
  glassBorder: '#1F2A3D',
  shimmer: '#1F2A3D',
  routeGlow: 'rgba(144, 202, 249, 0.22)',
  statusBar: 'light-content',
};

export function getLightColors(): Colors {
  return light;
}

export function getDarkColors(): Colors {
  return dark;
}
