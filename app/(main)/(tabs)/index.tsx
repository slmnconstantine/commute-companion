/**
 * Home / Map Screen
 *
 * The primary screen of the app featuring a full-screen OpenStreetMap,
 * a floating search bar, FAB controls, and a bottom info card for
 * nearby rides. This is the first thing users see after logging in.
 */

import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Map, Camera, Layer, Marker, GeoJSONSource, type CameraRef } from '@maplibre/maplibre-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRoute } from '@/context/RouteContext';
import { useLocation } from '@/hooks/useLocation';
import { DEFAULT_DELTA } from '@/lib/constants';
import { getRoute, decodePolyline } from '@/services/routing';
import { searchNearbyTrips } from '@/services/trips';
import * as Location from 'expo-location';
import {
  startBroadcastingLocation,
  broadcastRouteLocation,
  broadcastRouteDisconnect,
  subscribeToRouteLocations,
  subscribeToDriverLocation,
  type RouteLocationPayload,
} from '@/services/liveTracking';
import { supabase } from '@/lib/supabase';
import Avatar from '@/components/common/Avatar';



// ── Stable mapStyle constant (MUST be outside component to avoid re-renders) ──
const HOME_MAP_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'],
      tileSize: 256,
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster' as const,
      source: 'osm',
    },
  ],
};

