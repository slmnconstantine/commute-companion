/**
 * Divider
 *
 * A 1 px horizontal line used to visually separate content sections.
 * The `spacing` prop controls vertical margin above and below the line.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type DividerSpacing = 'sm' | 'md' | 'lg';

interface DividerProps {
  /** Vertical margin above and below the line */
  spacing?: DividerSpacing;
}

const SPACING_MAP: Record<DividerSpacing, number> = {
  sm: 8,
  md: 16,
  lg: 24,
};

export default function Divider({ spacing = 'md' }: DividerProps) {
  const { theme } = useTheme();
  const margin = SPACING_MAP[spacing];

  return (
    <View
      style={[
        styles.line,
        {
          backgroundColor: theme.colors.border,
          marginVertical: margin,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    height: 1,
    width: '100%',
  },
});
