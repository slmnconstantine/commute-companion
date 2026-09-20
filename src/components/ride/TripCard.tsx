/**
 * TripCard
 *
 * A visually rich card component for displaying a trip in a list.
 * Includes driver info with avatar, route visualization with origin/destination
 * dots, and a bottom info row showing departure time, available seats, and fare.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { TripWithDriver } from '@/types/database';
import { formatDepartureTime, isOlderThan24Hours } from '@/utils/dateFormatter';
import { formatCurrency } from '@/utils/fareCalculator';
import Avatar from '@/components/common/Avatar';
import Badge from '@/components/common/Badge';
import Skeleton from '@/components/common/Skeleton';

interface TripCardProps {
  trip?: TripWithDriver;
  onPress?: () => void;
  loading?: boolean;
  isJoined?: boolean;
  userBookingStatus?: string | null;
}

function TripCard({ trip, onPress, loading = false, isJoined, userBookingStatus }: TripCardProps) {
  const { theme, mode } = useTheme();
  const { profile } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, []);

  if (loading || !trip) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.driverRow}>
          <Skeleton width={32} height={32} borderRadius={16} />
          <View style={styles.driverInfo}>
            <Skeleton width={120} height={16} style={{ marginBottom: 6 }} />
            <Skeleton width={80} height={12} />
          </View>
          <View style={styles.badgeRow}>
            <Skeleton width={60} height={24} borderRadius={12} />
          </View>
        </View>

        <View style={styles.routeContainer}>
          <View style={styles.routeDots}>
            <View style={[styles.originDot, { backgroundColor: theme.colors.border }]} />
            <View style={[styles.routeLine, { backgroundColor: theme.colors.border }]} />
            <View style={[styles.destDot, { backgroundColor: theme.colors.border }]} />
          </View>
          <View style={styles.routeLabels}>
            <Skeleton width="80%" height={16} />
            <Skeleton width="60%" height={16} />
          </View>
        </View>

        <View style={[styles.infoRow, { borderTopColor: theme.colors.border }]}>
          <View style={styles.tripMetaContainer}>
            <View style={styles.metaItem}>
              <Skeleton width={90} height={14} />
            </View>
            <View style={styles.metaItem}>
              <Skeleton width={70} height={14} />
            </View>
          </View>
          <View style={styles.fareContainer}>
            <Skeleton width={60} height={20} />
          </View>
        </View>
      </View>
    );
  }

  const isMyPostedRide = profile?.id === trip.driver_id;
  const pendingRequestsCount = isMyPostedRide && trip.bookings
    ? trip.bookings.filter((b) => b.status === 'pending').length
    : 0;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const isExpiredOpen = ['open', 'full'].includes(trip.status) && isOlderThan24Hours(trip.departure_time);
  const effectiveTripStatus = isExpiredOpen ? 'cancelled' : trip.status;

  const userBooking = trip.bookings?.find((b) => b.commuter_id === profile?.id);
  const effectiveIsJoined = Boolean(
    isJoined ||
    userBookingStatus === 'accepted' ||
    userBookingStatus === 'ongoing' ||
    (userBooking && ['accepted', 'ongoing'].includes(userBooking.status))
  );
  const effectiveIsPending = Boolean(
    userBookingStatus === 'pending' ||
    (!effectiveIsJoined && userBooking && userBooking.status === 'pending')
  );

  const getStatusColor = () => {
    if (effectiveTripStatus === 'cancelled') return theme.colors.error;
    if (effectiveIsJoined) return theme.colors.success;
    if (effectiveIsPending) return theme.colors.warning;
    switch (effectiveTripStatus) {
      case 'open': return theme.colors.success;
      case 'full': return theme.colors.warning;
      case 'ongoing': return theme.colors.info;
      case 'completed': return theme.colors.info;
      default: return theme.colors.primary;
    }
  };
  const statusColor = getStatusColor();

  const totalSeatsBooked = trip.bookings ? trip.bookings.filter(b => ['accepted', 'completed', 'dropped_off', 'dropped_off_early'].includes(b.status)).reduce((sum, b) => sum + (b.seats_booked || 1), 0) : 0;
  const originalSeats = trip.available_seats + totalSeatsBooked;
  
  const displaySeats = `${totalSeatsBooked}/${originalSeats} seats filled`;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Trip from ${trip.origin_label} to ${trip.destination_label}. Driven by ${trip.driver?.full_name}. Fare is ${trip.fare_per_seat === 0 ? 'free' : formatCurrency(trip.fare_per_seat)}.`}
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderLeftWidth: 3,
            borderLeftColor: statusColor,
          },
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >

        <View style={[styles.blurContainer, { backgroundColor: theme.colors.glassBackground }]}>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={13} color={theme.colors.accent} />
              <Text style={[styles.ratingText, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                {trip.driver?.rating_avg?.toFixed(1) || 'New'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4, backgroundColor: `${theme.colors.success}15` }}>
              <Ionicons name="shield-checkmark" size={10} color={theme.colors.success} />
              <Text style={{ color: theme.colors.success, fontSize: 9, fontFamily: 'Inter-SemiBold' }}>Live Verified</Text>
            </View>
          </View>
        </View>
        <View style={styles.badgeRow}>
          {pendingRequestsCount > 0 && (
            <View style={[styles.pendingBadge, { backgroundColor: theme.colors.error }]}>
              <Text style={styles.pendingBadgeText}>
                {pendingRequestsCount} new request{pendingRequestsCount !== 1 && 's'}
              </Text>
            </View>
          )}
          {effectiveTripStatus === 'cancelled' ? (
            <Badge
              label="Cancelled"
              variant="cancelled"
            />
          ) : effectiveIsJoined ? (
            <Badge
              label="Joined"
              variant="joined"
            />
          ) : effectiveIsPending ? (
            <Badge
              label="Requested"
              variant="pending"
            />
          ) : (
            <Badge
              label={effectiveTripStatus}
              variant={
                effectiveTripStatus === 'open' || effectiveTripStatus === 'full'
                  ? 'pending'
                  : effectiveTripStatus === 'ongoing'
                    ? 'active'
                    : 'completed'
              }
            />
          )}
        </View>

      </View>

      {/* Route */}
      <View style={styles.routeContainer}>
        <View style={styles.routeDots}>
          <View style={[styles.originDot, { backgroundColor: theme.colors.success }]} />
          <View style={[styles.routeLine, { backgroundColor: theme.colors.border }]} />
          <View style={[styles.destDot, { backgroundColor: theme.colors.error }]} />
        </View>
        <View style={styles.routeLabels}>
          <Text
            style={[styles.routeText, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]}
            numberOfLines={1}
          >
            {trip.origin_label.split(',')[0]}
          </Text>
          <Text
            style={[styles.routeText, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]}
            numberOfLines={1}
          >
            {trip.destination_label.split(',')[0]}
          </Text>
        </View>
      </View>

      {/* Driver Note / Preference */}
      {Boolean(trip.description) && (
        <View
          style={[
            styles.descriptionRow,
            {
              backgroundColor: `${theme.colors.primary}0D`,
              borderColor: `${theme.colors.primary}25`,
            },
          ]}
        >
          <Ionicons name="chatbox-ellipses-outline" size={13} color={theme.colors.primary} />
          <Text
            style={[styles.descriptionText, { color: theme.colors.text }]}
            numberOfLines={2}
          >
            {trip.description}
          </Text>
        </View>
      )}

      {/* Info Row */}
      <View style={[styles.infoRow, { borderTopColor: theme.colors.border }]}>
        <View style={styles.tripMetaContainer}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={15} color={theme.colors.textMuted} />
            <Text style={[styles.infoText, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>
              {formatDepartureTime(trip.departure_time)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={15} color={theme.colors.textMuted} />
            <Text style={[styles.infoText, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
              {displaySeats}
            </Text>
          </View>
        </View>

        <View style={styles.fareContainer}>
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
      </View>
    </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  blurContainer: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  accentGlow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Inter-Bold',
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
    gap: 12,
  },
  tripMetaContainer: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
  },
  fareContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 8,
  },
  fareText: {
    fontSize: 18,
  },
  perSeat: {
    fontSize: 11,
    marginTop: -2,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  descriptionText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});

export default React.memo(TripCard);
