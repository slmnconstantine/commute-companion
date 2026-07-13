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
import { useRouter, useFocusEffect } from 'expo-router';
import { getCommuterBookings } from '@/services/bookings';
import { getDriverTrips } from '@/services/trips';
import EmptyState from '@/components/common/EmptyState';
import Skeleton from '@/components/common/Skeleton';
import TripCard from '@/components/ride/TripCard';
import Avatar from '@/components/common/Avatar';
import { BookingWithTrip, TripWithDriver } from '@/types/database';
import { formatDepartureTime } from '@/utils/dateFormatter';
import AnimatedSegmentControl from '@/components/common/AnimatedSegmentControl';

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
      onPress={onPress}
      style={({ pressed }) => [
        styles.activityCard,
        {
          backgroundColor: theme.colors.surface,
          shadowColor: theme.colors.shadow,
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          borderLeftWidth: 3,
          borderLeftColor: statusColor,
        },
      ]}
    >
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
          <Avatar
            uri={booking.trip.driver?.avatar_url}
            name={booking.trip.driver?.full_name || 'Driver'}
            size="sm"
            showBadge={booking.trip.driver?.verified_badge}
          />
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
      {booking.status === 'completed' && (!booking.reviews || booking.reviews.length === 0) && (
        <Pressable
          style={[styles.reviewBtn, { backgroundColor: `${theme.colors.primary}12` }]}
          onPress={(e) => {
            e.stopPropagation();
            onReview?.();
          }}
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
  );
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────

function ActivitySkeletonCard({ theme }: { theme: any }) {
  return (
    <View style={[styles.activityCard, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
      <View style={styles.cardTopRow}>
        <Skeleton width={100} height={14} />
        <Skeleton width={70} height={22} borderRadius={12} />
      </View>
      <View style={styles.routeSection}>
        <View style={styles.routeIndicator}>
          <Skeleton width={10} height={10} borderRadius={5} />
          <View style={[styles.routeLine, { backgroundColor: theme.colors.border }]} />
          <Skeleton width={10} height={10} borderRadius={5} />
        </View>
        <View style={[styles.routeLabels, { gap: 8 }]}>
          <Skeleton width="80%" height={14} />
          <Skeleton width="60%" height={14} />
        </View>
      </View>
      <View style={[styles.cardBottomRow, { borderTopColor: theme.colors.border }]}>
        <View style={styles.driverRow}>
          <Skeleton width={28} height={28} borderRadius={14} />
          <Skeleton width={80} height={12} style={{ marginLeft: 6 }} />
        </View>
        <Skeleton width={50} height={18} />
      </View>
    </View>
  );
}

// ── Date Grouping Utility ─────────────────────────────────────────────────────

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= weekAgo) return 'This Week';
  return date.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ActivityScreen() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const { refreshCounts } = useNotifications();

  const [activeSegment, setActiveSegment] = useState<Segment>('Upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingWithTrip[]>([]);
  const [driverTrips, setDriverTrips] = useState<TripWithDriver[]>([]);
  const [driverLimit, setDriverLimit] = useState(5);
  const [passengerLimit, setPassengerLimit] = useState(5);
  const isDriver = profile?.role === 'driver';
  const router = useRouter();

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const data = await getCommuterBookings(profile.id);
      setBookings(data);
      if (profile.role === 'driver') {
        const dTrips = await getDriverTrips(profile.id);
        setDriverTrips(dTrips);
      }
    } catch (e: any) {
      alert('Error loading activity: ' + (e.message || JSON.stringify(e)));
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      refreshCounts(); // refresh badges when tab is opened
    }, [loadData])
  );

  React.useEffect(() => {
    setDriverLimit(5);
    setPassengerLimit(5);
  }, [activeSegment]);

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
      if (activeSegment === 'Upcoming') {
        // Custom sort: accepted/confirmed on top, pending on bottom, then by closest departure
        if (a.status === 'accepted' && b.status !== 'accepted') return -1;
        if (a.status !== 'accepted' && b.status === 'accepted') return 1;
        return new Date(a.trip.departure_time).getTime() - new Date(b.trip.departure_time).getTime();
      } else {
        // Past activity: sort by descending departure time (most recent first)
        return new Date(b.trip.departure_time).getTime() - new Date(a.trip.departure_time).getTime();
      }
    });

  const filteredDriverTrips = driverTrips
    .filter((t) => {
      if (activeSegment === 'Upcoming') {
        return ['open', 'full', 'ongoing'].includes(t.status);
      } else {
        return ['completed', 'cancelled'].includes(t.status);
      }
    })
    .sort((a, b) => {
      if (activeSegment === 'Upcoming') {
        return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime();
      } else {
        return new Date(b.departure_time).getTime() - new Date(a.departure_time).getTime();
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
      <AnimatedSegmentControl
        segments={SEGMENTS}
        activeSegment={activeSegment}
        onSegmentChange={setActiveSegment}
        primaryColor={theme.colors.primary}
        backgroundColor={theme.colors.inputBackground}
        activeTextColor="#fff"
        inactiveTextColor={theme.colors.textMuted}
        style={{ marginHorizontal: 20, marginBottom: 16 }}
      />

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
        {loading ? (
          <>
            <ActivitySkeletonCard theme={theme} />
            <ActivitySkeletonCard theme={theme} />
            <ActivitySkeletonCard theme={theme} />
          </>
        ) : filteredBookings.length === 0 && filteredDriverTrips.length === 0 ? (
          <EmptyState
            icon={activeSegment === 'Upcoming' ? 'calendar-outline' : 'time-outline'}
            title={`No ${activeSegment.toLowerCase()} activity`}
            message={activeSegment === 'Upcoming' 
              ? "You don't have any upcoming rides or drives."
              : "Your completed and cancelled rides will appear here."}
          />
        ) : (
          <>
            {(() => {
              const visibleDriverTrips = filteredDriverTrips.slice(0, driverLimit);
              const visibleBookings = filteredBookings.slice(0, passengerLimit);
              const hasMoreDriver = filteredDriverTrips.length > driverLimit;
              const hasMorePassenger = filteredBookings.length > passengerLimit;

              return (
                <>
                  {filteredDriverTrips.length > 0 && (
                    <View style={styles.driverSectionWrap}>
                      {isDriver && <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>AS A DRIVER</Text>}
                      {visibleDriverTrips.map((trip) => {
                        const tripReviews = trip.bookings?.flatMap(b => b.reviews || []) || [];
                        const avgRating = tripReviews.length > 0 ? (tripReviews.reduce((sum, r) => sum + r.rating, 0) / tripReviews.length).toFixed(1) : null;
                        
                        return (
                          <View key={`driver-${trip.id}`} style={styles.tripItemWrap}>
                            <TripCard trip={trip} onPress={() => router.push(`/(main)/ride/${trip.id}`)} />
                            {trip.status === 'completed' && tripReviews.length > 0 && (
                              <View style={styles.tripRatingRow}>
                                <View style={[styles.tripRatingBadge, { backgroundColor: `${theme.colors.accent}15` }]}>
                                  <Ionicons name="star" color={theme.colors.accent} size={14} />
                                  <Text style={[styles.tripRatingText, { color: theme.colors.text }]}>
                                    {avgRating} <Text style={[styles.tripRatingMuted, { color: theme.colors.textMuted }]}>from passengers</Text>
                                  </Text>
                                </View>
                              </View>
                            )}
                          </View>
                        );
                      })}
                      
                      {hasMoreDriver && (
                        <Pressable
                          style={({ pressed }) => [
                            styles.showMoreBtn,
                            {
                              backgroundColor: theme.colors.surface,
                              borderColor: theme.colors.border,
                              opacity: pressed ? 0.8 : 1,
                            }
                          ]}
                          onPress={() => setDriverLimit((prev) => prev + 5)}
                        >
                          <Text style={[styles.showMoreText, { color: theme.colors.primary, fontFamily: 'Inter-SemiBold' }]}>
                            Show More Driver Activity
                          </Text>
                          <Ionicons name="chevron-down" size={16} color={theme.colors.primary} />
                        </Pressable>
                      )}
                    </View>
                  )}
                  
                  {filteredBookings.length > 0 && (
                    <View>
                      {isDriver && <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>AS A PASSENGER</Text>}
                      {visibleBookings.map((item) => (
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

                      {hasMorePassenger && (
                        <Pressable
                          style={({ pressed }) => [
                            styles.showMoreBtn,
                            {
                              backgroundColor: theme.colors.surface,
                              borderColor: theme.colors.border,
                              opacity: pressed ? 0.8 : 1,
                            }
                          ]}
                          onPress={() => setPassengerLimit((prev) => prev + 5)}
                        >
                          <Text style={[styles.showMoreText, { color: theme.colors.primary, fontFamily: 'Inter-SemiBold' }]}>
                            Show More Passenger Activity
                          </Text>
                          <Ionicons name="chevron-down" size={16} color={theme.colors.primary} />
                        </Pressable>
                      )}
                    </View>
                  )}
                </>
              );
            })()}
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
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  showMoreText: {
    fontSize: 14,
  },

  /* Extracted inline styles */
  driverSectionWrap: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    marginBottom: 12,
    paddingLeft: 4,
    letterSpacing: 0.5,
  },
  tripItemWrap: {
    marginBottom: 14,
  },
  tripRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  tripRatingBadge: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  tripRatingText: {
    marginLeft: 6,
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  tripRatingMuted: {
    fontFamily: 'Inter-Regular',
  },
});
