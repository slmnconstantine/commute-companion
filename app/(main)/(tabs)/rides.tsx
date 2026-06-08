/**
 * Rides Tab
 *
 * Two-section segmented control visible to ALL users:
 * - "Search Rides": Browse available posted rides (Commuter & Driver)
 * - "Post a Ride": Drivers can post rides; Commuters see "Become a Driver" banner
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
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRoute } from '@/context/RouteContext';
import { useNotifications } from '@/context/NotificationContext';
import EmptyState from '@/components/common/EmptyState';

import { getDriverTrips, getTrips } from '@/services/trips';
import { getCommuterRequests, CommuterRequest } from '@/services/rideRequests';
import type { TripWithDriver } from '@/types/database';
import TripCard from '@/components/ride/TripCard';

const SEGMENTS = ['Search Rides', 'Post a Ride'] as const;
type Segment = (typeof SEGMENTS)[number];

// ── Components ────────────────────────────────────────────────────────────────


/** Banner shown to commuters in the "Post a Ride" section */
function BecomeDriverBanner({
  theme,
  onPress,
}: {
  theme: ReturnType<typeof useTheme>['theme'];
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.driverBanner, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}
      onPress={onPress}
    >
      <View style={[styles.bannerIconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
        <Ionicons name="car-sport" size={36} color={theme.colors.primary} />
      </View>
      <Text style={[styles.bannerTitle, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
        Want to offer rides?
      </Text>
      <Text style={[styles.bannerDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
        Become a driver to start posting rides and earn by sharing your commute with others.
      </Text>
      <View style={[styles.bannerButton, { backgroundColor: theme.colors.primary }]}>
        <Ionicons name="arrow-forward" size={18} color={theme.colors.white} />
        <Text style={[styles.bannerButtonText, { fontFamily: 'Inter-SemiBold' }]}>Become a Driver</Text>
      </View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function RidesScreen() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const { activeRoute } = useRoute();
  const { driverPendingCount, refreshCounts } = useNotifications();
  const router = useRouter();
  const isDriver = profile?.role === 'driver';

  const [activeSegment, setActiveSegment] = useState<Segment>('Search Rides');
  const [refreshing, setRefreshing] = useState(false);
  const [myRides, setMyRides] = useState<TripWithDriver[]>([]);
  const [availableRides, setAvailableRides] = useState<TripWithDriver[]>([]);
  const [rideRequests, setRideRequests] = useState<CommuterRequest[]>([]);

  const loadData = useCallback(async () => {
    try {
      // Load all open rides (in a real app, this would use activeRoute to filter nearby rides via PostGIS)
      const allRides = await getTrips({ limit: 50 });
      setAvailableRides(allRides.filter(t => t.status === 'open' || t.status === 'full' || t.status === 'ongoing'));

      // Load my rides if user is driver
      if (profile?.id && isDriver) {
        const myPostedRides = await getDriverTrips(profile.id);
        myPostedRides.sort((a, b) => {
          const activeA = ['open', 'ongoing', 'full'].includes(a.status);
          const activeB = ['open', 'ongoing', 'full'].includes(b.status);
          if (activeA && !activeB) return -1;
          if (!activeA && activeB) return 1;
          
          const timeA = new Date(a.departure_time).getTime();
          const timeB = new Date(b.departure_time).getTime();
          
          if (activeA) {
            return timeA - timeB; // Nearest departure first
          } else {
            return timeB - timeA; // Most recently completed first
          }
        });
        setMyRides(myPostedRides);
        
        const requests = await getCommuterRequests();
        setRideRequests(requests);
      }
    } catch (e) {
      console.log('Error loading trips', e);
    }
  }, [profile?.id, isDriver]);

  React.useEffect(() => {
    loadData();
  }, [loadData, activeSegment]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    await refreshCounts();
    setRefreshing(false);
  }, [loadData, refreshCounts]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[theme.typography.heading, { color: theme.colors.text }]}>
          Rides
        </Text>
        <Pressable
          style={[styles.filterBtn, { backgroundColor: theme.colors.inputBackground }]}
        >
          <Ionicons name="options-outline" size={20} color={theme.colors.text} />
        </Pressable>
      </View>

      {/* Segmented control — visible to ALL users */}
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
              <Ionicons
                name={seg === 'Search Rides' ? 'search' : 'add-circle'}
                size={16}
                color={active ? theme.colors.primary : theme.colors.textMuted}
                style={{ marginRight: 4 }}
              />
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
        {activeSegment === 'Search Rides' ? (
          /* ─── Search Rides Section ─── */
          availableRides.length > 0 || activeRoute ? (
            <>
              {/* Active Route Summary */}
              {activeRoute ? (
                <Pressable
                  style={[
                    styles.activeRouteCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary },
                  ]}
                  onPress={() => router.push('/(main)/ride/set-route' as any)}
                >
                  <View style={styles.activeRouteDots}>
                    <View style={[styles.routeDotGreen, { backgroundColor: theme.colors.success }]} />
                    <View style={[styles.routeLine, { backgroundColor: theme.colors.border }]} />
                    <View style={[styles.routeDotRed, { backgroundColor: theme.colors.error }]} />
                  </View>
                  <View style={styles.activeRouteInfo}>
                    <Text style={[theme.typography.small, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium', marginBottom: 2 }]}>Your Commute</Text>
                    <Text style={[theme.typography.caption, { color: theme.colors.text }]} numberOfLines={1}>
                      {activeRoute.origin_label.split(',')[0]}
                    </Text>
                    <Text style={[theme.typography.caption, { color: theme.colors.text }]} numberOfLines={1}>
                      {activeRoute.destination_label.split(',')[0]}
                    </Text>
                  </View>
                  <Ionicons name="pencil" size={18} color={theme.colors.primary} />
                </Pressable>
              ) : (
                <Pressable
                  style={[
                    styles.setRouteCard,
                    { backgroundColor: `${theme.colors.primary}10`, borderColor: `${theme.colors.primary}30` },
                  ]}
                  onPress={() => router.push('/(main)/ride/set-route' as any)}
                >
                  <Ionicons name="navigate-circle" size={28} color={theme.colors.primary} />
                  <View style={styles.setRouteInfo}>
                    <Text style={[{ color: theme.colors.text, fontFamily: 'Inter-SemiBold', fontSize: 14 }]}>Set Your Commute Route</Text>
                    <Text style={[{ color: theme.colors.textMuted, fontFamily: 'Inter-Regular', fontSize: 12 }]}>Pin your origin & destination on the map</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
                </Pressable>
              )}

              <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>
                {availableRides.length} rides available
              </Text>
              {availableRides.map((trip) => (
                <View key={trip.id} style={{ marginBottom: 14 }}>
                  <TripCard trip={trip} onPress={() => router.push(`/(main)/ride/${trip.id}`)} />
                </View>
              ))}
            </>
          ) : (
            <EmptyState
              icon="car-outline"
              title="No Rides Available"
              message="There are no rides in your area right now. Check back soon!"
            />
          )
        ) : (
          /* ─── Post a Ride Section ─── */
          isDriver ? (
            <>
              {/* Create New Ride Button */}
              <Pressable
                style={[styles.createRideCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}
                onPress={() => router.push('/(main)/ride/create' as any)}
              >
                <View style={[styles.createRideIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
                  <Ionicons name="add-circle" size={32} color={theme.colors.primary} />
                </View>
                <View style={styles.createRideInfo}>
                  <Text style={[styles.createRideTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
                    Create New Ride
                  </Text>
                  <Text style={[styles.createRideDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                    Set your route, departure time, and fare
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={theme.colors.primary} />
              </Pressable>

              {/* My Posted Rides */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <Text style={[styles.myRidesTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', marginBottom: 0 }]}>
                  My Posted Rides
                </Text>
                {driverPendingCount > 0 && (
                  <View style={[styles.badgeIndicator, { backgroundColor: theme.colors.error }]}>
                    <Text style={styles.badgeText}>{driverPendingCount} new request{driverPendingCount !== 1 && 's'}</Text>
                  </View>
                )}
              </View>
              {myRides.length > 0 ? (
                myRides.map((trip) => (
                  <View key={trip.id} style={{ marginBottom: 14 }}>
                    <TripCard trip={trip} onPress={() => router.push(`/(main)/ride/${trip.id}`)} />
                  </View>
                ))
              ) : (
                <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginBottom: 14 }}>
                  You don't have any active posted rides.
                </Text>
              )}

              {/* Ride Requests Board */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginTop: 16 }}>
                <Text style={[styles.myRidesTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', marginBottom: 0 }]}>
                  Commuter Ride Requests
                </Text>
              </View>
              {rideRequests.length > 0 ? (
                rideRequests.map((req) => (
                  <View key={req.id} style={[styles.createRideCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 12, paddingVertical: 12 }]}>
                    <View style={[styles.createRideIcon, { backgroundColor: `${theme.colors.accent}15`, width: 40, height: 40, borderRadius: 20 }]}>
                      <Ionicons name="person" size={20} color={theme.colors.accent} />
                    </View>
                    <View style={styles.createRideInfo}>
                      <Text style={[styles.createRideTitle, { color: theme.colors.text, fontFamily: 'Inter-Medium', fontSize: 15 }]}>
                        {req.commuter.full_name} is looking for a ride
                      </Text>
                      <Text style={[styles.createRideDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular', fontSize: 12 }]} numberOfLines={1}>
                        From: {req.origin_label.split(',')[0]}
                      </Text>
                      <Text style={[styles.createRideDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular', fontSize: 12 }]} numberOfLines={1}>
                        To: {req.destination_label.split(',')[0]}
                      </Text>
                    </View>
                    <Pressable 
                      style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                      onPress={() => router.push('/(main)/ride/create' as any)}
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'Inter-SemiBold' }}>Offer Ride</Text>
                    </Pressable>
                  </View>
                ))
              ) : (
                <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginBottom: 14 }}>
                  There are currently no active commuter requests.
                </Text>
              )}
            </>
          ) : (
            /* Commuter — Become a Driver Banner */
            <BecomeDriverBanner
              theme={theme}
              onPress={() => router.push('/(main)/settings/become-driver' as any)}
            />
          )
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Segment control */
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Section subtitle */
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },

  /* ScrollView */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  /* Trip card */
  tripCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  tripDriverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  tripAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripAvatarText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  tripDriverInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  fareContainer: {
    alignItems: 'flex-end',
  },

  /* Route */
  routeRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  routeDots: {
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
    paddingVertical: 0,
    minHeight: 44,
  },

  /* Footer */
  tripFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  tripFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  bookBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
  },

  /* Create Ride Card */
  createRideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  createRideIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createRideInfo: {
    flex: 1,
    gap: 2,
  },
  createRideTitle: {
    fontSize: 16,
  },
  createRideDesc: {
    fontSize: 12,
    lineHeight: 17,
  },

  /* My Rides */
  myRidesTitle: {
    fontSize: 17,
  },
  badgeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
  },

  /* Become Driver Banner */
  driverBanner: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    marginTop: 20,
    gap: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 20,
    textAlign: 'center',
  },
  bannerDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  bannerButtonText: {
    color: '#fff',
    fontSize: 15,
  },

  /* Active Route Card */
  activeRouteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  activeRouteDots: {
    alignItems: 'center',
    width: 10,
  },
  activeRouteInfo: {
    flex: 1,
    gap: 1,
  },

  /* Set Route Card */
  setRouteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  setRouteInfo: {
    flex: 1,
    gap: 2,
  },
});
