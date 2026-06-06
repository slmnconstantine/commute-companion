/**
 * Badge
 *
 * A small, pill-shaped status label.  Each semantic `variant`
 * maps to a unique background tint + text colour derived from
 * the current theme palette.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type BadgeVariant =
  | 'verified'
  | 'pending'
  | 'unverified'
  | 'driver'
  | 'commuter'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'accepted';

interface BadgeProps {
  /** Display text */
  label: string;
  /** Semantic colour variant */
  variant: BadgeVariant;
}

/**
 * Resolve variant → [backgroundBase, textColour].
 * Background colours are further adjusted with an opacity tint in the render.
 */
function useVariantColors(variant: BadgeVariant) {
  const { theme } = useTheme();

  const map: Record<BadgeVariant, { bg: string; text: string }> = {
    verified: { bg: theme.colors.success, text: theme.colors.success },
    active: { bg: theme.colors.success, text: theme.colors.success },
    accepted: { bg: theme.colors.success, text: theme.colors.success },
    pending: { bg: theme.colors.warning, text: theme.colors.warning },
    unverified: { bg: theme.colors.border, text: theme.colors.textMuted },
    driver: { bg: theme.colors.info, text: theme.colors.info },
    completed: { bg: theme.colors.info, text: theme.colors.info },
    commuter: { bg: theme.colors.primary, text: theme.colors.primary },
    cancelled: { bg: theme.colors.error, text: theme.colors.error },
  };

  return map[variant];
}

/** Convert a hex colour to rgba with given alpha */
function hexToRgba(hex: string, alpha: number): string {
  const sanitised = hex.replace('#', '');
  const r = parseInt(sanitised.substring(0, 2), 16);
  const g = parseInt(sanitised.substring(2, 4), 16);
  const b = parseInt(sanitised.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function Badge({ label, variant }: BadgeProps) {
  const { theme } = useTheme();
  const { bg, text } = useVariantColors(variant);

  const bgOpacity = variant === 'unverified' ? 0.3 : 0.15;

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: hexToRgba(bg, bgOpacity),
          borderRadius: theme.borderRadius.full,
        },
      ]}
    >
      <Text style={[styles.label, theme.typography.small, { color: text }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  label: {
    textAlign: 'center',
  },
});
