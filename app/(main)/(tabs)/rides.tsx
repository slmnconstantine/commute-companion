/**
 * Rides Tab
 *
 * Two-section segmented control visible to ALL users:
 * - "Search Rides": Browse available posted rides (Commuter & Driver)
 * - "Post a Ride": Drivers can post rides; Commuters see "Become a Driver" banner
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRoute } from '@/context/RouteContext';
import { useNotifications } from '@/context/NotificationContext';
import EmptyState from '@/components/common/EmptyState';
import Avatar from '@/components/common/Avatar';
import { supabase } from '@/lib/supabase';

import { getDriverTrips, getTrips } from '@/services/trips';
import { getCommuterRequests, CommuterRequest } from '@/services/rideRequests';
import type { TripWithDriver } from '@/types/database';
import TripCard from '@/components/ride/TripCard';
import DatePickerModal from '@/components/ride/DatePickerModal';
import TimePickerModal from '@/components/ride/TimePickerModal';
import BecomeDriverBanner from '@/components/ride/BecomeDriverBanner';
import TripFiltersModal from '@/components/ride/TripFiltersModal';
import CommuterRequestModal from '@/components/ride/CommuterRequestModal';
import ActiveRouteCard from '@/components/ride/ActiveRouteCard';
import ActiveRequestCard from '@/components/ride/ActiveRequestCard';
import CommuterRequestCard from '@/components/ride/CommuterRequestCard';
import Skeleton from '@/components/common/Skeleton';

const SEGMENTS = ['Search Rides', 'Post a Ride'] as const;
type Segment = (typeof SEGMENTS)[number];

// ── Picker Constants & Modals ──────────────────────────────────────────────────
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Safely parse serialized passenger request details
function parseRequestDetails(label: string | null) {
  if (!label) return null;
  try {
    const parsed = JSON.parse(label);
    if (parsed && typeof parsed === 'object') {
      return {
        text: parsed.text || '',
        seats: typeof parsed.seats === 'number' ? parsed.seats : 1,
        departure_time: parsed.departure_time || '',
      };
    }
  } catch (e) {
    // Normal route label string (not serialized JSON request)
  }
  return null;
}

function isJsonLabel(label: string | null) {
  if (!label) return false;
  try {
    const parsed = JSON.parse(label);
    return !!(parsed && typeof parsed === 'object');
  } catch (e) {
    return false;
  }
}

function generateRouteHash(originLat: number, originLng: number, destLat: number, destLng: number) {
  const oLat = originLat.toFixed(2);
  const oLng = originLng.toFixed(2);
  const dLat = destLat.toFixed(2);
  const dLng = destLng.toFixed(2);
  return `${oLat},${oLng}_${dLat},${dLng}`;
}

// ── Components ────────────────────────────────────────────────────────────────

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function RidesScreen() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const { activeRoute, setActiveRoute } = useRoute();
  const { driverPendingCount, refreshCounts } = useNotifications();
  const router = useRouter();
  const isDriver = profile?.role === 'driver';

  const params = useLocalSearchParams<{
    from_set_route?: string;
    req_origin_lat?: string;
    req_origin_lng?: string;
    req_origin_label?: string;
    req_destination_lat?: string;
    req_destination_lng?: string;
    req_destination_label?: string;
  }>();

  const [activeSegment, setActiveSegment] = useState<Segment>('Search Rides');
  const [refreshing, setRefreshing] = useState(false);
  const [myRides, setMyRides] = useState<TripWithDriver[]>([]);
  const [availableRides, setAvailableRides] = useState<TripWithDriver[]>([]);
  const [rideRequests, setRideRequests] = useState<CommuterRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Commuter Request States
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [seatsNeeded, setSeatsNeeded] = useState(1);
  const [requestDate, setRequestDate] = useState('');
  const [requestTime, setRequestTime] = useState('');
  const [showReqDatePicker, setShowReqDatePicker] = useState(false);
  const [showReqTimePicker, setShowReqTimePicker] = useState(false);
  const [savingRequest, setSavingRequest] = useState(false);

  // Independent Request Route coordinates
  interface RequestLocationData {
    lat: number;
    lng: number;
    label: string;
  }
  const [reqOrigin, setReqOrigin] = useState<RequestLocationData | null>(null);
  const [reqDestination, setReqDestination] = useState<RequestLocationData | null>(null);
  const [activeRequestRoute, setActiveRequestRoute] = useState<any | null>(null);

  // Filter & Sort States
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterMaxFare, setFilterMaxFare] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'open' | 'all'>('open');
  const [sortBy, setSortBy] = useState<'time' | 'price_asc' | 'price_desc'>('time');
  const [customFareText, setCustomFareText] = useState('');

  // Load route coordinates returned from set-route
  useEffect(() => {
    if (params.from_set_route === 'true') {
      if (params.req_origin_lat && params.req_origin_lng && params.req_origin_label) {
        setReqOrigin((prev) => {
          const lat = parseFloat(params.req_origin_lat!);
          const lng = parseFloat(params.req_origin_lng!);
          if (prev?.lat === lat && prev?.lng === lng && prev?.label === params.req_origin_label) {
            return prev;
          }
          return { lat, lng, label: params.req_origin_label! };
        });
      }
      if (params.req_destination_lat && params.req_destination_lng && params.req_destination_label) {
        setReqDestination((prev) => {
          const lat = parseFloat(params.req_destination_lat!);
          const lng = parseFloat(params.req_destination_lng!);
          if (prev?.lat === lat && prev?.lng === lng && prev?.label === params.req_destination_label) {
            return prev;
          }
          return { lat, lng, label: params.req_destination_label! };
        });
      }
      setShowRequestModal(true);
    }
  }, [
    params.from_set_route,
    params.req_origin_lat,
    params.req_origin_lng,
    params.req_origin_label,
    params.req_destination_lat,
    params.req_destination_lng,
    params.req_destination_label,
  ]);

  const handlePostRequestPress = () => {
    const isVerified = profile?.is_verified && profile?.verified_badge;
    if (!isVerified) {
      Alert.alert(
        'Verification Required',
        'Only verified commuters can post ride requests. Please submit your verification documents in the Profile tab.',
        [
          { text: 'Go to Profile', onPress: () => router.push('/(main)/(tabs)/profile') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    // Prefill modal: if no custom request route is set, default to activeRoute (commute route)
    if (!reqOrigin && !reqDestination && activeRoute) {
      setReqOrigin({
        lat: activeRoute.origin_lat,
        lng: activeRoute.origin_lng,
        label: activeRoute.origin_label,
      });
      setReqDestination({
        lat: activeRoute.destination_lat,
        lng: activeRoute.destination_lng,
        label: activeRoute.destination_label,
      });
    }

    setShowRequestModal(true);
  };

  const submitRideRequest = async () => {
    if (!profile) return;
    const targetOrigin = reqOrigin || (activeRoute ? { lat: activeRoute.origin_lat, lng: activeRoute.origin_lng, label: activeRoute.origin_label } : null);
    const targetDestination = reqDestination || (activeRoute ? { lat: activeRoute.destination_lat, lng: activeRoute.destination_lng, label: activeRoute.destination_label } : null);

    if (!targetOrigin || !targetDestination) {
      Alert.alert('Route Missing', 'Please set a route for your ride request.');
      return;
    }
    if (!requestDate || !requestTime) {
      Alert.alert('Details Missing', 'Please select both departure date and time.');
      return;
    }

    setSavingRequest(true);
    try {
      const dateTimeIso = new Date(`${requestDate}T${requestTime}`).toISOString();
      const updatedLabel = JSON.stringify({
        text: `${targetOrigin.label.split(',')[0]} → ${targetDestination.label.split(',')[0]}`,
        seats: seatsNeeded,
        departure_time: dateTimeIso,
      });

      if (activeRequestRoute) {
        // Update existing ride request route
        const { error } = await supabase
          .from('routes')
          .update({
            origin_lat: targetOrigin.lat,
            origin_lng: targetOrigin.lng,
            origin_label: targetOrigin.label,
            destination_lat: targetDestination.lat,
            destination_lng: targetDestination.lng,
            destination_label: targetDestination.label,
            label: updatedLabel,
            route_hash: generateRouteHash(targetOrigin.lat, targetOrigin.lng, targetDestination.lat, targetDestination.lng),
            is_active: true,
          })
          .eq('id', activeRequestRoute.id);

        if (error) throw error;
      } else {
        // Create a new separate ride request route record in Supabase
        const routeHash = generateRouteHash(targetOrigin.lat, targetOrigin.lng, targetDestination.lat, targetDestination.lng);
        const { error } = await supabase
          .from('routes')
          .insert({
            user_id: profile.id,
            origin_lat: targetOrigin.lat,
            origin_lng: targetOrigin.lng,
            origin_label: targetOrigin.label,
            destination_lat: targetDestination.lat,
            destination_lng: targetDestination.lng,
            destination_label: targetDestination.label,
            label: updatedLabel,
            route_hash: routeHash,
            is_active: true,
          });

        if (error) throw error;
      }

      setShowRequestModal(false);
      Alert.alert('Success!', 'Your ride request has been published. Drivers will see it on their board and can offer you rides.');
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to publish request.');
    } finally {
      setSavingRequest(false);
    }
  };

  const cancelRideRequest = async () => {
    if (!profile) return;
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this "Looking for a Ride" request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              if (activeRequestRoute) {
                // Set is_active: false on request route
                const { error } = await supabase
                  .from('routes')
                  .update({ is_active: false })
                  .eq('id', activeRequestRoute.id);

                if (error) throw error;
              }

              Alert.alert('Cancelled', 'Your ride request has been removed.');
              setReqOrigin(null);
              setReqDestination(null);
              await loadData();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to cancel request.');
            }
          }
        }
      ]
    );
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load all open rides (in a real app, this would use activeRoute to filter nearby rides via PostGIS)
      const allRides = await getTrips({ limit: 50 });
      setAvailableRides(allRides.filter(t => t.status === 'open' || t.status === 'full' || t.status === 'ongoing'));

      // Load active ride request for the user
      if (profile?.id) {
        const { data: routesData, error: routesError } = await supabase
          .from('routes')
          .select('*')
          .eq('user_id', profile.id)
          .eq('is_active', true);

        if (!routesError && routesData) {
          const reqRoute = routesData.find((r: any) => isJsonLabel(r.label));
          if (reqRoute) {
            setActiveRequestRoute((prev: any) => {
              if (prev && prev.id === reqRoute.id && prev.is_active === reqRoute.is_active && prev.label === reqRoute.label) {
                return prev;
              }
              return reqRoute;
            });
            const details = parseRequestDetails(reqRoute.label);
            if (details) {
              setSeatsNeeded(prev => prev === (details.seats || 1) ? prev : (details.seats || 1));
              if (details.departure_time) {
                const dateObj = new Date(details.departure_time);
                const y = dateObj.getFullYear();
                const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                const d = String(dateObj.getDate()).padStart(2, '0');
                const formattedDate = `${y}-${m}-${d}`;
                setRequestDate(prev => prev === formattedDate ? prev : formattedDate);

                const hr = String(dateObj.getHours()).padStart(2, '0');
                const mn = String(dateObj.getMinutes()).padStart(2, '0');
                const formattedTime = `${hr}:${mn}`;
                setRequestTime(prev => prev === formattedTime ? prev : formattedTime);
              }
            }
            // Populate coordinates if they haven't been overwritten by query parameters
            if (params.from_set_route !== 'true') {
              setReqOrigin(prev => {
                if (prev && prev.lat === reqRoute.origin_lat && prev.lng === reqRoute.origin_lng && prev.label === reqRoute.origin_label) {
                  return prev;
                }
                return {
                  lat: reqRoute.origin_lat,
                  lng: reqRoute.origin_lng,
                  label: reqRoute.origin_label,
                };
              });
              setReqDestination(prev => {
                if (prev && prev.lat === reqRoute.destination_lat && prev.lng === reqRoute.destination_lng && prev.label === reqRoute.destination_label) {
                  return prev;
                }
                return {
                  lat: reqRoute.destination_lat,
                  lng: reqRoute.destination_lng,
                  label: reqRoute.destination_label,
                };
              });
            }
          } else {
            setActiveRequestRoute((prev: any) => prev === null ? null : null);
            if (params.from_set_route !== 'true') {
              setReqOrigin(prev => prev === null ? null : null);
              setReqDestination(prev => prev === null ? null : null);
            }
          }
        }
      }

      // Load my rides if user is driver
      if (profile?.id && isDriver) {
        const myPostedRides = await getDriverTrips(profile.id);
        const activePostedRides = myPostedRides.filter((a) =>
          ['open', 'ongoing', 'full'].includes(a.status)
        );
        activePostedRides.sort((a, b) => {
          const timeA = new Date(a.departure_time).getTime();
          const timeB = new Date(b.departure_time).getTime();
          return timeA - timeB; // Nearest departure first
        });
        setMyRides(activePostedRides);

        const requests = await getCommuterRequests();
        setRideRequests(requests);
      }
    } catch (e) {
      console.log('Error loading trips', e);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, isDriver, params.from_set_route]);

  const filteredAndSortedRides = useMemo(() => {
    let result = [...availableRides];

    // Status Filter: 'open' shows only open rides, 'all' shows open, full, and ongoing
    if (filterStatus === 'open') {
      result = result.filter(trip => trip.status === 'open');
    }

    // Max Fare Filter
    if (filterMaxFare !== null) {
      result = result.filter(trip => trip.fare_per_seat <= filterMaxFare);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'price_asc') {
        return a.fare_per_seat - b.fare_per_seat;
      }
      if (sortBy === 'price_desc') {
        return b.fare_per_seat - a.fare_per_seat;
      }
      // Default: soonest departure (time)
      const timeA = new Date(a.departure_time).getTime();
      const timeB = new Date(b.departure_time).getTime();
      return timeA - timeB;
    });

    return result;
  }, [availableRides, filterStatus, filterMaxFare, sortBy]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData, activeSegment])
  );

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
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="options-outline" size={20} color={theme.colors.text} />
          {(filterMaxFare !== null || filterStatus !== 'open' || sortBy !== 'time') && (
            <View style={[styles.filterIndicator, { backgroundColor: theme.colors.primary }]} />
          )}
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
                <View style={{ marginBottom: 16 }}>
                  <ActiveRouteCard
                    theme={theme}
                    originLabel={activeRoute.origin_label}
                    destinationLabel={activeRoute.destination_label}
                    onPress={() => router.push('/(main)/ride/set-route' as any)}
                  />

                  {/* Active Ride Request Details */}
                  {activeRequestRoute && (() => {
                    const reqDetails = parseRequestDetails(activeRequestRoute.label);
                    if (!reqDetails) return null;
                    return (
                      <ActiveRequestCard
                        theme={theme}
                        originLabel={activeRequestRoute.origin_label}
                        destinationLabel={activeRequestRoute.destination_label}
                        seats={reqDetails.seats}
                        departureTime={reqDetails.departure_time}
                        onCancel={cancelRideRequest}
                      />
                    );
                  })()}

                  {/* Post / Update Request Button (Commuters Only) */}
                  {!isDriver && (
                    <Pressable
                      style={[
                        styles.postRequestBtn,
                        { backgroundColor: theme.colors.primary }
                      ]}
                      onPress={handlePostRequestPress}
                    >
                      <Ionicons name="megaphone-outline" size={18} color={theme.colors.white} />
                      <Text style={[styles.postRequestBtnText, { fontFamily: 'Inter-SemiBold' }]}>
                        {activeRequestRoute ? "Update Ride Request" : "Post 'Looking for a Ride' Request"}
                      </Text>
                    </Pressable>
                  )}
                </View>
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

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 4 }}>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium', marginBottom: 0 }]}>
                  {loading ? 'Searching...' : `${filteredAndSortedRides.length} ride${filteredAndSortedRides.length !== 1 ? 's' : ''} found`}
                </Text>
                {(filterMaxFare !== null || filterStatus !== 'open' || sortBy !== 'time') && (
                  <Pressable
                    onPress={() => {
                      setFilterMaxFare(null);
                      setFilterStatus('open');
                      setSortBy('time');
                      setCustomFareText('');
                    }}
                    hitSlop={12}
                  >
                    <Text style={{ color: theme.colors.primary, fontFamily: 'Inter-SemiBold', fontSize: 13 }}>Reset Filters</Text>
                  </Pressable>
                )}
              </View>
              {loading ? (
                <>
                  <TripSkeletonCard theme={theme} />
                  <TripSkeletonCard theme={theme} />
                  <TripSkeletonCard theme={theme} />
                </>
              ) : filteredAndSortedRides.length > 0 ? (
                filteredAndSortedRides.map((trip) => (
                  <View key={trip.id} style={{ marginBottom: 14 }}>
                    <TripCard trip={trip} onPress={() => router.push(`/(main)/ride/${trip.id}`)} />
                  </View>
                ))
              ) : (
                <EmptyState
                  icon="funnel-outline"
                  title="No Matching Rides"
                  message={(filterMaxFare !== null || filterStatus !== 'open' || sortBy !== 'time') ? "Try adjusting your filters to see more results." : "Try adjusting your search criteria."}
                />
              )}
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
              </View>
              {loading ? (
                <>
                  <TripSkeletonCard theme={theme} />
                  <TripSkeletonCard theme={theme} />
                </>
              ) : myRides.length > 0 ? (
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
              {loading ? (
                <>
                  <RequestSkeletonCard theme={theme} />
                  <RequestSkeletonCard theme={theme} />
                  <RequestSkeletonCard theme={theme} />
                </>
              ) : rideRequests.length > 0 ? (
                rideRequests.map((req) => {
                  const details = parseRequestDetails(req.label);
                  const displayTime = details?.departure_time
                    ? new Date(details.departure_time).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Flexible Time';
                  const seatsNeeded = details?.seats || 1;

                  const handleOfferRide = () => {
                    let dateStr = '';
                    let timeStr = '';
                    if (details?.departure_time) {
                      const dateObj = new Date(details.departure_time);
                      const y = dateObj.getFullYear();
                      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                      const d = String(dateObj.getDate()).padStart(2, '0');
                      dateStr = `${y}-${m}-${d}`;

                      const hr = String(dateObj.getHours()).padStart(2, '0');
                      const mn = String(dateObj.getMinutes()).padStart(2, '0');
                      timeStr = `${hr}:${mn}`;
                    }

                    router.push({
                      pathname: '/(main)/ride/create',
                      params: {
                        origin_lat: String(req.origin_lat),
                        origin_lng: String(req.origin_lng),
                        origin_label: req.origin_label,
                        destination_lat: String(req.destination_lat),
                        destination_lng: String(req.destination_lng),
                        destination_label: req.destination_label,
                        date: dateStr,
                        time: timeStr,
                        seats: String(seatsNeeded),
                      }
                    });
                  };

                  return (
                    <CommuterRequestCard
                      key={req.id}
                      theme={theme}
                      commuterName={req.commuter?.full_name || 'Commuter'}
                      commuterAvatarUrl={req.commuter?.avatar_url}
                      commuterVerified={req.commuter?.verified_badge}
                      originLabel={req.origin_label}
                      destinationLabel={req.destination_label}
                      seatsNeeded={seatsNeeded}
                      displayTime={displayTime}
                      onOfferRide={handleOfferRide}
                    />
                  );
                })
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

      {/* ─── Commuter Request Modal ─── */}
      <CommuterRequestModal
        visible={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        theme={theme}
        reqOrigin={reqOrigin}
        reqDestination={reqDestination}
        activeRoute={activeRoute}
        seatsNeeded={seatsNeeded}
        setSeatsNeeded={setSeatsNeeded}
        requestDate={requestDate}
        setShowReqDatePicker={setShowReqDatePicker}
        requestTime={requestTime}
        setShowReqTimePicker={setShowReqTimePicker}
        savingRequest={savingRequest}
        submitRideRequest={submitRideRequest}
        parseRequestDetails={parseRequestDetails}
      />

      {/* Date & Time Picker Sub-modals */}
      <DatePickerModal
        visible={showReqDatePicker}
        onClose={() => setShowReqDatePicker(false)}
        onSelect={setRequestDate}
        selectedDate={requestDate}
        theme={theme}
      />
      <TimePickerModal
        visible={showReqTimePicker}
        onClose={() => setShowReqTimePicker(false)}
        onSelect={setRequestTime}
        selectedTime={requestTime}
        theme={theme}
      />

      {/* ─── Ride Filters Modal ─── */}
      <TripFiltersModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        theme={theme}
        filterMaxFare={filterMaxFare}
        setFilterMaxFare={setFilterMaxFare}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        sortBy={sortBy}
        setSortBy={setSortBy}
        customFareText={customFareText}
        setCustomFareText={setCustomFareText}
      />
    </SafeAreaView>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function TripSkeletonCard({ theme }: { theme: any }) {
  return (
    <View style={[styles.tripCard, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow, padding: 16, marginBottom: 14 }]}>
      <View style={{ flexDirection: 'row', marginBottom: 16, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <View style={{ marginLeft: 12, gap: 6 }}>
            <Skeleton width={100} height={14} />
            <Skeleton width={60} height={12} />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Skeleton width={80} height={20} />
          <Skeleton width={50} height={12} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <View style={{ alignItems: 'center', marginRight: 10, width: 14 }}>
          <Skeleton width={10} height={10} borderRadius={5} />
          <View style={{ flex: 1, width: 2, backgroundColor: theme.colors.border, marginVertical: 4 }} />
          <Skeleton width={10} height={10} borderRadius={5} />
        </View>
        <View style={{ flex: 1, gap: 12, minHeight: 44 }}>
          <Skeleton width="80%" height={14} />
          <Skeleton width="60%" height={14} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12 }}>
        <Skeleton width={80} height={24} borderRadius={12} style={{ marginRight: 8 }} />
        <Skeleton width={80} height={24} borderRadius={12} />
      </View>
    </View>
  );
}

function RequestSkeletonCard({ theme }: { theme: any }) {
  return (
    <View style={[styles.createRideCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 12, padding: 14 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width={120} height={16} />
          <Skeleton width="90%" height={12} />
          <Skeleton width="70%" height={12} />
        </View>
      </View>
      <Skeleton width={80} height={32} borderRadius={8} />
    </View>
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
  postRequestBtn: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postRequestBtnText: {
    color: '#fff',
    fontSize: 14,
  },
  requestStatusCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 8,
  },
  requestIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalSectionTitle: {
    fontSize: 15,
    marginTop: 12,
  },
  routeSummaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  seatSelectBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
  },
  filterIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

const pickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '88%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
  },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calTitle: { fontSize: 17 },
  calRow: { flexDirection: 'row' },
  calCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 40 },
  calDayLabel: { fontSize: 12 },
  calDayNum: { fontSize: 15 },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  timeSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '60%',
    paddingBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 12,
  },
  sheetHandle: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  sheetTitle: { fontSize: 17, textAlign: 'center', marginBottom: 12 },
});
