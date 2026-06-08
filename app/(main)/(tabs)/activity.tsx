/**
 * Activity Tab
 *
 * Shows the user's ride history and upcoming bookings, split into
 * "Upcoming" and "Past" segments. Upcoming displays confirmed or
 * pending bookings, and Past shows completed rides with an option
 * to leave a review.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useRouter } from 'expo-router';
import { getCommuterBookings } from '@/services/bookings';
import { getDriverTrips } from '@/services/trips';
import EmptyState from '@/components/common/EmptyState';
import TripCard from '@/components/ride/TripCard';
import { BookingWithTrip, TripWithDriver } from '@/types/database';
import { formatDepartureTime } from '@/utils/dateFormatter';

// ── Placeholder data ──────────────────────────────────────────────────────────

const SEGMENTS = ['Upcoming', 'Past'] as const;
type Segment = (typeof SEGMENTS)[number];

const STATUS_STYLES: Record<
  BookingWithTrip['status'] | 'open' | 'full' | 'ongoing' | 'cancelled',
  { label: string; colorKey: 'success' | 'warning' | 'info' | 'error' }
> = {
  accepted: { label: 'Accepted', colorKey: 'success' },
  pending: { label: 'Pending', colorKey: 'warning' },
  completed: { label: 'Completed', colorKey: 'info' },
  cancelled: { label: 'Cancelled', colorKey: 'error' },
  rejected: { label: 'Rejected', colorKey: 'error' },
  open: { label: 'Open', colorKey: 'success' },
  full: { label: 'Full', colorKey: 'warning' },
  ongoing: { label: 'Ongoing', colorKey: 'info' },
};

// ── ActivityCard ──────────────────────────────────────────────────────────────

function ActivityCard({
  booking,
  theme,
  onReview,
  onPress,
}: {
  booking: BookingWithTrip;
  theme: ReturnType<typeof useTheme>['theme'];
  onReview?: () => void;
  onPress?: () => void;
}) {
  const statusInfo = STATUS_STYLES[booking.status] || STATUS_STYLES.pending;
  const statusColor = theme.colors[statusInfo.colorKey];

  return (
    <Pressable
      style={[
        styles.activityCard,
        {
          backgroundColor: theme.colors.surface,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <Pressable onPress={onPress}>
      {/* Top row: date / status */}
      <View style={styles.cardTopRow}>
        <View style={styles.dateRow}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={theme.colors.textMuted}
          />
          <Text
            style={[
              theme.typography.small,
              { color: theme.colors.textMuted, marginLeft: 4 },
            ]}
          >
            {formatDepartureTime(booking.trip.departure_time)}
          </Text>
        </View>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: `${statusColor}18` },
          ]}
        >
          <View
            style={[styles.statusDot, { backgroundColor: statusColor }]}
          />
          <Text
            style={[
              theme.typography.small,
              { color: statusColor, fontFamily: 'Inter-Medium' },
            ]}
          >
            {statusInfo.label}
          </Text>
        </View>
      </View>

      {/* Route */}
      <View style={styles.routeSection}>
        <View style={styles.routeIndicator}>
          <View
            style={[styles.routeDotGreen, { backgroundColor: theme.colors.success }]}
          />
          <View
            style={[styles.routeLine, { backgroundColor: theme.colors.border }]}
          />
          <View
            style={[styles.routeDotRed, { backgroundColor: theme.colors.error }]}
          />
        </View>
        <View style={styles.routeLabels}>
          <Text
            style={[theme.typography.caption, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {booking.trip.origin_label.split(',')[0]}
          </Text>
          <Text
            style={[theme.typography.caption, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {booking.trip.destination_label.split(',')[0]}
          </Text>
        </View>
      </View>

      {/* Bottom row */}
      <View
        style={[styles.cardBottomRow, { borderTopColor: theme.colors.border }]}
      >
        <View style={styles.driverRow}>
          <View
            style={[styles.miniAvatar, { backgroundColor: theme.colors.primary }]}
          >
            <Text
              style={{ color: theme.colors.white, fontFamily: 'Inter-SemiBold', fontSize: 10 }}
            >
              {booking.trip.driver?.full_name?.charAt(0) || 'D'}
            </Text>
          </View>
          <Text
            style={[
              theme.typography.small,
              { color: theme.colors.textMuted, marginLeft: 6 },
            ]}
            numberOfLines={1}
          >
            {booking.trip.driver?.full_name}
          </Text>
        </View>

        <Text
          style={[
            theme.typography.subtitle,
            { color: theme.colors.primary },
          ]}
        >
          ₱{booking.trip.fare_per_seat}
        </Text>
      </View>

      {/* Review prompt for past completed rides */}
      {['completed', 'cancelled', 'rejected'].includes(booking.status) && booking.status === 'completed' && (!booking.reviews || booking.reviews.length === 0) && (
        <Pressable
          style={[styles.reviewBtn, { backgroundColor: `${theme.colors.primary}12` }]}
          onPress={onReview}
        >
          <Ionicons name="star-outline" size={16} color={theme.colors.primary} />
          <Text
            style={[
              theme.typography.caption,
              {
                color: theme.colors.primary,
                fontFamily: 'Inter-SemiBold',
                marginLeft: 6,
              },
            ]}
          >
            Leave a Review
          </Text>
        </Pressable>
      )}

      {/* Rating display for already rated rides */}
      {booking.reviews && booking.reviews.length > 0 && (
        <View style={styles.ratingDisplay}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= booking.reviews![0].rating ? 'star' : 'star-outline'}
              size={14}
              color={theme.colors.accent}
              style={{ marginRight: 2 }}
            />
          ))}
          <Text
            style={[
              theme.typography.small,
              { color: theme.colors.textMuted, marginLeft: 4 },
            ]}
          >
            Your rating
          </Text>
        </View>
      )}
      </Pressable>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ActivityScreen() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const { refreshCounts } = useNotifications();

  const [activeSegment, setActiveSegment] = useState<Segment>('Upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<BookingWithTrip[]>([]);
  const [driverTrips, setDriverTrips] = useState<TripWithDriver[]>([]);
  const isDriver = profile?.role === 'driver';
  const router = useRouter();

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const data = await getCommuterBookings(profile.id);
      setBookings(data);
      if (profile.role === 'driver') {
        const dTrips = await getDriverTrips(profile.id);
        setDriverTrips(dTrips);
      }
    } catch (e: any) {
      alert('Error loading activity: ' + (e.message || JSON.stringify(e)));
    }
  }, [profile?.id]);

  React.useEffect(() => {
    loadData();
    refreshCounts(); // refresh badges when tab is opened
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    await refreshCounts();
    setRefreshing(false);
  }, [loadData, refreshCounts]);

  const filteredBookings = bookings
    .filter((b) => b.trip) // Filter out orphaned bookings where trip was deleted
    .filter((b) => {
      if (activeSegment === 'Upcoming') {
        return ['pending', 'accepted', 'open', 'full', 'ongoing'].includes(b.status);
      } else {
        return ['completed', 'cancelled', 'rejected'].includes(b.status);
      }
    })
    .sort((a, b) => {
      // Custom sort: accepted/confirmed on top, pending on bottom, then by closest departure
      if (activeSegment === 'Upcoming') {
        if (a.status === 'accepted' && b.status !== 'accepted') return -1;
        if (a.status !== 'accepted' && b.status === 'accepted') return 1;
      }
      return new Date(a.trip.departure_time).getTime() - new Date(b.trip.departure_time).getTime();
    });

  const filteredDriverTrips = driverTrips.filter((t) => {
    if (activeSegment === 'Upcoming') {
      return ['open', 'full', 'ongoing'].includes(t.status);
    } else {
      return ['completed', 'cancelled'].includes(t.status);
    }
  });

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[theme.typography.heading, { color: theme.colors.text }]}>
          Activity
        </Text>
      </View>

      {/* Segmented control */}
      <View
        style={[
          styles.segmentRow,
          { backgroundColor: theme.colors.inputBackground },
        ]}
      >
        {SEGMENTS.map((seg) => {
          const active = seg === activeSegment;
          return (
            <Pressable
              key={seg}
              style={[
                styles.segmentBtn,
                active && {
                  backgroundColor: theme.colors.surface,
                  shadowColor: theme.colors.shadow,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 1,
                  shadowRadius: 3,
                  elevation: 2,
                },
              ]}
              onPress={() => setActiveSegment(seg)}
            >
              <Text
                style={[
                  theme.typography.caption,
                  {
                    color: active ? theme.colors.primary : theme.colors.textMuted,
                    fontFamily: active ? 'Inter-SemiBold' : 'Inter-Regular',
                  },
                ]}
              >
                {seg}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {filteredBookings.length === 0 && filteredDriverTrips.length === 0 ? (
          <EmptyState
            icon={activeSegment === 'Upcoming' ? 'calendar-outline' : 'time-outline'}
            title={`No ${activeSegment.toLowerCase()} activity`}
            message={activeSegment === 'Upcoming' 
              ? "You don't have any upcoming rides or drives."
              : "Your completed and cancelled rides will appear here."}
          />
        ) : (
          <>
            {filteredDriverTrips.length > 0 && (
              <View style={{ marginBottom: filteredBookings.length > 0 ? 24 : 0 }}>
                {isDriver && <Text style={[theme.typography.caption, { color: theme.colors.textMuted, marginBottom: 12, fontFamily: 'Inter-Medium', paddingLeft: 4 }]}>AS A DRIVER</Text>}
                {filteredDriverTrips.map((trip) => {
                  const tripReviews = trip.bookings?.flatMap(b => b.reviews || []) || [];
                  const avgRating = tripReviews.length > 0 ? (tripReviews.reduce((sum, r) => sum + r.rating, 0) / tripReviews.length).toFixed(1) : null;
                  
                  return (
                    <View key={`driver-${trip.id}`} style={{ marginBottom: 14 }}>
                      <TripCard trip={trip} onPress={() => router.push(`/(main)/ride/${trip.id}`)} />
                      {trip.status === 'completed' && tripReviews.length > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingHorizontal: 4 }}>
                          <View style={{ flexDirection: 'row', backgroundColor: `${theme.colors.accent}15`, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, alignItems: 'center' }}>
                            <Ionicons name="star" color={theme.colors.accent} size={14} />
                            <Text style={{ marginLeft: 6, color: theme.colors.text, fontFamily: 'Inter-SemiBold', fontSize: 13 }}>
                              {avgRating} <Text style={{ fontFamily: 'Inter-Regular', color: theme.colors.textMuted }}>from passengers</Text>
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
            
            {filteredBookings.length > 0 && (
              <View>
                {isDriver && <Text style={[theme.typography.caption, { color: theme.colors.textMuted, marginBottom: 12, fontFamily: 'Inter-Medium', paddingLeft: 4 }]}>AS A PASSENGER</Text>}
                {filteredBookings.map((item) => (
                  <ActivityCard
                    key={`passenger-${item.id}`}
                    booking={item}
                    theme={theme}
                    onPress={() => router.push(`/(main)/ride/${item.trip_id}` as any)}
                    onReview={() => {
                      if (item.status === 'completed' && (!item.reviews || item.reviews.length === 0)) {
                        router.push(`/(main)/ride/review/${item.id}?driverId=${item.trip.driver_id}`);
                      }
                    }}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* Header */
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },

  /* Segment control */
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  /* ScrollView */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  /* Activity card */
  activityCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  /* Route */
  routeSection: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  routeIndicator: {
    alignItems: 'center',
    width: 14,
    marginRight: 10,
    paddingTop: 2,
  },
  routeDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLine: {
    width: 2,
    flex: 1,
    marginVertical: 3,
  },
  routeDotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLabels: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 44,
  },

  /* Bottom row */
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Review Button & Rating */
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 12,
    borderRadius: 8,
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
});
