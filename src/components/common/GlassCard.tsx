/**
 * GlassCard — Glassmorphism card component
 *
 * A reusable semi-transparent card with blur effect for premium
 * overlay UI elements. Falls back gracefully on Android where
 * BlurView may not be fully supported.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassCardProps {
  children: React.ReactNode;
  /** Background color (used as fallback and tint) */
  backgroundColor?: string;
  /** Border color */
  borderColor?: string;
  /** Custom style overrides */
  style?: ViewStyle | ViewStyle[];
  /** Blur intensity (0-100) */
  intensity?: number;
  /** Blur tint */
  tint?: 'light' | 'dark' | 'default';
  /** Border radius */
  borderRadius?: number;
}

export default function GlassCard({
  children,
  backgroundColor = 'rgba(255, 255, 255, 0.75)',
  borderColor = 'rgba(255, 255, 255, 0.2)',
  style,
  intensity = 40,
  tint = 'light',
  borderRadius = 20,
}: GlassCardProps) {
  // On Android, BlurView support can be inconsistent, so we use a
  // semi-transparent fallback with higher opacity for similar effect
  if (Platform.OS === 'android') {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor,
            borderColor,
            borderRadius,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      style={[
        styles.container,
        {
          borderColor,
          borderRadius,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </BlurView>
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
