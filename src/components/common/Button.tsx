/**
 * Button
 *
 * A premium, animated button supporting multiple visual variants,
 * three sizes, loading / disabled states, and an optional leading icon.
 * Press feedback uses a subtle scale animation via Animated API.
 */

import React, { useRef } from 'react';
import {
  Animated,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  /** Button label */
  title: string;
  /** Press handler */
  onPress: () => void;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Height & text size */
  size?: ButtonSize;
  /** Replace text with a spinner */
  loading?: boolean;
  /** Grey-out and prevent presses */
  disabled?: boolean;
  /** Optional icon rendered to the left of the title */
  icon?: React.ReactNode;
  /** Stretch to fill parent width */
  fullWidth?: boolean;
  /** Extra styles applied to the outer container */
  style?: StyleProp<ViewStyle>;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
}: ButtonProps) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  // ---- press animation helpers ----
  const animateIn = () => {
    if (variant === 'primary' || variant === 'danger') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const animateOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  // ---- size mapping ----
  const sizeStyles: Record<ButtonSize, { height: number; textStyle: TextStyle }> = {
    sm: { height: 40, textStyle: theme.typography.caption },
    md: { height: 48, textStyle: theme.typography.body },
    lg: { height: 56, textStyle: theme.typography.subtitle },
  };

  // ---- variant mapping ----
  const variantStyles: Record<
    ButtonVariant,
    { bg: string; text: string; border?: string }
  > = {
    primary: {
      bg: theme.colors.primary,
      text: theme.colors.white,
    },
    secondary: {
      bg: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
    },
    outline: {
      bg: theme.colors.transparent,
      text: theme.colors.primary,
      border: theme.colors.primary,
    },
    ghost: {
      bg: theme.colors.transparent,
      text: theme.colors.primary,
    },
    danger: {
      bg: theme.colors.error,
      text: theme.colors.white,
    },
  };

  const { height, textStyle } = sizeStyles[size];
  const { bg, text, border } = variantStyles[variant];

  const containerStyle: ViewStyle = {
    height,
    backgroundColor: bg,
    borderRadius: theme.borderRadius.md,
    ...(border ? { borderWidth: 1, borderColor: border } : {}),
    ...(fullWidth ? { alignSelf: 'stretch' as const } : {}),
  };

  const spinnerColor = variant === 'secondary' ? theme.colors.primary : text;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { transform: [{ scale }] },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={animateIn}
        onPressOut={animateOut}
        disabled={disabled || loading}
        style={[styles.container, containerStyle]}
      >
        {loading ? (
          <ActivityIndicator color={spinnerColor} size="small" />
        ) : (
          <View style={styles.content}>
            {icon && <View style={styles.icon}>{icon}</View>}
            <Text style={[styles.label, textStyle, { color: text }]}>{title}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  label: {
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
