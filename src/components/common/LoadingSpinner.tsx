/**
 * LoadingSpinner
 *
 * A centred `ActivityIndicator` with optional descriptive text.
 * Can be rendered inline or as a full-screen semi-transparent overlay.
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type SpinnerSize = 'sm' | 'lg';

interface LoadingSpinnerProps {
  /** Spinner diameter preset */
  size?: SpinnerSize;
  /** Optional message displayed below the spinner */
  message?: string;
  /** When true, renders as a full-screen overlay */
  overlay?: boolean;
}

export default function LoadingSpinner({
  size = 'lg',
  message,
  overlay = false,
}: LoadingSpinnerProps) {
  const { theme } = useTheme();

  const indicatorSize = size === 'sm' ? 'small' : 'large';

  const content = (
    <View style={styles.content}>
      <ActivityIndicator size={indicatorSize} color={theme.colors.primary} />
      {message ? (
        <Text
          style={[
            styles.message,
            theme.typography.caption,
            { color: theme.colors.textMuted },
          ]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );

  if (overlay) {
    return (
      <View
        style={[
          styles.overlay,
          { backgroundColor: theme.colors.overlay },
        ]}
      >
        {content}
      </View>
    );
  }

  return <View style={styles.inline}>{content}</View>;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill as any,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inline: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  content: {
    alignItems: 'center',
  },
  message: {
    marginTop: 12,
    textAlign: 'center',
  },
});
