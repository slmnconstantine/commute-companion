/**
 * TripCard
 *
 * A visually rich card component for displaying a trip in a list.
 * Includes driver info with avatar, route visualization with origin/destination
 * dots, and a bottom info row showing departure time, available seats, and fare.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { TripWithDriver } from '@/types/database';
import { formatDepartureTime } from '@/utils/dateFormatter';
import { formatCurrency } from '@/utils/fareCalculator';
import Avatar from '@/components/common/Avatar';
import Badge from '@/components/common/Badge';

interface TripCardProps {
  trip: TripWithDriver;
  onPress?: () => void;
}

export default function TripCard({ trip, onPress }: TripCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={onPress}
    >
      {/* Driver Info Row */}
      <View style={styles.driverRow}>
        <Avatar
          uri={trip.driver?.avatar_url}
          name={trip.driver?.full_name || 'Driver'}
          size="sm"
          showBadge={trip.driver?.verified_badge}
        />
        <View style={styles.driverInfo}>
          <Text style={[styles.driverName, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
            {trip.driver?.full_name}
          </Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={theme.colors.accent} />
            <Text style={[styles.ratingText, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
              {trip.driver?.rating_avg?.toFixed(1) || 'New'}
            </Text>
          </View>
        </View>
        <Badge
          label={trip.status}
          variant={
            trip.status === 'open' || trip.status === 'full'
              ? 'pending'
              : trip.status === 'ongoing'
                ? 'active'
                : 'completed'
          }
        />
      </View>

      {/* Route */}
      <View style={styles.routeContainer}>
        <View style={styles.routeDots}>
          <View style={[styles.originDot, { backgroundColor: theme.colors.primary }]} />
          <View style={[styles.routeLine, { backgroundColor: theme.colors.border }]} />
          <View style={[styles.destDot, { backgroundColor: theme.colors.accent }]} />
        </View>
        <View style={styles.routeLabels}>
          <Text
            style={[styles.routeText, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]}
            numberOfLines={1}
          >
            {trip.origin_label}
          </Text>
          <Text
            style={[styles.routeText, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]}
            numberOfLines={1}
          >
            {trip.destination_label}
          </Text>
        </View>
      </View>

      {/* Info Row */}
      <View style={[styles.infoRow, { borderTopColor: theme.colors.border }]}>
        <View style={styles.infoItem}>
          <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />
          <Text style={[styles.infoText, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            {formatDepartureTime(trip.departure_time)}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="people-outline" size={16} color={theme.colors.textMuted} />
          <Text style={[styles.infoText, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            {trip.available_seats} seats
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={[styles.fareText, { color: trip.fare_per_seat === 0 ? theme.colors.success : theme.colors.primary, fontFamily: 'Inter-Bold' }]}>
            {trip.fare_per_seat === 0 ? 'FREE' : formatCurrency(trip.fare_per_seat)}
          </Text>
          {trip.fare_per_seat > 0 && (
            <Text style={[styles.perSeat, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
              /seat
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 13,
  },
  routeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  routeDots: {
    alignItems: 'center',
    width: 12,
    paddingVertical: 4,
  },
  originDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  destDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  routeLabels: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 8,
  },
  routeText: {
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
  },
  fareText: {
    fontSize: 16,
  },
  perSeat: {
    fontSize: 12,
  },
});
