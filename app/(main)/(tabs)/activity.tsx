/**
 * Activity & Transactions Tab
 *
 * Provides a comprehensive, organized transaction history management hub for both
 * commuters and drivers. Features:
 * - 4 Dedicated Tabs: Active/Upcoming, Completed, Cancelled, and Archived
 * - 24-Hour Auto-Archive Rule: Completed transactions > 24 hours old are moved to Archived
 * - Multi-criteria Filtering & Search: Location search, Role filter, Payment status, Date range
 * - Pagination / "Load More" controls
 * - CSV Export
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  Modal,
  DeviceEventEmitter,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { getCommuterBookings } from '@/services/bookings';
import { getDriverTrips, cancelExpiredTrips } from '@/services/trips';
import EmptyState from '@/components/common/EmptyState';
import Skeleton from '@/components/common/Skeleton';
import TripCard from '@/components/ride/TripCard';
import Avatar from '@/components/common/Avatar';
import { BookingWithTrip, TripWithDriver } from '@/types/database';
import { exportTripsAsCSV } from '@/utils/exportHistory';
import AnimatedListItem from '@/components/common/AnimatedListItem';
import { formatDepartureTime } from '@/utils/dateFormatter';
import AnimatedSegmentControl from '@/components/common/AnimatedSegmentControl';
import BouncyPressable from '@/components/common/BouncyPressable';

// ── Segment & Filter Types ───────────────────────────────────────────────────

const SEGMENTS = ['Active', 'Completed', 'Cancelled', 'Archived'] as const;
type Segment = (typeof SEGMENTS)[number];

type RoleFilter = 'all' | 'driver' | 'commuter';
type PaymentFilter = 'all' | 'paid' | 'free';
type DatePreset = 'all' | 'today' | 'week' | 'month' | 'last30' | 'custom';

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
  dropped_off_early: { label: 'Dropped Off Early', colorKey: 'warning' },
};

// Helper: 24-Hour Auto-Archive check
function isOlderThan24Hours(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return false;
  return Date.now() - time > 24 * 60 * 60 * 1000;
}

// Helper: Date range filter match
function matchesDatePreset(
  dateStr: string,
  preset: DatePreset,
  customStart: string,
  customEnd: string
): boolean {
  if (preset === 'all') return true;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  const now = new Date();

  switch (preset) {
    case 'today':
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    case 'week': {
      const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
      return date >= oneWeekAgo && date <= now;
    }
    case 'month':
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    case 'last30': {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
      return date >= thirtyDaysAgo && date <= now;
    }
    case 'custom': {
      if (customStart) {
        const start = new Date(customStart);
        if (!isNaN(start.getTime()) && date < start) return false;
      }
      if (customEnd) {
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        if (!isNaN(end.getTime()) && date > end) return false;
      }
      return true;
    }
    default:
      return true;
  }
}

// ── Commuter Activity Card Component ──────────────────────────────────────────

const ActivityCard = React.memo(function ActivityCard({
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
  const isTripExpiredOpen = ['open', 'full'].includes(booking.trip?.status) && isOlderThan24Hours(booking.trip?.departure_time);
  const isTripCancelled = booking.trip?.status === 'cancelled';
  const effectiveStatus = (isTripExpiredOpen || isTripCancelled) && (booking.status === 'pending' || booking.status === 'accepted')
    ? 'cancelled'
    : booking.status;
  const statusInfo = STATUS_STYLES[effectiveStatus] || STATUS_STYLES.pending;
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

        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={[
              theme.typography.subtitle,
              { color: booking.fare_paid === 0 ? theme.colors.success : theme.colors.primary },
            ]}
          >
            {booking.fare_paid === 0 ? 'FREE' : `₱${booking.fare_paid}`}
          </Text>
          {booking.seats_booked > 1 && (
            <Text style={[styles.seatsBookedText, { color: theme.colors.textMuted }]}>
              {booking.seats_booked} seats
            </Text>
          )}
        </View>
      </View>

      {/* Action buttons for completed rides */}
      {booking.status === 'completed' && (
        <View style={styles.cardActionsRow}>
          {(!booking.reviews || booking.reviews.length === 0) ? (
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
          ) : (
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
                Rated {booking.reviews![0].rating}★
              </Text>
            </View>
          )}

          <Pressable
            style={[styles.receiptBtn, { backgroundColor: `${theme.colors.success}12` }]}
            onPress={(e) => {
              e.stopPropagation();
              const { router } = require('expo-router');
              router.push(`/(main)/ride/trip-summary?tripId=${booking.trip_id}` as any);
            }}
          >
            <Ionicons name="receipt-outline" size={15} color={theme.colors.success} />
            <Text
              style={[
                theme.typography.caption,
                {
                  color: theme.colors.success,
                  fontFamily: 'Inter-SemiBold',
                  marginLeft: 4,
                },
              ]}
            >
              Receipt
            </Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
});

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

