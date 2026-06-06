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
import { getRoute } from '@/services/routing';

/** Placeholder rides for the bottom card */
const NEARBY_COUNT = 3;

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

  React.useEffect(() => {
    async function fetchActiveRoutePolyline() {
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
  }, [activeRoute]);

  const isDriver = profile?.role === 'driver';

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
        {activeRoute && (
          <>
            <Marker id="origin-marker" lngLat={[activeRoute.origin_lng, activeRoute.origin_lat]} anchor="bottom">
              <View style={styles.originMarker}>
                <Ionicons name="location" size={36} color={theme.colors.success} style={styles.pinShadow} />
              </View>
            </Marker>
            <Marker id="dest-marker" lngLat={[activeRoute.destination_lng, activeRoute.destination_lat]} anchor="bottom">
              <View style={styles.destMarker}>
                <Ionicons name="flag" size={36} color={theme.colors.error} style={styles.pinShadow} />
              </View>
            </Marker>
          </>
        )}
      </Map>

      {/* ── Floating Search Bar ──────────────────────────────────── */}
      <SafeAreaView style={styles.searchOverlay} edges={['top']}>
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
      </SafeAreaView>

      {/* ── FAB Column (right side) ──────────────────────────────── */}
      <View style={styles.fabColumn}>
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

        {/* Report traffic */}
        <Pressable
          style={[
            styles.fab,
            {
              backgroundColor: theme.colors.surface,
              shadowColor: theme.colors.shadow,
            },
          ]}
          onPress={() => {
            // TODO: open report traffic modal
          }}
        >
          <Ionicons name="warning" size={22} color={theme.colors.warning} />
        </Pressable>

        {/* Create ride (driver only) */}
        {isDriver && (
          <Pressable
            style={[
              styles.fab,
              styles.fabPrimary,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => router.push('/(main)/ride/create' as any)}
          >
            <Ionicons name="car-sport" size={20} color={theme.colors.white} />
            <Ionicons
              name="add"
              size={14}
              color={theme.colors.white}
              style={styles.fabPlusIcon}
            />
          </Pressable>
        )}
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
                  : `${NEARBY_COUNT} rides nearby`}
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
});
