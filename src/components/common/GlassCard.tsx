/**
 * GlassCard — Glassmorphism card component
 *
 * A reusable semi-transparent card with blur effect for premium
 * overlay UI elements. Falls back gracefully on Android where
 * BlurView may not be fully supported.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';


interface GlassCardProps {
  children: React.ReactNode;
  /** Background color (used as fallback and tint) */
  backgroundColor?: string;
  /** Border color */
  borderColor?: string;
  /** Custom style overrides */
  style?: ViewStyle | ViewStyle[];

  /** Border radius */
  borderRadius?: number;
}

export default function GlassCard({
  children,
  backgroundColor,
  borderColor,
  style,
  borderRadius = 20,
}: GlassCardProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: backgroundColor || theme.colors.glassBackground,
          borderColor: borderColor || theme.colors.glassBorder,
          borderRadius,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
});
