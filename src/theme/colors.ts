/**
 * Color palette for Commutable Companion
 *
 * Modern minimalistic palette with teal primary and amber accent.
 * Both light and dark mode share the same key structure for easy swapping.
 */

export interface Colors {
  primary: string;
  primaryDark: string;
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
  text: string;
  textMuted: string;
  border: string;
  shadow: string;
  overlay: string;
  inputBackground: string;
  statusBar: 'dark-content' | 'light-content';
}

/** Shared semantic / brand colors that don't change between modes */
const shared = {
  primary: '#0D9488',
  primaryDark: '#0F766E',
  accent: '#F59E0B',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const lightColors: Colors = {
  ...shared,
  background: '#FAFAFA',
  surface: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  shadow: 'rgba(0, 0, 0, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  inputBackground: '#F1F5F9',
  statusBar: 'dark-content',
};

export const darkColors: Colors = {
  ...shared,
  background: '#0F172A',
  surface: '#1E293B',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  border: '#334155',
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  inputBackground: '#1E293B',
  statusBar: 'light-content',
};
