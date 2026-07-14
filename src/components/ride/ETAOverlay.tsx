import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ETAOverlayProps {
  distanceKm: number;
  etaMinutes: number;
  theme: any;
}

export default function ETAOverlay({ distanceKm, etaMinutes, theme }: ETAOverlayProps) {
  const formatETA = (min: number) => {
    if (min < 1) return '< 1 min';
    if (min >= 60) {
      const hrs = Math.floor(min / 60);
      const mins = min % 60;
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }
    return `${Math.round(min)} min`;
  };

  const formatDist = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)} km`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface + 'E6', borderColor: theme.colors.border }]}>
      <View style={styles.row}>
        <View style={styles.item}>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + '20' }]}>
            <Ionicons name="navigate" size={14} color={theme.colors.primary} />
          </View>
          <Text style={[styles.value, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
            {formatDist(distanceKm)}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        <View style={styles.item}>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.accent + '20' }]}>
            <Ionicons name="time" size={14} color={theme.colors.accent} />
          </View>
          <Text style={[styles.value, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
            {formatETA(etaMinutes)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 14,
  },
  divider: {
    width: 1,
    height: 20,
  },
});
