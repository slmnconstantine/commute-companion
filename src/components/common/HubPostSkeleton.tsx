import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';
import { useTheme } from '@/context/ThemeContext';

export default function HubPostSkeleton() {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
      {/* Top Author Row */}
      <View style={styles.authorRow}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.authorMeta}>
          <Skeleton width={120} height={14} borderRadius={4} />
          <Skeleton width={70} height={10} borderRadius={4} style={{ marginTop: 6 }} />
        </View>
      </View>

      {/* Content Text Lines */}
      <View style={styles.contentLines}>
        <Skeleton width="100%" height={14} borderRadius={4} />
        <Skeleton width="85%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
        <Skeleton width="60%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
      </View>

      {/* Bottom Action Stats */}
      <View style={[styles.footerRow, { borderTopColor: theme.colors.border }]}>
        <Skeleton width={60} height={20} borderRadius={10} />
        <Skeleton width={60} height={20} borderRadius={10} />
        <Skeleton width={60} height={20} borderRadius={10} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorMeta: {
    marginLeft: 12,
  },
  contentLines: {
    marginBottom: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
