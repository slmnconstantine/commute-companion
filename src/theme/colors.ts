/**
 * Color palette for Commute Companion
 *
 * Supports switching between themes using the ACTIVE_PRESET configuration.
 * Concept 1: Neo-Brutalist Grid (Chunky, Bold, High-Contrast) is active by default.
 * Change ACTIVE_PRESET to 'emerald', 'nordic', or 'glass' to switch themes.
 */

export type ThemePreset = 'emerald' | 'nordic' | 'glass' | 'brutalist';

export let ACTIVE_PRESET: ThemePreset = 'emerald';

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
  success: '#10B981',
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
// 2. NORDIC ORGANIC PRESET (Concept 3)
// ─────────────────────────────────────────────────────────────────────────────
const nordicShared = {
  primary: '#2D5A42', // Warm Forest Green
  primaryDark: '#1E3D2C',
  accent: '#E6A15C', // Earthy Amber/Ochre
  success: '#2D5A42',
  warning: '#E6A15C',
  error: '#C84B4B', // Muted Red
  info: '#4B779A', // Muted Denim Blue
  white: '#FFFFFF',
  black: '#1A1D1A', // Soft Charcoal
  transparent: 'transparent',
  gradientPrimary: ['#3F8A55', '#2D5A42'] as [string, string],
};

const nordicLight: Colors = {
  ...nordicShared,
  background: '#F6F4EE', // Oatmeal Cream
  surface: '#FFFDFB', // Soft Ivory
  text: '#232B25', // Dark Moss
  textMuted: '#6C7E72', // Sage Grey
  border: '#EAE6DC', // Muted warm border
  shadow: 'rgba(45, 90, 66, 0.04)', // Warm tinted shadow
  overlay: 'rgba(35, 43, 37, 0.4)',
  inputBackground: '#EFEDE7', // Soft warm beige input
  glassBackground: 'rgba(255, 253, 251, 0.85)',
  statusBar: 'dark-content',
};

const nordicDark: Colors = {
  ...nordicShared,
  background: '#1A1D1A', // Earthy Charcoal
  surface: '#222723', // Dark Pine Surface
  text: '#EAE7E1', // Oatmeal White
  textMuted: '#94A398', // Muted Sage White
  border: '#323833', // Dark Moss Border
  shadow: 'rgba(0, 0, 0, 0.35)',
  overlay: 'rgba(0, 0, 0, 0.75)',
  inputBackground: '#161916',
  glassBackground: 'rgba(34, 39, 35, 0.85)',
  statusBar: 'light-content',
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. GLASSMORPHISM / FLUENT DEPTH PRESET (Concept 2)
// ─────────────────────────────────────────────────────────────────────────────
const glassShared = {
  primary: '#10B981', // Vibrant Emerald (Light)
  primaryDark: '#059669',
  accent: '#F59E0B',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  gradientPrimary: ['#34D399', '#059669'] as [string, string],
};

const glassLight: Colors = {
  ...glassShared,
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

const glassDark: Colors = {
  ...glassShared,
  primary: '#06B6D4', // Electric Cyan
  primaryDark: '#0891B2',
  gradientPrimary: ['#22D3EE', '#0891B2'] as [string, string],
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
// 4. NEO-BRUTALIST GRID PRESET (Concept 1)
// ─────────────────────────────────────────────────────────────────────────────
const brutalistShared = {
  primary: '#00E676', // Neon Green
  primaryDark: '#00C853',
  accent: '#FFD54F', // Warning Yellow
  success: '#00E676',
  warning: '#FFD54F',
  error: '#EF4444',
  info: '#3B82F6',
  white: '#FFFFFF',
  black: '#111827',
  transparent: 'transparent',
  gradientPrimary: ['#69F0AE', '#00C853'] as [string, string],
};

const brutalistLight: Colors = {
  ...brutalistShared,
  background: '#F3F4F6', // Stark off-grey
  surface: '#FFFFFF',
  text: '#111827', // Stark charcoal black
  textMuted: '#4B5563',
  border: '#111827', // Bold borders
  shadow: '#111827', // Solid offset shadow
  overlay: 'rgba(17, 24, 39, 0.6)',
  inputBackground: '#F9FAFB',
  glassBackground: 'rgba(255, 255, 255, 0.95)',
  statusBar: 'dark-content',
};

const brutalistDark: Colors = {
  ...brutalistShared,
  primary: '#00FF7F', // Spring green
  primaryDark: '#00E676',
  gradientPrimary: ['#69F0AE', '#00E676'] as [string, string],
  background: '#0D0D12', // Matte black
  surface: '#161622',
  text: '#F3F4F6', // Off-white
  textMuted: '#9CA3AF',
  border: '#F3F4F6', // Bold borders
  shadow: '#000000', // Solid offset shadow
  overlay: 'rgba(0, 0, 0, 0.85)',
  inputBackground: '#1F1F2E',
  glassBackground: 'rgba(22, 22, 34, 0.95)',
  statusBar: 'light-content',
};

// Export active theme color palette based on configuration
export const lightColors =
  (ACTIVE_PRESET as string) === 'brutalist' ? brutalistLight :
    (ACTIVE_PRESET as string) === 'glass' ? glassLight :
      (ACTIVE_PRESET as string) === 'nordic' ? nordicLight : emeraldLight;

export const darkColors =
  (ACTIVE_PRESET as string) === 'brutalist' ? brutalistDark :
    (ACTIVE_PRESET as string) === 'glass' ? glassDark :
      (ACTIVE_PRESET as string) === 'nordic' ? nordicDark : emeraldDark;
