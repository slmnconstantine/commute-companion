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
  primary: '#10B981', // Emerald
  primaryDark: '#059669',
  primaryLight: '#34D399',
  accent: '#F59E0B',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  gradientPrimary: ['#34D399', '#059669'] as [string, string],
  gradientAccent: ['#FBBF24', '#F59E0B'] as [string, string],
};

const light: Colors = {
  ...shared,
  primarySubtle: 'rgba(16, 185, 129, 0.08)',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  shadow: 'rgba(0, 0, 0, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  inputBackground: '#F1F5F9',
  glassBackground: '#FFFFFF',
  glassBorder: '#E2E8F0',
  shimmer: '#E2E8F0',
  routeGlow: 'rgba(16, 185, 129, 0.18)',
  statusBar: 'dark-content',
};

const dark: Colors = {
  ...shared,
  primarySubtle: 'rgba(16, 185, 129, 0.10)',
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
  routeGlow: 'rgba(52, 211, 153, 0.22)',
  statusBar: 'light-content',
};

export function getLightColors(): Colors {
  return light;
}

export function getDarkColors(): Colors {
  return dark;
}
