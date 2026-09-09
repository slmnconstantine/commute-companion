import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { getCommuterBookings } from '@/services/bookings';
import { getDriverTrips } from '@/services/trips';
import { BookingWithTrip, TripWithDriver } from '@/types/database';
import GlassHeader from '@/components/common/GlassHeader';
import BouncyPressable from '@/components/common/BouncyPressable';

type TimeFilter = 'all' | 'month' | 'last30' | 'week';
type RoleTab = 'driver' | 'commuter' | 'overview';

export default function TransactionSummaryScreen() {
  const { theme, mode } = useTheme();
  const { profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = mode === 'dark';

  const isVerifiedDriver = Boolean(profile?.role === 'driver' && profile?.is_verified && profile?.verified_badge);
  const isDriver = isVerifiedDriver;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverTrips, setDriverTrips] = useState<TripWithDriver[]>([]);
  const [commuterBookings, setCommuterBookings] = useState<BookingWithTrip[]>([]);

  // Selected filter states
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [activeTab, setActiveTab] = useState<RoleTab>(isVerifiedDriver ? 'driver' : 'commuter');

  // Enforce commuter tab if user is not a verified driver
  useEffect(() => {
    if (!isVerifiedDriver && activeTab !== 'commuter') {
      setActiveTab('commuter');
    }
  }, [isVerifiedDriver, activeTab]);

  // Fetch all transactions for both driver and commuter roles
  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const [bData, tData] = await Promise.all([
        getCommuterBookings(profile.id).catch((err) => {
          console.warn('Error fetching commuter bookings:', err);
          return [] as BookingWithTrip[];
        }),
        getDriverTrips(profile.id).catch((err) => {
          console.warn('Error fetching driver trips:', err);
          return [] as TripWithDriver[];
        }),
      ]);
      setCommuterBookings(bData || []);
      setDriverTrips(tData || []);
    } catch (e) {
      console.error('Failed to load transaction summary:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ── Date Filtering Helper ──────────────────────────────────────────────────
  const isWithinTimeFilter = useCallback(
    (dateStr?: string | null) => {
      if (!dateStr || timeFilter === 'all') return true;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return false;
      const now = new Date();

      if (timeFilter === 'week') {
        // Start of current week (Monday 00:00:00 local time)
        const startOfWeek = new Date(now);
        const dayOfWeek = (now.getDay() + 6) % 7; // Monday = 0, Sunday = 6
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);

        // End of current week (Sunday 23:59:59 local time)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        endOfWeek.setMilliseconds(-1);

        // Also permit rolling 7 days backwards
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

        return (date >= startOfWeek && date <= endOfWeek) || (date >= sevenDaysAgo && date <= endOfWeek);
      }
      if (timeFilter === 'last30') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
        const thirtyDaysFuture = new Date(now.getTime() + 30 * 86400000);
        return date >= thirtyDaysAgo && date <= thirtyDaysFuture;
      }
      if (timeFilter === 'month') {
        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth()
        );
      }
      return true;
    },
    [timeFilter]
  );

  // Filtered dataset according to timeFilter
  const filteredDriverTrips = useMemo(() => {
    return driverTrips.filter((t) =>
      isWithinTimeFilter(t.departure_time) || isWithinTimeFilter(t.created_at)
    );
  }, [driverTrips, isWithinTimeFilter]);

  const filteredCommuterBookings = useMemo(() => {
    return commuterBookings.filter((b) =>
      isWithinTimeFilter(b.trip?.departure_time) || isWithinTimeFilter(b.created_at)
    );
  }, [commuterBookings, isWithinTimeFilter]);

  // ── Driver Analytics Calculations ─────────────────────────────────────────
  const driverAnalytics = useMemo(() => {
    const totalPosted = filteredDriverTrips.length;
    const completedTrips = filteredDriverTrips.filter((t) => t.status === 'completed');
    const cancelledTrips = filteredDriverTrips.filter((t) => t.status === 'cancelled');
    const activeTrips = filteredDriverTrips.filter(
      (t) => t.status === 'open' || t.status === 'full' || t.status === 'ongoing'
    );

    let grossEarnings = 0;
    let platformFees = 0;
    let passengersAccommodated = 0;

    completedTrips.forEach((trip) => {
      const validBookings = (trip.bookings || []).filter(
        (b) => b.status === 'completed' || b.status === 'accepted'
      );
      validBookings.forEach((b) => {
        const fare = Number(b.fare_paid) || (Number(trip.fare_per_seat) * (b.seats_booked || 1)) || 0;
        grossEarnings += fare;
        platformFees += Number(b.platform_fee) || 0;
        passengersAccommodated += Number(b.seats_booked) || 1;
      });
    });

    const netEarnings = Math.max(0, grossEarnings - platformFees);
    const completionRate = totalPosted > 0 ? Math.round((completedTrips.length / totalPosted) * 100) : 0;
    const avgPerTrip = completedTrips.length > 0 ? grossEarnings / completedTrips.length : 0;

    return {
      totalPosted,
      completedCount: completedTrips.length,
      cancelledCount: cancelledTrips.length,
      activeCount: activeTrips.length,
      grossEarnings,
      platformFees,
      netEarnings,
      passengersAccommodated,
      completionRate,
      avgPerTrip,
      recentCompleted: completedTrips.slice(0, 4),
    };
  }, [filteredDriverTrips]);

  // ── Commuter Analytics Calculations ───────────────────────────────────────
  const commuterAnalytics = useMemo(() => {
    const totalJoined = filteredCommuterBookings.length;
    const completedBookings = filteredCommuterBookings.filter(
      (b) => b.status === 'completed' || (b.trip && b.trip.status === 'completed')
    );
    const cancelledBookings = filteredCommuterBookings.filter(
      (b) => b.status === 'cancelled' || b.status === 'rejected'
    );
    const activeBookings = filteredCommuterBookings.filter(
      (b) => b.status === 'pending' || b.status === 'accepted'
    );

    let totalSpent = 0;
    let totalSeatsBooked = 0;

    completedBookings.forEach((b) => {
      const fare = Number(b.fare_paid) || (Number(b.trip?.fare_per_seat) * (b.seats_booked || 1)) || 0;
      totalSpent += fare;
      totalSeatsBooked += Number(b.seats_booked) || 1;
    });

    const completionRate = totalJoined > 0 ? Math.round((completedBookings.length / totalJoined) * 100) : 0;
    const avgFare = completedBookings.length > 0 ? totalSpent / completedBookings.length : 0;

    return {
      totalJoined,
      completedCount: completedBookings.length,
      cancelledCount: cancelledBookings.length,
      activeCount: activeBookings.length,
      totalSpent,
      totalSeatsBooked,
      completionRate,
      avgFare,
      recentCompleted: completedBookings.slice(0, 4),
    };
  }, [filteredCommuterBookings]);

  const formatCurrency = (val: number) => {
    return `₱${val.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const timeFilterLabels: { key: TimeFilter; label: string }[] = [
    { key: 'all', label: 'All Time' },
    { key: 'month', label: 'This Month' },
    { key: 'last30', label: 'Last 30 Days' },
    { key: 'week', label: 'This Week' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GlassHeader
        title="Transaction Summary"
        subtitle={isVerifiedDriver ? "Analytics & Earnings Overview" : "Commuter Fare & Rides Summary"}
        onBack={() => router.back()}
        rightAction={
          <BouncyPressable
            onPress={onRefresh}
            hapticType="light"
            style={[
              styles.iconBtn,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Ionicons name="refresh-outline" size={18} color={theme.colors.text} />
          </BouncyPressable>
        }
      />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
            Loading analytics...
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 40 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        >
          {/* ── Segment Tabs: Driver / Commuter / Overview (Only for Verified Drivers) ── */}
          {isVerifiedDriver && (
            <View
              style={[
                styles.roleTabsContainer,
                {
                  backgroundColor: isDark ? 'rgba(31, 41, 55, 0.6)' : 'rgba(243, 244, 246, 0.9)',
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <BouncyPressable
                onPress={() => setActiveTab('driver')}
                style={[
                  styles.roleTabBtn,
                  activeTab === 'driver' && [
                    styles.roleTabBtnActive,
                    { backgroundColor: theme.colors.surface },
                  ],
                ]}
              >
                <Ionicons
                  name="car-outline"
                  size={16}
                  color={activeTab === 'driver' ? theme.colors.primary : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.roleTabText,
                    {
                      color: activeTab === 'driver' ? theme.colors.primary : theme.colors.textMuted,
                      fontWeight: activeTab === 'driver' ? '700' : '500',
                    },
                  ]}
                >
                  Driver
                </Text>
              </BouncyPressable>

              <BouncyPressable
                onPress={() => setActiveTab('commuter')}
                style={[
                  styles.roleTabBtn,
                  activeTab === 'commuter' && [
                    styles.roleTabBtnActive,
                    { backgroundColor: theme.colors.surface },
                  ],
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={16}
                  color={activeTab === 'commuter' ? theme.colors.primary : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.roleTabText,
                    {
                      color: activeTab === 'commuter' ? theme.colors.primary : theme.colors.textMuted,
                      fontWeight: activeTab === 'commuter' ? '700' : '500',
                    },
                  ]}
                >
                  Commuter
                </Text>
              </BouncyPressable>

              <BouncyPressable
                onPress={() => setActiveTab('overview')}
                style={[
                  styles.roleTabBtn,
                  activeTab === 'overview' && [
                    styles.roleTabBtnActive,
                    { backgroundColor: theme.colors.surface },
                  ],
                ]}
              >
                <Ionicons
                  name="pie-chart-outline"
                  size={16}
                  color={activeTab === 'overview' ? theme.colors.primary : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.roleTabText,
                    {
                      color: activeTab === 'overview' ? theme.colors.primary : theme.colors.textMuted,
                      fontWeight: activeTab === 'overview' ? '700' : '500',
                    },
                  ]}
                >
                  Overview
                </Text>
              </BouncyPressable>
            </View>
          )}

          {/* ── Time Filter Chips ────────────────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timeFiltersScroll}
          >
            {timeFilterLabels.map((item) => {
              const isSelected = timeFilter === item.key;
              return (
                <BouncyPressable
                  key={item.key}
                  onPress={() => setTimeFilter(item.key)}
                  style={[
                    styles.timeChip,
                    {
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.timeChipText,
                      { color: isSelected ? '#FFFFFF' : theme.colors.textMuted },
                    ]}
                  >
                    {item.label}
                  </Text>
                </BouncyPressable>
              );
            })}
          </ScrollView>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 1: DRIVER ANALYTICS                                         */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'driver' && (
            <View style={styles.sectionContainer}>
              {/* Driver Hero Earnings Card */}
              <LinearGradient
                colors={['#059669', '#047857', '#065F46']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroTopRow}>
                  <View>
                    <Text style={styles.heroLabel}>Total Net Earnings</Text>
                    <Text style={styles.heroAmount}>
                      {formatCurrency(driverAnalytics.netEarnings)}
                    </Text>
                  </View>
                  <View style={styles.heroBadge}>
                    <Ionicons name="car" size={16} color="#FFFFFF" />
                    <Text style={styles.heroBadgeText}>Driver</Text>
                  </View>
                </View>

                <View style={styles.heroDivider} />

                <View style={styles.heroDetailsRow}>
                  <View style={styles.heroSubStat}>
                    <Text style={styles.heroSubStatLabel}>Gross Collected</Text>
                    <Text style={styles.heroSubStatVal}>
                      {formatCurrency(driverAnalytics.grossEarnings)}
                    </Text>
                  </View>
                  <View style={styles.heroSubStatDivider} />
                  <View style={styles.heroSubStat}>
                    <Text style={styles.heroSubStatLabel}>Platform Fee (10%)</Text>
                    <Text style={styles.heroSubStatVal}>
                      {formatCurrency(driverAnalytics.platformFees)}
                    </Text>
                  </View>
                  <View style={styles.heroSubStatDivider} />
                  <View style={styles.heroSubStat}>
                    <Text style={styles.heroSubStatLabel}>Fee Balance</Text>
                    <Text style={styles.heroSubStatVal}>
                      {formatCurrency(profile?.platform_fee_balance || 0)}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              {/* KPI Grid (2x2) */}
              <View style={styles.kpiGrid}>
                {/* Completed Trips */}
                <View
                  style={[
                    styles.kpiCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.kpiHeader}>
                    <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                    <Text style={[styles.kpiPill, { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }]}>
                      {driverAnalytics.completionRate}% Done
                    </Text>
                  </View>
                  <Text style={[styles.kpiNumber, { color: theme.colors.text }]}>
                    {driverAnalytics.completedCount}
                  </Text>
                  <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>
                    Completed Trips ({driverAnalytics.totalPosted} posted)
                  </Text>
                </View>

                {/* Passengers Accommodated */}
                <View
                  style={[
                    styles.kpiCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.kpiHeader}>
                    <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                      <Ionicons name="people" size={20} color="#3B82F6" />
                    </View>
                  </View>
                  <Text style={[styles.kpiNumber, { color: theme.colors.text }]}>
                    {driverAnalytics.passengersAccommodated}
                  </Text>
                  <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>
                    Passengers Accommodated
                  </Text>
                </View>

                {/* Average Earning per Trip */}
                <View
                  style={[
                    styles.kpiCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.kpiHeader}>
                    <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                      <Ionicons name="cash-outline" size={20} color="#F59E0B" />
                    </View>
                  </View>
                  <Text style={[styles.kpiNumber, { color: theme.colors.text }]}>
                    {formatCurrency(driverAnalytics.avgPerTrip)}
                  </Text>
                  <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>
                    Avg. Gross / Trip
                  </Text>
                </View>

                {/* Active / Scheduled */}
                <View
                  style={[
                    styles.kpiCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.kpiHeader}>
                    <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                      <Ionicons name="time-outline" size={20} color="#8B5CF6" />
                    </View>
                    {driverAnalytics.cancelledCount > 0 && (
                      <Text style={[styles.kpiPill, { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }]}>
                        {driverAnalytics.cancelledCount} Cancelled
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.kpiNumber, { color: theme.colors.text }]}>
                    {driverAnalytics.activeCount}
                  </Text>
                  <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>
                    Active / Upcoming Trips
                  </Text>
                </View>
              </View>

              {/* Visual Trip Distribution Bar */}
              {driverAnalytics.totalPosted > 0 && (
                <View
                  style={[
                    styles.distributionCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Driver Trip Performance
                  </Text>
                  <View style={styles.progressBar}>
                    {driverAnalytics.completedCount > 0 && (
                      <View
                        style={{
                          flex: driverAnalytics.completedCount,
                          backgroundColor: '#10B981',
                          borderTopLeftRadius: 4,
                          borderBottomLeftRadius: 4,
                        }}
                      />
                    )}
                    {driverAnalytics.activeCount > 0 && (
                      <View style={{ flex: driverAnalytics.activeCount, backgroundColor: '#3B82F6' }} />
                    )}
                    {driverAnalytics.cancelledCount > 0 && (
                      <View
                        style={{
                          flex: driverAnalytics.cancelledCount,
                          backgroundColor: '#EF4444',
                          borderTopRightRadius: 4,
                          borderBottomRightRadius: 4,
                        }}
                      />
                    )}
                  </View>
                  <View style={styles.distributionLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                      <Text style={[styles.legendText, { color: theme.colors.textMuted }]}>
                        Completed ({driverAnalytics.completedCount})
                      </Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                      <Text style={[styles.legendText, { color: theme.colors.textMuted }]}>
                        Active ({driverAnalytics.activeCount})
                      </Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                      <Text style={[styles.legendText, { color: theme.colors.textMuted }]}>
                        Cancelled ({driverAnalytics.cancelledCount})
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Recent Driver Trips Breakdown */}
              <View style={styles.recentSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Recent Driving Earnings
                </Text>
                {driverAnalytics.recentCompleted.length === 0 ? (
                  <View
                    style={[
                      styles.emptySubCard,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    ]}
                  >
                    <Ionicons name="car-outline" size={32} color={theme.colors.textMuted} />
                    <Text style={[styles.emptySubText, { color: theme.colors.textMuted }]}>
                      No completed driver trips in this period.
                    </Text>
                  </View>
                ) : (
                  driverAnalytics.recentCompleted.map((trip) => {
                    const bookings = (trip.bookings || []).filter(
                      (b) => b.status === 'completed' || b.status === 'accepted'
                    );
                    const earnings = bookings.reduce(
                      (sum, b) =>
                        sum +
                        (Number(b.fare_paid) ||
                          Number(trip.fare_per_seat) * (b.seats_booked || 1) ||
                          0),
                      0
                    );
                    const passengers = bookings.reduce((sum, b) => sum + (b.seats_booked || 1), 0);
                    const dateFormatted = new Date(
                      trip.departure_time || trip.created_at
                    ).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <View
                        key={trip.id}
                        style={[
                          styles.recentCard,
                          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                        ]}
                      >
                        <View style={styles.recentLeft}>
                          <View
                            style={[
                              styles.recentIconWrap,
                              { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
                            ]}
                          >
                            <Ionicons name="trending-up" size={18} color="#10B981" />
                          </View>
                          <View style={styles.recentTextCol}>
                            <Text
                              style={[styles.recentRoute, { color: theme.colors.text }]}
                              numberOfLines={1}
                            >
                              {trip.destination_label || 'Destination'}
                            </Text>
                            <Text
                              style={[styles.recentSub, { color: theme.colors.textMuted }]}
                              numberOfLines={1}
                            >
                              {dateFormatted} • {passengers} passenger{passengers !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.recentRight}>
                          <Text style={styles.earningPositive}>+{formatCurrency(earnings)}</Text>
                          <Text style={[styles.recentStatus, { color: '#10B981' }]}>Completed</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 2: COMMUTER RIDES                                           */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'commuter' && (
            <View style={styles.sectionContainer}>
              {/* Commuter Hero Spending Card */}
              <LinearGradient
                colors={['#2563EB', '#1D4ED8', '#1E40AF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroTopRow}>
                  <View>
                    <Text style={styles.heroLabel}>Total Fare Paid Across Trips</Text>
                    <Text style={styles.heroAmount}>
                      {formatCurrency(commuterAnalytics.totalSpent)}
                    </Text>
                  </View>
                  <View style={[styles.heroBadge, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}>
                    <Ionicons name="person" size={16} color="#FFFFFF" />
                    <Text style={styles.heroBadgeText}>Commuter</Text>
                  </View>
                </View>

                <View style={styles.heroDivider} />

                <View style={styles.heroDetailsRow}>
                  <View style={styles.heroSubStat}>
                    <Text style={styles.heroSubStatLabel}>Rides Joined</Text>
                    <Text style={styles.heroSubStatVal}>{commuterAnalytics.totalJoined}</Text>
                  </View>
                  <View style={styles.heroSubStatDivider} />
                  <View style={styles.heroSubStat}>
                    <Text style={styles.heroSubStatLabel}>Rides Completed</Text>
                    <Text style={styles.heroSubStatVal}>{commuterAnalytics.completedCount}</Text>
                  </View>
                  <View style={styles.heroSubStatDivider} />
                  <View style={styles.heroSubStat}>
                    <Text style={styles.heroSubStatLabel}>Seats Booked</Text>
                    <Text style={styles.heroSubStatVal}>{commuterAnalytics.totalSeatsBooked}</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* KPI Grid (2x2) */}
              <View style={styles.kpiGrid}>
                {/* Completed Trips */}
                <View
                  style={[
                    styles.kpiCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.kpiHeader}>
                    <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
                      <Ionicons name="checkmark-done-circle" size={20} color="#2563EB" />
                    </View>
                    <Text style={[styles.kpiPill, { backgroundColor: 'rgba(37, 99, 235, 0.15)', color: '#2563EB' }]}>
                      {commuterAnalytics.completionRate}%
                    </Text>
                  </View>
                  <Text style={[styles.kpiNumber, { color: theme.colors.text }]}>
                    {commuterAnalytics.completedCount}
                  </Text>
                  <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>
                    Completed Trips
                  </Text>
                </View>

                {/* Total Seats Booked */}
                <View
                  style={[
                    styles.kpiCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.kpiHeader}>
                    <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Ionicons name="ticket-outline" size={20} color="#10B981" />
                    </View>
                  </View>
                  <Text style={[styles.kpiNumber, { color: theme.colors.text }]}>
                    {commuterAnalytics.totalSeatsBooked}
                  </Text>
                  <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>
                    Total Seats Reserved
                  </Text>
                </View>

                {/* Average Fare Paid */}
                <View
                  style={[
                    styles.kpiCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.kpiHeader}>
                    <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                      <Ionicons name="pricetag-outline" size={20} color="#F59E0B" />
                    </View>
                  </View>
                  <Text style={[styles.kpiNumber, { color: theme.colors.text }]}>
                    {formatCurrency(commuterAnalytics.avgFare)}
                  </Text>
                  <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>
                    Avg. Fare / Trip
                  </Text>
                </View>

                {/* Active / Pending Bookings */}
                <View
                  style={[
                    styles.kpiCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.kpiHeader}>
                    <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                      <Ionicons name="hourglass-outline" size={20} color="#8B5CF6" />
                    </View>
                    {commuterAnalytics.cancelledCount > 0 && (
                      <Text style={[styles.kpiPill, { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }]}>
                        {commuterAnalytics.cancelledCount} Cancelled
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.kpiNumber, { color: theme.colors.text }]}>
                    {commuterAnalytics.activeCount}
                  </Text>
                  <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>
                    Active / Upcoming Rides
                  </Text>
                </View>
              </View>

              {/* Ride Distribution Bar */}
              {commuterAnalytics.totalJoined > 0 && (
                <View
                  style={[
                    styles.distributionCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Commute Activity Breakdown
                  </Text>
                  <View style={styles.progressBar}>
                    {commuterAnalytics.completedCount > 0 && (
                      <View
                        style={{
                          flex: commuterAnalytics.completedCount,
                          backgroundColor: '#2563EB',
                          borderTopLeftRadius: 4,
                          borderBottomLeftRadius: 4,
                        }}
                      />
                    )}
                    {commuterAnalytics.activeCount > 0 && (
                      <View style={{ flex: commuterAnalytics.activeCount, backgroundColor: '#10B981' }} />
                    )}
                    {commuterAnalytics.cancelledCount > 0 && (
                      <View
                        style={{
                          flex: commuterAnalytics.cancelledCount,
                          backgroundColor: '#EF4444',
                          borderTopRightRadius: 4,
                          borderBottomRightRadius: 4,
                        }}
                      />
                    )}
                  </View>
                  <View style={styles.distributionLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
                      <Text style={[styles.legendText, { color: theme.colors.textMuted }]}>
                        Completed ({commuterAnalytics.completedCount})
                      </Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                      <Text style={[styles.legendText, { color: theme.colors.textMuted }]}>
                        Active ({commuterAnalytics.activeCount})
                      </Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                      <Text style={[styles.legendText, { color: theme.colors.textMuted }]}>
                        Cancelled ({commuterAnalytics.cancelledCount})
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Recent Commute Rides */}
              <View style={styles.recentSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Recent Completed Commutes
                </Text>
                {commuterAnalytics.recentCompleted.length === 0 ? (
                  <View
                    style={[
                      styles.emptySubCard,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    ]}
                  >
                    <Ionicons name="map-outline" size={32} color={theme.colors.textMuted} />
                    <Text style={[styles.emptySubText, { color: theme.colors.textMuted }]}>
                      No completed commuter rides in this period.
                    </Text>
                  </View>
                ) : (
                  commuterAnalytics.recentCompleted.map((booking) => {
                    const fare =
                      Number(booking.fare_paid) ||
                      Number(booking.trip?.fare_per_seat) * (booking.seats_booked || 1) ||
                      0;
                    const dateFormatted = new Date(
                      booking.trip?.departure_time || booking.created_at
                    ).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <View
                        key={booking.id}
                        style={[
                          styles.recentCard,
                          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                        ]}
                      >
                        <View style={styles.recentLeft}>
                          <View
                            style={[
                              styles.recentIconWrap,
                              { backgroundColor: 'rgba(37, 99, 235, 0.12)' },
                            ]}
                          >
                            <Ionicons name="navigate-outline" size={18} color="#2563EB" />
                          </View>
                          <View style={styles.recentTextCol}>
                            <Text
                              style={[styles.recentRoute, { color: theme.colors.text }]}
                              numberOfLines={1}
                            >
                              {booking.trip?.destination_label || 'Destination'}
                            </Text>
                            <Text
                              style={[styles.recentSub, { color: theme.colors.textMuted }]}
                              numberOfLines={1}
                            >
                              {dateFormatted} • {booking.seats_booked || 1} seat
                              {(booking.seats_booked || 1) > 1 ? 's' : ''}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.recentRight}>
                          <Text style={styles.spendingNegative}>{formatCurrency(fare)}</Text>
                          <Text style={[styles.recentStatus, { color: '#2563EB' }]}>Completed</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 3: OVERVIEW (COMBINED FINANCIAL SUMMARY)                    */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <View style={styles.sectionContainer}>
              {/* Financial Balance Summary Card */}
              <LinearGradient
                colors={['#1E293B', '#0F172A', '#020617']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroTopRow}>
                  <View>
                    <Text style={styles.heroLabel}>
                      {isVerifiedDriver ? 'Net Financial Cash Flow' : 'Total Fare Paid Across Trips'}
                    </Text>
                    <Text
                      style={[
                        styles.heroAmount,
                        {
                          color: isVerifiedDriver
                            ? (driverAnalytics.netEarnings - commuterAnalytics.totalSpent >= 0
                                ? '#34D399'
                                : '#F1F5F9')
                            : '#FFFFFF',
                        },
                      ]}
                    >
                      {isVerifiedDriver ? (
                        `${driverAnalytics.netEarnings - commuterAnalytics.totalSpent >= 0 ? '+' : ''}${formatCurrency(
                          driverAnalytics.netEarnings - commuterAnalytics.totalSpent
                        )}`
                      ) : (
                        formatCurrency(commuterAnalytics.totalSpent)
                      )}
                    </Text>
                  </View>
                  <View style={[styles.heroBadge, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                    <Ionicons name={isVerifiedDriver ? "bar-chart" : "person"} size={16} color="#FFFFFF" />
                    <Text style={styles.heroBadgeText}>{isVerifiedDriver ? 'Combined' : 'Commuter'}</Text>
                  </View>
                </View>

                <View style={styles.heroDivider} />

                <View style={styles.heroDetailsRow}>
                  {isVerifiedDriver ? (
                    <>
                      <View style={styles.heroSubStat}>
                        <Text style={styles.heroSubStatLabel}>Driver Net Earned</Text>
                        <Text style={[styles.heroSubStatVal, { color: '#34D399' }]}>
                          +{formatCurrency(driverAnalytics.netEarnings)}
                        </Text>
                      </View>
                      <View style={styles.heroSubStatDivider} />
                      <View style={styles.heroSubStat}>
                        <Text style={styles.heroSubStatLabel}>Commuter Spent</Text>
                        <Text style={[styles.heroSubStatVal, { color: '#93C5FD' }]}>
                          {formatCurrency(commuterAnalytics.totalSpent)}
                        </Text>
                      </View>
                      <View style={styles.heroSubStatDivider} />
                      <View style={styles.heroSubStat}>
                        <Text style={styles.heroSubStatLabel}>Total Rides</Text>
                        <Text style={styles.heroSubStatVal}>
                          {driverAnalytics.completedCount + commuterAnalytics.completedCount}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.heroSubStat}>
                        <Text style={styles.heroSubStatLabel}>Rides Joined</Text>
                        <Text style={styles.heroSubStatVal}>{commuterAnalytics.totalJoined}</Text>
                      </View>
                      <View style={styles.heroSubStatDivider} />
                      <View style={styles.heroSubStat}>
                        <Text style={styles.heroSubStatLabel}>Completed</Text>
                        <Text style={styles.heroSubStatVal}>{commuterAnalytics.completedCount}</Text>
                      </View>
                      <View style={styles.heroSubStatDivider} />
                      <View style={styles.heroSubStat}>
                        <Text style={styles.heroSubStatLabel}>Seats Booked</Text>
                        <Text style={styles.heroSubStatVal}>{commuterAnalytics.totalSeatsBooked}</Text>
                      </View>
                    </>
                  )}
                </View>
              </LinearGradient>

              {/* Side-by-side Role Snapshot Cards */}
              <View style={styles.overviewRoleRow}>
                {/* Driver Snapshot (Only for Verified Drivers) */}
                {isVerifiedDriver && (
                  <View
                    style={[
                      styles.overviewSnapshotCard,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    ]}
                  >
                    <View style={styles.overviewSnapshotHeader}>
                      <Ionicons name="car" size={20} color="#10B981" />
                      <Text style={[styles.overviewSnapshotTitle, { color: theme.colors.text }]}>
                        As Driver
                      </Text>
                    </View>
                    <Text style={[styles.overviewBigStat, { color: '#10B981' }]}>
                      {formatCurrency(driverAnalytics.grossEarnings)}
                    </Text>
                    <Text style={[styles.overviewStatSub, { color: theme.colors.textMuted }]}>
                      {driverAnalytics.completedCount} Completed • {driverAnalytics.passengersAccommodated} Passengers
                    </Text>
                    <BouncyPressable
                      onPress={() => setActiveTab('driver')}
                      style={[styles.snapshotBtn, { borderColor: '#10B981' }]}
                    >
                      <Text style={[styles.snapshotBtnText, { color: '#10B981' }]}>
                        View Driver Analytics
                      </Text>
                    </BouncyPressable>
                  </View>
                )}

                {/* Commuter Snapshot */}
                <View
                  style={[
                    styles.overviewSnapshotCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.overviewSnapshotHeader}>
                    <Ionicons name="person" size={20} color="#2563EB" />
                    <Text style={[styles.overviewSnapshotTitle, { color: theme.colors.text }]}>
                      As Commuter
                    </Text>
                  </View>
                  <Text style={[styles.overviewBigStat, { color: '#2563EB' }]}>
                    {formatCurrency(commuterAnalytics.totalSpent)}
                  </Text>
                  <Text style={[styles.overviewStatSub, { color: theme.colors.textMuted }]}>
                    {commuterAnalytics.completedCount} Completed • {commuterAnalytics.totalSeatsBooked} Seats
                  </Text>
                  <BouncyPressable
                    onPress={() => setActiveTab('commuter')}
                    style={[styles.snapshotBtn, { borderColor: '#2563EB' }]}
                  >
                    <Text style={[styles.snapshotBtnText, { color: '#2563EB' }]}>
                      View Commuter Analytics
                    </Text>
                  </BouncyPressable>
                </View>
              </View>
            </View>
          )}

          {/* ── Bottom Action Hub ────────────────────────────────────────── */}
          <View style={styles.bottomActionHub}>
            <BouncyPressable
              onPress={() => router.push('/(main)/(tabs)/activity' as any)}
              style={[
                styles.primaryActionBtn,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Ionicons name="receipt-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>
                View Full Itemized Activity Hub
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </BouncyPressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Role Segment Bar ───────────────────────────────────────────
  roleTabsContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 5,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  roleTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  roleTabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  roleTabText: {
    fontSize: 13,
    letterSpacing: 0.2,
  },

  // ── Time Filter Pills ──────────────────────────────────────────
  timeFiltersScroll: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Section Container ──────────────────────────────────────────
  sectionContainer: {
    gap: 16,
  },

  // ── Hero Card ──────────────────────────────────────────────────
  heroCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 16,
  },
  heroDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroSubStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroSubStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroSubStatLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
    textAlign: 'center',
  },
  heroSubStatVal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  // ── KPI Grid ───────────────────────────────────────────────────
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiPill: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  kpiNumber: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 11,
    lineHeight: 15,
  },

  // ── Distribution Bar ───────────────────────────────────────────
  distributionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  distributionLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
  },

  // ── Recent Breakdown Section ───────────────────────────────────
  recentSection: {
    gap: 12,
  },
  recentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  recentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentTextCol: {
    flex: 1,
  },
  recentRoute: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  recentSub: {
    fontSize: 12,
  },
  recentRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  earningPositive: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  spendingNegative: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  recentStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptySubCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  emptySubText: {
    fontSize: 13,
  },

  // ── Overview Snapshots ─────────────────────────────────────────
  overviewRoleRow: {
    gap: 12,
  },
  overviewSnapshotCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  overviewSnapshotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overviewSnapshotTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  overviewBigStat: {
    fontSize: 24,
    fontWeight: '800',
  },
  overviewStatSub: {
    fontSize: 12,
  },
  snapshotBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  snapshotBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Bottom Action Hub ──────────────────────────────────────────
  bottomActionHub: {
    marginTop: 24,
    gap: 12,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  secondaryActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
