import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';
import { useTheme } from '@/context/ThemeContext';

export default function NotificationSkeleton() {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={styles.content}>
        <Skeleton width="65%" height={14} borderRadius={4} />
        <Skeleton width="90%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
        <Skeleton width={80} height={10} borderRadius={4} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flex: 1,
    marginLeft: 14,
  },
});