export default function HomeScreen() {
  const { theme, mode } = useTheme();
  const { profile } = useAuth();
  const { activeRoute } = useRoute();
  const { location, address, loading: locationLoading } = useLocation();
  const router = useRouter();
  const cameraRef = useRef<CameraRef>(null);

  const [routePolyline, setRoutePolyline] = React.useState<any>(null);
  const [nearbyRidesCount, setNearbyRidesCount] = React.useState<number | null>(null);
  const [activeOngoingTrip, setActiveOngoingTrip] = React.useState<any>(null);
  const [routeVisible, setRouteVisible] = React.useState(false);
  const [routeMembers, setRouteMembers] = React.useState<Record<string, RouteLocationPayload>>({});
  const [driverLiveLocation, setDriverLiveLocation] = React.useState<{ latitude: number; longitude: number } | null>(null);

  const routeChannelRef = React.useRef<any>(null);

  // Check and subscribe to active ongoing trips for real-time banner display
  React.useEffect(() => {
    if (!profile?.id) {
      setActiveOngoingTrip(null);
      return;
    }

    const userId = profile.id;
    const isUserDriver = profile.role === 'driver';

    async function checkActiveOngoingTrip() {
      try {
        if (isUserDriver) {
          const { data, error } = await supabase
            .from('trips')
            .select('*, driver:profiles!driver_id(*)')
            .eq('driver_id', userId)
            .eq('status', 'ongoing')
            .maybeSingle();
          if (!error) {
            setActiveOngoingTrip(data);
          }
        } else {
          // Commuter: find if they have an accepted booking on an ongoing trip
          const { data, error } = await supabase
            .from('bookings')
            .select('*, trip:trips!inner(*, driver:profiles!driver_id(*))')
            .eq('commuter_id', userId)
            .eq('status', 'accepted')
            .eq('trip.status', 'ongoing')
            .maybeSingle();
          if (!error && data) {
            setActiveOngoingTrip((data as any).trip);
          } else {
            setActiveOngoingTrip(null);
          }
        }
      } catch (err) {
        console.error('Error checking active ongoing trip:', err);
      }
    }

    checkActiveOngoingTrip();

    let channel = supabase.channel(`ongoing-trip-home-${userId}-${Date.now()}`);

    if (isUserDriver) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips', filter: `driver_id=eq.${userId}` },
        () => {
          checkActiveOngoingTrip();
        }
      );
    } else {
      channel = channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookings', filter: `commuter_id=eq.${userId}` },
          () => {
            checkActiveOngoingTrip();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'trips' },
          () => {
            checkActiveOngoingTrip();
          }
        );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.role]);

  // Global background location tracking for ongoing trips on Home page
  React.useEffect(() => {
    if (!profile?.id || !activeOngoingTrip || profile.role !== 'driver') return;

    const driverId = profile.id;
    let locationSubscription: any = null;

    async function startTracking() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (loc) => {
          startBroadcastingLocation(activeOngoingTrip.id, driverId, {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            heading: loc.coords.heading,
            speed: loc.coords.speed,
            timestamp: loc.timestamp,
          });
        }
      );
    }

    startTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [profile?.id, activeOngoingTrip, profile?.role]);

  // Subscribe to driver's live location if passenger has active ongoing trip
  React.useEffect(() => {
    if (!activeOngoingTrip || !profile?.id || profile.role === 'driver') {
      setDriverLiveLocation(null);
      return;
    }

    const unsubscribe = subscribeToDriverLocation(activeOngoingTrip.id, (loc: { latitude: number; longitude: number }) => {
      setDriverLiveLocation({ latitude: loc.latitude, longitude: loc.longitude });
    });

    return () => {
      unsubscribe();
    };
  }, [activeOngoingTrip?.id, profile?.id, profile?.role]);

  // Subscribe to route-wide member locations when activeRoute changes
  React.useEffect(() => {
    if (!activeRoute?.route_hash) {
      setRouteMembers({});
      return;
    }

    const { channel, unsubscribe } = subscribeToRouteLocations(
      activeRoute.route_hash,
      (payload) => {
        setRouteMembers(prev => ({
          ...prev,
          [payload.userId]: {
            ...payload,
            lastUpdated: Date.now(),
          }
        }));
      },
      (userId) => {
        setRouteMembers(prev => {
          const copy = { ...prev };
          delete copy[userId];
          return copy;
        });
      }
    );

    routeChannelRef.current = channel;

    return () => {
      unsubscribe();
      routeChannelRef.current = null;
    };
  }, [activeRoute?.route_hash]);

  // Broadcast own location to route members when routeVisible is toggled on
  React.useEffect(() => {
    if (!routeVisible || !activeRoute?.route_hash || !profile?.id) return;

    const driverId = profile.id;
    let locationSubscription: any = null;

    async function startBroadcasting() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to share route visibility.');
        setRouteVisible(false);
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 15 },
        (loc) => {
          if (routeChannelRef.current && profile) {
            broadcastRouteLocation(routeChannelRef.current, {
              userId: driverId,
              fullName: profile.full_name,
              avatarUrl: profile.avatar_url,
              role: profile.role,
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              timestamp: loc.timestamp,
            });
          }
        }
      );
    }

    startBroadcasting();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (routeChannelRef.current && profile?.id) {
        broadcastRouteDisconnect(routeChannelRef.current, profile.id);
      }
    };
  }, [routeVisible, activeRoute?.route_hash, profile?.id]);

  // Periodic heartbeat cleanup for stale route members
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRouteMembers(prev => {
        const copy = { ...prev };
        let changed = false;
        Object.entries(copy).forEach(([userId, member]: [string, any]) => {
          // If no update for 35 seconds, treat as disconnected
          if (now - member.lastUpdated > 35000) {
            delete copy[userId];
            changed = true;
          }
        });
        return changed ? copy : prev;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const toggleRouteVisibility = () => {
    setRouteVisible(prev => {
      const next = !prev;
      Alert.alert(
        next ? 'Visibility Enabled 👁️' : 'Visibility Disabled 🙈',
        next 
          ? 'Your location is now visible to other members commuting on this route.'
          : 'Your location is no longer shared with this route community.'
      );
      return next;
    });
  };

  React.useEffect(() => {
    async function fetchNearbyRides() {
      if (locationLoading || !location.latitude || !location.longitude) return;
      try {
        // Fetch trips in a 10km radius from current location
        const trips = await searchNearbyTrips(location.latitude, location.longitude, 10);
        setNearbyRidesCount(trips.length);
      } catch (err) {
        console.error('Error fetching nearby rides:', err);
        setNearbyRidesCount(0);
      }
    }
    fetchNearbyRides();
  }, [location.latitude, location.longitude, locationLoading]);

  React.useEffect(() => {
    async function fetchActiveRoutePolyline() {
      // 1. If there is an active ongoing trip, use its route polyline
      if (activeOngoingTrip?.route_polyline) {
        try {
          const coords = decodePolyline(activeOngoingTrip.route_polyline).map((c: any) => [c.longitude, c.latitude]);
          setRoutePolyline({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords }
          });
          if (cameraRef.current) {
            const lats = coords.map(c => c[1]);
            const lngs = coords.map(c => c[0]);
            const sw = [Math.min(...lngs), Math.min(...lats)];
            const ne = [Math.max(...lngs), Math.max(...lats)];
            cameraRef.current.fitBounds(
              [sw[0], sw[1], ne[0], ne[1]],
              { padding: { top: 50, bottom: 50, left: 50, right: 50 }, duration: 1000 }
            );
          }
        } catch (err) {
          console.error('Error decoding ongoing trip polyline:', err);
        }
        return;
      }

      // 2. Otherwise, check if activeRoute exists
      if (!activeRoute) {
        setRoutePolyline(null);
        return;
      }
      const route = await getRoute(
        activeRoute.origin_lat,
        activeRoute.origin_lng,
        activeRoute.destination_lat,
        activeRoute.destination_lng
      );
      if (route) {
        // MapLibre uses [longitude, latitude]
        const coords = route.coordinates.map(c => [c.longitude, c.latitude]);
        setRoutePolyline({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords }
        });

        // Fit camera to the route bounds
        if (cameraRef.current) {
          const lats = coords.map(c => c[1]);
          const lngs = coords.map(c => c[0]);
          const sw = [Math.min(...lngs), Math.min(...lats)];
          const ne = [Math.max(...lngs), Math.max(...lats)];
          cameraRef.current.fitBounds(
            [sw[0], sw[1], ne[0], ne[1]],
            { padding: { top: 50, bottom: 50, left: 50, right: 50 }, duration: 1000 }
          );
        }
      }
    }
    fetchActiveRoutePolyline();
  }, [activeRoute, activeOngoingTrip]);

  const isDriver = profile?.role === 'driver';
  const displayedRoute = activeOngoingTrip || activeRoute;

  const region = useMemo(
    () => ({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: DEFAULT_DELTA,
      longitudeDelta: DEFAULT_DELTA,
    }),
    [location.latitude, location.longitude]
  );

  /** Re-centre map on the user's current location */
  const handleCenterOnUser = () => {
    cameraRef.current?.easeTo({
      center: [location.longitude, location.latitude],
      zoom: 14,
      duration: 600,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={mode === 'light' ? 'dark-content' : 'light-content'}
        translucent
        backgroundColor="transparent"
      />

      {/* ── Full-screen Map ──────────────────────────────────────── */}
      <Map
        style={styles.map}
        logo={false}
        attribution={false}
        compass={false}
        mapStyle={HOME_MAP_STYLE as any}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [region.longitude, region.latitude],
            zoom: 14,
          }}
        />

        {/* User location marker */}
        <Marker
          id="user-location"
          lngLat={[location.longitude, location.latitude]}
        >
          <View style={styles.userDotOuter}>
            <View style={[styles.userDotInner, { backgroundColor: theme.colors.primary }]} />
          </View>
        </Marker>

        {/* Active Route Polyline */}
        {routePolyline && (
          <GeoJSONSource id="routeSource" data={routePolyline}>
            <Layer
              id="routeLayer"
              type="line"
              paint={{ 'line-color': theme.colors.primary, 'line-width': 6 }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </GeoJSONSource>
        )}

        {/* Active Route Markers */}
        {displayedRoute && (
          <>
            <Marker id="origin-marker" lngLat={[displayedRoute.origin_lng, displayedRoute.origin_lat]} anchor="bottom">
              <View style={styles.originMarker}>
                <Ionicons name="location" size={36} color={theme.colors.success} style={styles.pinShadow} />
              </View>
            </Marker>
            <Marker id="dest-marker" lngLat={[displayedRoute.destination_lng, displayedRoute.destination_lat]} anchor="bottom">
              <View style={styles.destMarker}>
                <Ionicons name="flag" size={36} color={theme.colors.error} style={styles.pinShadow} />
              </View>
            </Marker>
          </>
        )}

        {/* Driver live location marker for commuter */}
        {driverLiveLocation && (
          <Marker id="driver-location" lngLat={[driverLiveLocation.longitude, driverLiveLocation.latitude]}>
            <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.primary, borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 }} />
            </View>
          </Marker>
        )}

        {/* Route Members Location markers */}
        {Object.values(routeMembers).map((member) => {
          // Skip drawing ourselves
          if (member.userId === profile?.id) return null;
          
          return (
            <Marker
              key={member.userId}
              id={`member-${member.userId}`}
              lngLat={[member.longitude, member.latitude]}
              anchor="bottom"
            >
              <View style={styles.memberMarker}>
                <Avatar
                  uri={member.avatarUrl}
                  name={member.fullName}
                  size="sm"
                  showBadge={member.role === 'driver'}
                />
                <View style={[styles.memberTooltip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.memberTooltipText, { color: theme.colors.text }]} numberOfLines={1}>
                    {member.fullName.split(' ')[0]} ({member.role})
                  </Text>
                </View>
              </View>
            </Marker>
          );
        })}
      </Map>

      {/* ── Floating Search Bar / Active Trip Banner ────────────── */}
      <SafeAreaView style={styles.searchOverlay} edges={['top']}>
        {activeOngoingTrip ? (
          <Pressable
            style={[
              styles.ongoingBanner,
              {
                backgroundColor: theme.colors.success,
                shadowColor: theme.colors.shadow,
              },
            ]}
            onPress={() => router.push(`/(main)/ride/${activeOngoingTrip.id}`)}
          >
            <View style={styles.bannerLeft}>
              <View style={styles.pulseDot} />
              <View style={styles.bannerInfo}>
                <Text style={styles.bannerTitle}>Active Trip in Progress</Text>
                <Text style={styles.bannerSubtitle} numberOfLines={1}>
                  To: {activeOngoingTrip.destination_label.split(',')[0]}
                </Text>
              </View>
            </View>
            <View style={styles.bannerRight}>
              <Text style={styles.bannerActionText}>Resume Nav</Text>
              <Ionicons name="navigate-circle" size={20} color="#fff" />
            </View>
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.colors.surface,
                shadowColor: theme.colors.shadow,
              },
            ]}
            onPress={() => {
              // TODO: navigate to search screen
            }}
          >
            <Ionicons name="search" size={20} color={theme.colors.textMuted} />
            <Text
              style={[
                styles.searchPlaceholder,
                theme.typography.body,
                { color: theme.colors.textMuted },
              ]}
            >
              Where are you going?
            </Text>
            <View
              style={[
                styles.searchDivider,
                { backgroundColor: theme.colors.border },
              ]}
            />
            <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
          </Pressable>
        )}
      </SafeAreaView>

      {/* ── FAB Column (right side) ──────────────────────────────── */}
      <View style={[styles.fabColumn, { bottom: displayedRoute ? 320 : 250 }]}>
        {/* Toggle Route Visibility */}
        {activeRoute && (
          <Pressable
            style={[
              styles.fab,
              {
                backgroundColor: routeVisible ? theme.colors.success : theme.colors.surface,
                shadowColor: theme.colors.shadow,
              },
            ]}
            onPress={toggleRouteVisibility}
          >
            <Ionicons
              name={routeVisible ? "eye" : "eye-off"}
              size={22}
              color={routeVisible ? '#fff' : theme.colors.textMuted}
            />
          </Pressable>
        )}

        {/* Centre on user */}
        <Pressable
          style={[
            styles.fab,
            {
              backgroundColor: theme.colors.surface,
              shadowColor: theme.colors.shadow,
            },
          ]}
          onPress={handleCenterOnUser}
        >
          <Ionicons name="locate" size={22} color={theme.colors.primary} />
        </Pressable>


      </View>

      {/* ── Bottom Info Card ─────────────────────────────────────── */}
      <View style={styles.bottomCardWrapper}>
        <Pressable
          style={[
            styles.bottomCard,
            {
              backgroundColor: theme.colors.surface,
              shadowColor: theme.colors.shadow,
            },
          ]}
          onPress={() => router.push('/(main)/(tabs)/rides' as any)}
        >
          {/* Location row */}
          <View style={styles.cardLocationRow}>
            <View
              style={[
                styles.cardLocationDot,
                { backgroundColor: theme.colors.primary },
              ]}
            />
            <View style={styles.cardLocationText}>
              <Text
                style={[
                  theme.typography.subtitle,
                  { color: theme.colors.text },
                ]}
                numberOfLines={1}
              >
                {address || 'Current Location'}
              </Text>
              <Text
                style={[
                  theme.typography.caption,
                  { color: theme.colors.textMuted, marginTop: 2 },
                ]}
              >
                {locationLoading
                  ? 'Getting your location…'
                  : nearbyRidesCount === null
                  ? 'Finding rides nearby…'
                  : `${nearbyRidesCount} ${nearbyRidesCount === 1 ? 'ride' : 'rides'} nearby`}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textMuted}
            />
          </View>

          {/* Active Route Display */}
          {activeRoute && (
            <View style={[styles.activeRouteRow, { borderTopColor: theme.colors.border }]}>
              <View style={styles.activeRouteDots}>
                <View style={[styles.activeRouteDotGreen, { backgroundColor: theme.colors.success }]} />
                <View style={[styles.activeRouteLine, { backgroundColor: theme.colors.border }]} />
                <View style={[styles.activeRouteDotRed, { backgroundColor: theme.colors.error }]} />
              </View>
              <View style={styles.activeRouteLabels}>
                <Text style={[theme.typography.small, { color: theme.colors.text }]} numberOfLines={1}>
                  {activeRoute.origin_label.split(',')[0]}
                </Text>
                <Text style={[theme.typography.small, { color: theme.colors.text }]} numberOfLines={1}>
                  {activeRoute.destination_label.split(',')[0]}
                </Text>
              </View>
              <View style={[styles.yourRouteBadge, { backgroundColor: `${theme.colors.primary}15` }]}>
                <Text style={[theme.typography.small, { color: theme.colors.primary, fontFamily: 'Inter-SemiBold', fontSize: 10 }]}>
                  Your Route
                </Text>
              </View>
            </View>
          )}

          {/* Quick action pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
          >
            <Pressable
              style={[
                styles.pill,
                { backgroundColor: `${theme.colors.primary}15` },
              ]}
              onPress={() => router.push('/(main)/ride/set-route' as any)}
            >
              <Text
                style={[
                  theme.typography.small,
                  { color: theme.colors.primary, fontFamily: 'Inter-SemiBold' },
                ]}
              >
                📍 Set Route
              </Text>
            </Pressable>
            {(['🏠 Home', '🏢 Work', '⭐ Saved'] as const).map((label) => (
              <Pressable
                key={label}
                style={[
                  styles.pill,
                  { backgroundColor: theme.colors.inputBackground },
                ]}
              >
                <Text
                  style={[
                    theme.typography.small,
                    { color: theme.colors.text },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* ── Map ───────────────────────────────────────────────────── */
  map: {
    ...StyleSheet.absoluteFill as any,
  },

  /* ── User dot ──────────────────────────────────────────────── */
  userDotOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(13, 148, 136, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  originMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  destMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  /* ── Search bar ────────────────────────────────────────────── */
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 0,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
    gap: 10,
  },
  searchPlaceholder: {
    flex: 1,
  },
  searchDivider: {
    width: 1,
    height: 24,
  },

  /* ── FABs ──────────────────────────────────────────────────── */
  fabColumn: {
    position: 'absolute',
    right: 20,
    bottom: 180,
    alignItems: 'center',
    gap: 12,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  fabPrimary: {
    flexDirection: 'row',
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  fabPlusIcon: {
    position: 'absolute',
    right: 6,
    bottom: 6,
  },

  /* ── Bottom card ───────────────────────────────────────────── */
  bottomCardWrapper: {
    position: 'absolute',
    bottom: 88,
    left: 16,
    right: 16,
  },
  bottomCard: {
    borderRadius: 20,
    padding: 20,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 10,
  },
  cardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardLocationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardLocationText: {
    flex: 1,
  },

  /* ── Quick-action pills ────────────────────────────────────── */
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },

  /* ── Active Route in bottom card ────────────────────────────── */
  activeRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  activeRouteDots: {
    alignItems: 'center',
    width: 10,
  },
  activeRouteDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeRouteLine: {
    width: 1.5,
    height: 12,
    marginVertical: 1,
  },
  activeRouteDotRed: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeRouteLabels: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 4,
  },
  yourRouteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ongoingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  bannerInfo: {
    flex: 1,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  bannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  bannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerActionText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  memberMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberTooltip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    marginTop: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memberTooltipText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
  },
});
