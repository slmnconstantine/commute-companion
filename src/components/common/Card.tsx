/**
 * Card
 *
 * A versatile card container with surface background, rounded corners,
 * configurable padding, and shadow elevation.  If `onPress` is provided
 * the card becomes pressable with subtle opacity feedback.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';
type CardElevation = 'none' | 'sm' | 'md';

interface CardProps {
  /** Content rendered inside the card */
  children: React.ReactNode;
  /** Extra styles merged onto the card container */
  style?: StyleProp<ViewStyle>;
  /** If provided the card becomes pressable */
  onPress?: () => void;
  /** Inner padding preset */
  padding?: CardPadding;
  /** Shadow depth */
  elevation?: CardElevation;
}

const PADDING_MAP: Record<CardPadding, number> = {
  none: 0,
  sm: 12,
  md: 16,
  lg: 24,
};

export default function Card({
  children,
  style,
  onPress,
  padding = 'md',
  elevation = 'sm',
}: CardProps) {
  const { theme } = useTheme();

  const shadowStyles: Record<CardElevation, ViewStyle> = {
    none: {},
    sm: {
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 4,
    },
  };

  const containerStyle: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: PADDING_MAP[padding],
    ...shadowStyles[elevation],
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          containerStyle,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[containerStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
});
