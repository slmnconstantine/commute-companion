/**
 * Input
 *
 * A themed text input with floating label, animated border colour
 * transition on focus, optional left/right icons, and inline error messaging.
 */

import React, { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface InputProps {
  /** Label shown above the input */
  label?: string;
  /** Current value */
  value: string;
  /** Text change handler */
  onChangeText: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Validation error message */
  error?: string;
  /** Mask input (passwords) */
  secureTextEntry?: boolean;
  /** Icon rendered inside the left edge */
  leftIcon?: React.ReactNode;
  /** Icon rendered inside the right edge (e.g. eye toggle) */
  rightIcon?: React.ReactNode;
  /** Press handler for the right icon */
  onRightIconPress?: () => void;
  /** Keyboard type hint */
  keyboardType?: KeyboardTypeOptions;
  /** Auto-capitalisation behaviour */
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Enable multi-line editing */
  multiline?: boolean;
  /** Whether the input is editable */
  editable?: boolean;
  /** Extra styles on the outer wrapper */
  style?: StyleProp<ViewStyle>;
}

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  keyboardType,
  autoCapitalize = 'none',
  multiline = false,
  editable = true,
  style,
}: InputProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  // Animated value 0 → unfocused, 1 → focused
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false, // border-color cannot use native driver
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  // Interpolate between default / focused border color
  const borderColor = error
    ? theme.colors.error
    : focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.colors.border, theme.colors.primary],
      });

  return (
    <View style={[styles.root, style]}>
      {label && (
        <Text
          style={[
            styles.label,
            theme.typography.caption,
            { color: error ? theme.colors.error : theme.colors.textMuted },
          ]}
        >
          {label}
        </Text>
      )}

      <Animated.View
        style={[
          styles.inputRow,
          {
            borderColor,
            borderRadius: theme.borderRadius.md,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.textInput,
            theme.typography.body,
            {
              color: theme.colors.text,
              ...(multiline ? { minHeight: 96, textAlignVertical: 'top' as const } : {}),
            },
          ]}
        />

        {rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            style={styles.rightIcon}
            hitSlop={8}
          >
            {rightIcon}
          </Pressable>
        )}
      </Animated.View>

      {error ? (
        <Text
          style={[
            styles.errorText,
            theme.typography.small,
            { color: theme.colors.error },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    overflow: 'hidden',
  },
  leftIcon: {
    paddingLeft: 12,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 12,
    height: '100%',
  },
  rightIcon: {
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 4,
  },
});
