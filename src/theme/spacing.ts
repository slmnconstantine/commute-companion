import { ACTIVE_PRESET } from './colors';

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

const nordicBorderRadius = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

const glassBorderRadius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 24,
  full: 9999,
} as const;

const brutalistBorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const borderRadius = 
  (ACTIVE_PRESET as string) === 'brutalist' ? brutalistBorderRadius :
  (ACTIVE_PRESET as string) === 'glass' ? glassBorderRadius :
  (ACTIVE_PRESET as string) === 'nordic' ? nordicBorderRadius : emeraldBorderRadius;

export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
