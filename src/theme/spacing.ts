/**
 * Spacing & border-radius tokens for Commute Companion
 *
 * Built on an 8 px grid for consistent rhythm across the UI.
 * Automatically swaps border radius measurements based on active preset.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

const emeraldBorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

const glassEmeraldBorderRadius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 24,
  full: 9999,
} as const;

const extractaBorderRadius = {
  sm: 1, // control: 1px
  md: 2, // card: 2px
  lg: 2,
  xl: 2,
  full: 9999, // pill: 9999px
} as const;

export function getBorderRadius(preset: string) {
  if (preset === 'extracta-system-terminal-DESIGN') return extractaBorderRadius;
  if (preset === 'glass_emerald') return glassEmeraldBorderRadius;
  return emeraldBorderRadius;
}

export const borderRadius = emeraldBorderRadius; // Default fallback

export type Spacing = typeof spacing;
export type BorderRadius = ReturnType<typeof getBorderRadius>;
