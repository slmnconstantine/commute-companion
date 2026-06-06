/**
 * EmptyState
 *
 * A friendly, centred placeholder shown when a list or section
 * has no data.  Includes a large Ionicons icon, title, description,
 * and an optional action button.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import Button from './Button';

interface EmptyStateProps {
  /** Ionicons icon name rendered at the top */
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** Primary headline */
  title: string;
  /** Supporting description */
  message: string;
  /** Optional button label — requires `onAction` */
  actionLabel?: string;
  /** Press handler for the action button */
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons
        name={icon}
        size={64}
        color={theme.colors.textMuted}
        style={styles.icon}
      />

      <Text
        style={[
          styles.title,
          theme.typography.title,
          { color: theme.colors.text },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.message,
          theme.typography.body,
          { color: theme.colors.textMuted },
        ]}
      >
        {message}
      </Text>

      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button title={actionLabel} onPress={onAction} variant="primary" size="md" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    textAlign: 'center',
    marginBottom: 24,
  },
  action: {
    alignSelf: 'stretch',
  },
});