// ── Main Screen ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 6;

export default function ActivityScreen() {
  const { theme, mode } = useTheme();
  const { profile } = useAuth();
  const { refreshCounts } = useNotifications();
  const router = useRouter();

  // Primary Tab Segment
  const [activeSegment, setActiveSegment] = useState<Segment>('Active');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Pagination limits
  const [driverLimit, setDriverLimit] = useState(PAGE_SIZE);
  const [passengerLimit, setPassengerLimit] = useState(PAGE_SIZE);

  // Data Loading
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingWithTrip[]>([]);
  const [driverTrips, setDriverTrips] = useState<TripWithDriver[]>([]);
  const isDriver = profile?.role === 'driver';

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      await cancelExpiredTrips().catch((err) => {
        console.warn('cancelExpiredTrips error in activity loadData:', err);
      });
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
  }, [profile?.id, profile?.role]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      refreshCounts();
    }, [loadData, refreshCounts])
  );

  React.useEffect(() => {
    const sub = DeviceEventEmitter.addListener('refresh_data', () => {
      loadData();
      refreshCounts();
    });
    return () => sub.remove();
  }, [loadData, refreshCounts]);

  // Reset pagination limits when segment or filters change
  React.useEffect(() => {
    setDriverLimit(PAGE_SIZE);
    setPassengerLimit(PAGE_SIZE);
  }, [activeSegment, searchQuery, roleFilter, paymentFilter, datePreset, customStart, customEnd]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    await refreshCounts();
    setRefreshing(false);
  }, [loadData, refreshCounts]);

  // Active filter count for badge indicator
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (roleFilter !== 'all') count++;
    if (paymentFilter !== 'all') count++;
    if (datePreset !== 'all') count++;
    return count;
  }, [roleFilter, paymentFilter, datePreset]);

  const handleResetFilters = () => {
    setRoleFilter('all');
    setPaymentFilter('all');
    setDatePreset('all');
    setCustomStart('');
    setCustomEnd('');
    setSearchQuery('');
  };

  // ── Commuter Bookings Filtering ──────────────────────────────────────────
  const filteredBookings = useMemo(() => {
    if (roleFilter === 'driver') return [];

    return bookings
      .filter((b) => Boolean(b.trip))
      .filter((b) => {
        const departureTime = b.trip.departure_time || b.created_at;
        const olderThan24h = isOlderThan24Hours(departureTime);
        const isTripExpiredOpen = ['open', 'full'].includes(b.trip.status) && olderThan24h;
        const isTripCancelled = b.trip.status === 'cancelled';
        const isBookingCancelled = ['cancelled', 'rejected', 'dropped_off_early'].includes(b.status);

        // 4 Segment Categorization with 24-Hour Auto-Archive Rule & Auto-Cancellation
        if (activeSegment === 'Active') {
          if (isTripExpiredOpen || isTripCancelled || isBookingCancelled) return false;
          return ['pending', 'accepted', 'open', 'full', 'ongoing'].includes(b.status);
        } else if (activeSegment === 'Completed') {
          return b.status === 'completed' && !olderThan24h;
        } else if (activeSegment === 'Cancelled') {
          return isBookingCancelled || isTripCancelled || isTripExpiredOpen;
        } else if (activeSegment === 'Archived') {
          return b.status === 'completed' && olderThan24h;
        }
        return true;
      })
      .filter((b) => {
        // Search Query (origin, destination, driver name)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchOrigin = b.trip.origin_label?.toLowerCase().includes(q);
          const matchDest = b.trip.destination_label?.toLowerCase().includes(q);
          const matchDriver = b.trip.driver?.full_name?.toLowerCase().includes(q);
          if (!matchOrigin && !matchDest && !matchDriver) return false;
        }

        // Payment status filter
        if (paymentFilter === 'free' && b.fare_paid > 0) return false;
        if (paymentFilter === 'paid' && b.fare_paid === 0) return false;

        // Date Range preset
        const depTime = b.trip.departure_time || b.created_at;
        if (!matchesDatePreset(depTime, datePreset, customStart, customEnd)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (activeSegment === 'Active') {
          if (a.status === 'accepted' && b.status !== 'accepted') return -1;
          if (a.status !== 'accepted' && b.status === 'accepted') return 1;
          return new Date(a.trip.departure_time).getTime() - new Date(b.trip.departure_time).getTime();
        } else {
          return new Date(b.trip.departure_time).getTime() - new Date(a.trip.departure_time).getTime();
        }
      });
  }, [bookings, activeSegment, roleFilter, searchQuery, paymentFilter, datePreset, customStart, customEnd]);

  // ── Driver Trips Filtering ──────────────────────────────────────────────
  const filteredDriverTrips = useMemo(() => {
    if (roleFilter === 'commuter' || !isDriver) return [];

    return driverTrips
      .filter((t) => {
        const departureTime = t.departure_time || t.created_at;
        const olderThan24h = isOlderThan24Hours(departureTime);
        const isExpiredOpen = ['open', 'full'].includes(t.status) && olderThan24h;
        const isCancelled = t.status === 'cancelled';

        // 4 Segment Categorization with 24-Hour Auto-Archive Rule & Auto-Cancellation
        if (activeSegment === 'Active') {
          if (isExpiredOpen || isCancelled) return false;
          return ['open', 'full', 'ongoing'].includes(t.status);
        } else if (activeSegment === 'Completed') {
          return t.status === 'completed' && !olderThan24h;
        } else if (activeSegment === 'Cancelled') {
          return isCancelled || isExpiredOpen;
        } else if (activeSegment === 'Archived') {
          return t.status === 'completed' && olderThan24h;
        }
        return true;
      })
      .filter((t) => {
        // Search Query (origin, destination)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchOrigin = t.origin_label?.toLowerCase().includes(q);
          const matchDest = t.destination_label?.toLowerCase().includes(q);
          if (!matchOrigin && !matchDest) return false;
        }

        // Payment filter
        if (paymentFilter === 'free' && t.fare_per_seat > 0) return false;
        if (paymentFilter === 'paid' && t.fare_per_seat === 0) return false;

        // Date Range preset
        const depTime = t.departure_time || t.created_at;
        if (!matchesDatePreset(depTime, datePreset, customStart, customEnd)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (activeSegment === 'Active') {
          return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime();
        } else {
          return new Date(b.departure_time).getTime() - new Date(a.departure_time).getTime();
        }
      });
  }, [driverTrips, activeSegment, roleFilter, isDriver, searchQuery, paymentFilter, datePreset, customStart, customEnd]);


  // Total count for current view
  const totalCount = filteredBookings.length + filteredDriverTrips.length;

  const handleExportCSV = async () => {
    try {
      if (filteredBookings.length > 0) {
        await exportTripsAsCSV(filteredBookings, 'commuter');
      } else if (filteredDriverTrips.length > 0) {
        await exportTripsAsCSV(filteredDriverTrips, 'driver');
      } else {
        Alert.alert('No Data', 'There are no transactions to export for this view.');
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e.message || 'Could not export records.');
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      {/* ── Top Header ────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={[theme.typography.heading, { color: theme.colors.text }]}>
            Transactions & Activity
          </Text>
          <Text style={[styles.headerSubtext, { color: theme.colors.textMuted }]}>
            {loading ? 'Updating...' : `${totalCount} ${totalCount === 1 ? 'record' : 'records'} found`}
          </Text>
        </View>
      </View>

      {/* ── Search Bar & Filter Button ────────────────────────────── */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            placeholder="Search by pickup, drop-off, or name…"
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.colors.text }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </Pressable>
          )}
        </View>

        <BouncyPressable
          scaleTo={0.92}
          onPress={() => setShowFilterModal(true)}
          style={[
            styles.filterBtn,
            {
              backgroundColor: activeFiltersCount > 0 ? theme.colors.primary : theme.colors.surface,
              borderColor: activeFiltersCount > 0 ? theme.colors.primary : theme.colors.border,
            },
          ]}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={activeFiltersCount > 0 ? '#fff' : theme.colors.text}
          />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </BouncyPressable>
      </View>

      {/* ── Active Filter Chips (if any) ─────────────────────────── */}
      {(activeFiltersCount > 0 || searchQuery.length > 0) && (
        <View style={styles.activeChipsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {roleFilter !== 'all' && (
              <View style={[styles.filterChip, { backgroundColor: `${theme.colors.primary}18`, borderColor: theme.colors.primary }]}>
                <Text style={[styles.filterChipText, { color: theme.colors.primary }]}>
                  {roleFilter === 'driver' ? 'Driver' : 'Commuter'}
                </Text>
                <Pressable onPress={() => setRoleFilter('all')} hitSlop={6}>
                  <Ionicons name="close" size={14} color={theme.colors.primary} />
                </Pressable>
              </View>
            )}
            {paymentFilter !== 'all' && (
              <View style={[styles.filterChip, { backgroundColor: `${theme.colors.primary}18`, borderColor: theme.colors.primary }]}>
                <Text style={[styles.filterChipText, { color: theme.colors.primary }]}>
                  {paymentFilter === 'free' ? 'Free Only' : 'Paid Only'}
                </Text>
                <Pressable onPress={() => setPaymentFilter('all')} hitSlop={6}>
                  <Ionicons name="close" size={14} color={theme.colors.primary} />
                </Pressable>
              </View>
            )}
            {datePreset !== 'all' && (
              <View style={[styles.filterChip, { backgroundColor: `${theme.colors.primary}18`, borderColor: theme.colors.primary }]}>
                <Text style={[styles.filterChipText, { color: theme.colors.primary }]}>
                  {datePreset === 'today' ? 'Today' : datePreset === 'week' ? 'This Week' : datePreset === 'month' ? 'This Month' : datePreset === 'last30' ? 'Last 30 Days' : 'Custom Dates'}
                </Text>
                <Pressable onPress={() => setDatePreset('all')} hitSlop={6}>
                  <Ionicons name="close" size={14} color={theme.colors.primary} />
                </Pressable>
              </View>
            )}
            {searchQuery.length > 0 && (
              <View style={[styles.filterChip, { backgroundColor: `${theme.colors.textMuted}18`, borderColor: theme.colors.border }]}>
                <Text style={[styles.filterChipText, { color: theme.colors.text }]}>
                  "{searchQuery}"
                </Text>
                <Pressable onPress={() => setSearchQuery('')} hitSlop={6}>
                  <Ionicons name="close" size={14} color={theme.colors.text} />
                </Pressable>
              </View>
            )}
            <Pressable onPress={handleResetFilters} style={styles.clearAllBtn}>
              <Text style={[styles.clearAllText, { color: theme.colors.primary }]}>Reset</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {/* ── 4 Segment Control ─────────────────────────────────────── */}
      <AnimatedSegmentControl
        segments={SEGMENTS}
        activeSegment={activeSegment}
        onSegmentChange={setActiveSegment}
        primaryColor={theme.colors.primary}
        backgroundColor={theme.colors.inputBackground}
        activeTextColor="#fff"
        inactiveTextColor={theme.colors.textMuted}
        fontSize={12}
        style={{ marginHorizontal: 20, marginBottom: 12 }}
      />

      {/* ── Main List Content ─────────────────────────────────────── */}
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
            icon={
              activeSegment === 'Active'
                ? 'calendar-outline'
                : activeSegment === 'Completed'
                ? 'checkmark-done-circle-outline'
                : activeSegment === 'Cancelled'
                ? 'close-circle-outline'
                : 'archive-outline'
            }
            title={
              activeFiltersCount > 0 || searchQuery.length > 0
                ? 'No matching transactions'
                : activeSegment === 'Active'
                ? 'No active rides'
                : activeSegment === 'Completed'
                ? 'No recent completed rides'
                : activeSegment === 'Cancelled'
                ? 'No cancelled transactions'
                : 'No archived transactions'
            }
            message={
              activeFiltersCount > 0 || searchQuery.length > 0
                ? 'Try adjusting your search query or reset your filters.'
                : activeSegment === 'Active'
                ? "You don't have any upcoming or ongoing carpool rides."
                : activeSegment === 'Completed'
                ? 'Rides completed within the last 24 hours appear here. Older completed rides are automatically archived.'
                : activeSegment === 'Cancelled'
                ? 'Declined or cancelled ride records will appear here.'
                : 'Completed transactions older than 24 hours are stored here for your records.'
            }
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
                  {/* Driver Section */}
                  {filteredDriverTrips.length > 0 && (
                    <View style={styles.driverSectionWrap}>
                      {isDriver && (
                        <View style={styles.roleSectionHeader}>
                          <Ionicons name="car" size={16} color={theme.colors.primary} />
                          <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
                            AS A DRIVER ({filteredDriverTrips.length})
                          </Text>
                        </View>
                      )}
                      {visibleDriverTrips.map((trip, index) => {
                        const tripReviews = trip.bookings?.flatMap((b) => b.reviews || []) || [];
                        const avgRating =
                          tripReviews.length > 0
                            ? (tripReviews.reduce((sum, r) => sum + r.rating, 0) / tripReviews.length).toFixed(1)
                            : null;

                        return (
                          <AnimatedListItem key={`driver-${trip.id}`} index={index}>
                            <View style={styles.tripItemWrap}>
                              <TripCard trip={trip} onPress={() => router.push(`/(main)/ride/${trip.id}`)} />
                              {trip.status === 'completed' && tripReviews.length > 0 && (
                                <View style={styles.tripRatingRow}>
                                  <View style={[styles.tripRatingBadge, { backgroundColor: `${theme.colors.accent}15` }]}>
                                    <Ionicons name="star" color={theme.colors.accent} size={14} />
                                    <Text style={[styles.tripRatingText, { color: theme.colors.text }]}>
                                      {avgRating}{' '}
                                      <Text style={[styles.tripRatingMuted, { color: theme.colors.textMuted }]}>
                                        from passengers
                                      </Text>
                                    </Text>
                                  </View>
                                </View>
                              )}
                            </View>
                          </AnimatedListItem>
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
                            },
                          ]}
                          onPress={() => setDriverLimit((prev) => prev + PAGE_SIZE)}
                        >
                          <Text style={[styles.showMoreText, { color: theme.colors.primary, fontFamily: 'Inter-SemiBold' }]}>
                            Load More Driver Activity ({visibleDriverTrips.length} of {filteredDriverTrips.length})
                          </Text>
                          <Ionicons name="chevron-down" size={16} color={theme.colors.primary} />
                        </Pressable>
                      )}
                    </View>
                  )}

                  {/* Passenger Section */}
                  {filteredBookings.length > 0 && (
                    <View>
                      {isDriver && (
                        <View style={styles.roleSectionHeader}>
                          <Ionicons name="people" size={16} color={theme.colors.primary} />
                          <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
                            AS A PASSENGER ({filteredBookings.length})
                          </Text>
                        </View>
                      )}
                      {visibleBookings.map((item, index) => (
                        <AnimatedListItem
                          key={`passenger-${item.id}`}
                          index={index + (filteredDriverTrips.length > 0 ? visibleDriverTrips.length : 0)}
                        >
                          <ActivityCard
                            booking={item}
                            theme={theme}
                            onPress={() => router.push(`/(main)/ride/${item.trip_id}` as any)}
                            onReview={() => {
                              if (item.status === 'completed' && (!item.reviews || item.reviews.length === 0)) {
                                router.push(`/(main)/ride/review/${item.id}?driverId=${item.trip.driver_id}`);
                              }
                            }}
                          />
                        </AnimatedListItem>
                      ))}

                      {hasMorePassenger && (
                        <Pressable
                          style={({ pressed }) => [
                            styles.showMoreBtn,
                            {
                              backgroundColor: theme.colors.surface,
                              borderColor: theme.colors.border,
                              opacity: pressed ? 0.8 : 1,
                            },
                          ]}
                          onPress={() => setPassengerLimit((prev) => prev + PAGE_SIZE)}
                        >
                          <Text style={[styles.showMoreText, { color: theme.colors.primary, fontFamily: 'Inter-SemiBold' }]}>
                            Load More Passenger Activity ({visibleBookings.length} of {filteredBookings.length})
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

      {/* ── Filter Modal ──────────────────────────────────────────── */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="options" size={20} color={theme.colors.primary} />
                <Text style={[styles.modalTitle, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
                  Filter Transactions
                </Text>
              </View>
              <Pressable onPress={() => setShowFilterModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingBottom: 16 }}>
              {/* Role Filter */}
              <View>
                <Text style={[styles.filterGroupTitle, { color: theme.colors.textMuted }]}>ROLE</Text>
                <View style={styles.pillRow}>
                  {[
                    { key: 'all', label: 'All Roles' },
                    { key: 'commuter', label: 'Commuter' },
                    { key: 'driver', label: 'Driver' },
                  ].map((r) => (
                    <Pressable
                      key={r.key}
                      onPress={() => setRoleFilter(r.key as RoleFilter)}
                      style={[
                        styles.filterPill,
                        {
                          backgroundColor: roleFilter === r.key ? theme.colors.primary : `${theme.colors.textMuted}12`,
                          borderColor: roleFilter === r.key ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          { color: roleFilter === r.key ? '#fff' : theme.colors.text, fontFamily: 'Inter-Medium' },
                        ]}
                      >
                        {r.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Payment Filter */}
              <View>
                <Text style={[styles.filterGroupTitle, { color: theme.colors.textMuted }]}>PAYMENT / FARE</Text>
                <View style={styles.pillRow}>
                  {[
                    { key: 'all', label: 'All Fares' },
                    { key: 'paid', label: 'Paid Rides' },
                    { key: 'free', label: 'Free Carpools' },
                  ].map((p) => (
                    <Pressable
                      key={p.key}
                      onPress={() => setPaymentFilter(p.key as PaymentFilter)}
                      style={[
                        styles.filterPill,
                        {
                          backgroundColor: paymentFilter === p.key ? theme.colors.primary : `${theme.colors.textMuted}12`,
                          borderColor: paymentFilter === p.key ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          { color: paymentFilter === p.key ? '#fff' : theme.colors.text, fontFamily: 'Inter-Medium' },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Date Preset Filter */}
              <View>
                <Text style={[styles.filterGroupTitle, { color: theme.colors.textMuted }]}>DATE RANGE</Text>
                <View style={styles.pillRow}>
                  {[
                    { key: 'all', label: 'All Time' },
                    { key: 'today', label: 'Today' },
                    { key: 'week', label: 'This Week' },
                    { key: 'month', label: 'This Month' },
                    { key: 'last30', label: 'Last 30 Days' },
                    { key: 'custom', label: 'Custom' },
                  ].map((d) => (
                    <Pressable
                      key={d.key}
                      onPress={() => setDatePreset(d.key as DatePreset)}
                      style={[
                        styles.filterPill,
                        {
                          backgroundColor: datePreset === d.key ? theme.colors.primary : `${theme.colors.textMuted}12`,
                          borderColor: datePreset === d.key ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          { color: datePreset === d.key ? '#fff' : theme.colors.text, fontFamily: 'Inter-Medium' },
                        ]}
                      >
                        {d.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Custom Date Inputs if 'custom' selected */}
                {datePreset === 'custom' && (
                  <View style={styles.customDateRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.customDateLabel, { color: theme.colors.textMuted }]}>From (YYYY-MM-DD)</Text>
                      <TextInput
                        placeholder="2026-08-01"
                        placeholderTextColor={theme.colors.textMuted}
                        value={customStart}
                        onChangeText={setCustomStart}
                        style={[styles.customDateInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.customDateLabel, { color: theme.colors.textMuted }]}>To (YYYY-MM-DD)</Text>
                      <TextInput
                        placeholder="2026-08-31"
                        placeholderTextColor={theme.colors.textMuted}
                        value={customEnd}
                        onChangeText={setCustomEnd}
                        style={[styles.customDateInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                      />
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={[styles.modalActions, { borderTopColor: theme.colors.border }]}>
              <Pressable onPress={handleResetFilters} style={styles.modalResetBtn}>
                <Text style={[styles.modalResetText, { color: theme.colors.textMuted, fontFamily: 'Inter-SemiBold' }]}>
                  Reset All
                </Text>
              </Pressable>
              <BouncyPressable
                scaleTo={0.97}
                onPress={() => setShowFilterModal(false)}
                style={[styles.modalApplyBtn, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={styles.modalApplyText}>Apply Filters</Text>
              </BouncyPressable>
            </View>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerSubtext: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Inter-Medium',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  exportText: {
    fontSize: 13,
  },

  /* Search & Filter row */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 10,
    marginTop: 4,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    paddingVertical: 0,
  },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },

  /* Active chips row */
  activeChipsRow: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  clearAllBtn: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  clearAllText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
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
  seatsBookedText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },

  /* Action buttons row */
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  /* Pagination */
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
    fontSize: 13,
  },

  /* Section headers */
  driverSectionWrap: {
    marginBottom: 24,
  },
  roleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingLeft: 4,
  },
  sectionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
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

  /* Filter Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 18,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  modalTitle: {
    fontSize: 17,
  },
  filterGroupTitle: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 13,
  },
  customDateRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  customDateLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  customDateInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  modalResetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalResetText: {
    fontSize: 14,
  },
  modalApplyBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  modalApplyText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
});
