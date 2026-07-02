/**
 * Color palette for Commute Companion
 *
 * Supports switching between themes dynamically via ThemeContext.
 */

export type ThemePreset = 'emerald' | 'glass_emerald' | 'extracta-system-terminal-DESIGN';

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
  glassBackground: string;
  gradientPrimary: [string, string];
  statusBar: 'dark-content' | 'light-content';
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. EMERALD PRESET (Original)
// ─────────────────────────────────────────────────────────────────────────────
const emeraldShared = {
  primary: '#10B981', // Emerald
  primaryDark: '#059669',
  accent: '#F59E0B',
  success: '#22C55E',  // Green-500 — distinct from primary emerald
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  gradientPrimary: ['#34D399', '#059669'] as [string, string],
};

const emeraldLight: Colors = {
  ...emeraldShared,
  background: '#FAFAFA',
  surface: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  shadow: 'rgba(0, 0, 0, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  inputBackground: '#F1F5F9',
  glassBackground: 'rgba(255, 255, 255, 0.85)',
  statusBar: 'dark-content',
};

const emeraldDark: Colors = {
  ...emeraldShared,
  background: '#0B0F19',
  surface: '#151C2C',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  border: '#2A3448',
  shadow: 'rgba(0, 0, 0, 0.4)',
  overlay: 'rgba(0, 0, 0, 0.75)',
  inputBackground: '#1E293B',
  glassBackground: 'rgba(21, 28, 44, 0.85)',
  statusBar: 'light-content',
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GLASSMORPHISM EMERALD PRESET
// ─────────────────────────────────────────────────────────────────────────────
const glassEmeraldShared = {
  primary: '#10B981', // Emerald
  primaryDark: '#059669',
  accent: '#F59E0B',
  success: '#22C55E',  // Green-500 — distinct from primary emerald
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  gradientPrimary: ['#34D399', '#059669'] as [string, string],
};

const glassEmeraldLight: Colors = {
  ...glassEmeraldShared,
  background: '#F0F4F8', // Cool grey-blue
  surface: 'rgba(255, 255, 255, 0.75)', // Frosted glass cards
  text: '#1E293B', // Slate
  textMuted: '#64748B',
  border: 'rgba(226, 232, 240, 0.8)', // Translucent silver border
  shadow: 'rgba(148, 163, 184, 0.12)', // Soft blurry shadow
  overlay: 'rgba(15, 23, 42, 0.4)',
  inputBackground: 'rgba(255, 255, 255, 0.5)',
  glassBackground: 'rgba(255, 255, 255, 0.85)',
  statusBar: 'dark-content',
};

const glassEmeraldDark: Colors = {
  ...glassEmeraldShared,
  background: '#080B16', // Deep Space Navy
  surface: 'rgba(17, 24, 39, 0.65)', // Dark frosted glass cards
  text: '#F1F5F9', // Ice white
  textMuted: '#94A3B8',
  border: 'rgba(255, 255, 255, 0.08)', // Thin glowing border
  shadow: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.75)',
  inputBackground: 'rgba(17, 24, 39, 0.4)',
  glassBackground: 'rgba(17, 24, 39, 0.85)',
  statusBar: 'light-content',
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. EXTRACTA // SYSTEM TERMINAL PRESET (forced-dark — "light" and "dark" modes are identical)
// ─────────────────────────────────────────────────────────────────────────────
const extractaShared = {
  primary: '#E5EC5B', // Yellow-green neon terminal color
  primaryDark: '#BCC243',
  accent: '#E5EC5B',
  success: '#E5EC5B',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  white: '#FFFFFF',
  black: '#050505',
  transparent: 'transparent',
  gradientPrimary: ['#E5EC5B', '#BCC243'] as [string, string],
};

const extractaLight: Colors = {
  ...extractaShared,
  background: '#030303',
  surface: '#18181B',
  text: '#FFFFFF',
  textMuted: '#A1A1AA',
  border: '#27272A',
  shadow: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.75)',
  inputBackground: '#09090B',
  glassBackground: 'rgba(24, 24, 27, 0.85)',
  statusBar: 'light-content',
};

const extractaDark: Colors = {
  ...extractaLight,
};

export function getLightColors(preset: ThemePreset = 'emerald'): Colors {
  if (preset === 'extracta-system-terminal-DESIGN') return extractaLight;
  if (preset === 'emerald') return emeraldLight;
  return glassEmeraldLight;
}

export function getDarkColors(preset: ThemePreset = 'emerald'): Colors {
  if (preset === 'extracta-system-terminal-DESIGN') return extractaDark;
  if (preset === 'emerald') return emeraldDark;
  return glassEmeraldDark;
}
