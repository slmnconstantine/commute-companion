/**
 * TripStatusBadge
 *
 * A richer variant of the generic Badge component, specifically designed
 * for trip statuses.  Each status maps to a unique colour + Ionicon,
 * giving users an instant visual cue for the trip's lifecycle stage.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import type { Trip } from '@/types/database';

type TripStatus = Trip['status'];

interface TripStatusBadgeProps {
  /** Current trip status */
  status: TripStatus;
  /** Optional size preset */
  size?: 'sm' | 'md';
}

interface StatusConfig {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}

/** Map each status to its icon and human-readable label */
const STATUS_CONFIG: Record<TripStatus, StatusConfig> = {
  open: { icon: 'calendar-outline', label: 'Open' },
  full: { icon: 'people-outline', label: 'Full' },
  ongoing: { icon: 'car-outline', label: 'Ongoing' },
  completed: { icon: 'checkmark-circle-outline', label: 'Completed' },
  cancelled: { icon: 'close-circle-outline', label: 'Cancelled' },
};

/** Convert a hex colour to rgba with given alpha */
function hexToRgba(hex: string, alpha: number): string {
  const sanitised = hex.replace('#', '');
  const r = parseInt(sanitised.substring(0, 2), 16);
  const g = parseInt(sanitised.substring(2, 4), 16);
  const b = parseInt(sanitised.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function TripStatusBadge({ status, size = 'md' }: TripStatusBadgeProps) {
  const { theme } = useTheme();

  const config = STATUS_CONFIG[status];

  /** Resolve status → colour from the theme palette */
  const getStatusColor = (): string => {
    switch (status) {
      case 'open':
        return theme.colors.info;
      case 'full':
        return theme.colors.success;
      case 'ongoing':
        return theme.colors.warning;
      case 'completed':
        return theme.colors.textMuted;
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.textMuted;
    }
  };

  const color = getStatusColor();
  const isSmall = size === 'sm';
  const iconSize = isSmall ? 12 : 16;

  return (
    <View
      style={[
        styles.container,
        isSmall ? styles.containerSm : styles.containerMd,
        { backgroundColor: hexToRgba(color, 0.12) },
      ]}
    >
      <Ionicons name={config.icon} size={iconSize} color={color} />
      <Text
        style={[
          isSmall ? styles.labelSm : styles.labelMd,
          { color, fontFamily: 'Inter-SemiBold' },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
  },
  containerSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  containerMd: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  labelSm: {
    fontSize: 11,
  },
  labelMd: {
    fontSize: 13,
  },
});
