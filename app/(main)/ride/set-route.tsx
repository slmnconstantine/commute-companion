import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, Pressable, Alert, Animated
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map, Camera, RasterSource, Layer, GeoJSONSource, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useRoute } from '@/context/RouteContext';
import { useLocation } from '@/hooks/useLocation';
import { getRoute } from '@/services/routing';
import { searchPlaces, GeocodingResult, reverseGeocode } from '@/services/geocoding';

interface LocationData {
  lat: number;
  lng: number;
  label: string;
}

export default function SetRouteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string;
    origin_lat?: string;
    origin_lng?: string;
    origin_label?: string;
    destination_lat?: string;
    destination_lng?: string;
    destination_label?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { location } = useLocation();
  const { saveRoute, activeRoute } = useRoute();

  const [origin, setOrigin] = useState<LocationData | null>(() => {
    if (params.origin_lat && params.origin_lng && params.origin_label) {
      return {
        lat: parseFloat(params.origin_lat),
        lng: parseFloat(params.origin_lng),
        label: params.origin_label,
      };
    }
    if (params.mode === 'request') {
      return null;
    }
    if (activeRoute) {
      return {
        lat: activeRoute.origin_lat,
        lng: activeRoute.origin_lng,
        label: activeRoute.origin_label,
      };
    }
    return null;
  });

  const [destination, setDestination] = useState<LocationData | null>(() => {
    if (params.destination_lat && params.destination_lng && params.destination_label) {
      return {
        lat: parseFloat(params.destination_lat),
        lng: parseFloat(params.destination_lng),
        label: params.destination_label,
      };
    }
    if (params.mode === 'request') {
      return null;
    }
    if (activeRoute) {
      return {
        lat: activeRoute.destination_lat,
        lng: activeRoute.destination_lng,
        label: activeRoute.destination_label,
      };
    }
    return null;
  });

  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number; polyline: string } | null>(null);

  // Search state
  const [searchMode, setSearchMode] = useState<'origin' | 'destination' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Map pin mode: which location the next map tap will set
  const [pinMode, setPinMode] = useState<'origin' | 'destination'>('origin');
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  const cameraRef = useRef<CameraRef>(null);

  // Fly camera to user's real GPS location once it's loaded
  useEffect(() => {
    if (location && cameraRef.current && !activeRoute) {
      cameraRef.current.flyTo({ center: [location.longitude, location.latitude], zoom: 14, duration: 1000 });
    }
  }, [location, activeRoute]);

  // ── Search handlers ──
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) { setSearchResults([]); return; }
    setSearching(true);
    const results = await searchPlaces(query);
    setSearchResults(results);
    setSearching(false);
  };

  /** Shared route calculation logic */
  const calculateRouteIfReady = async (o: LocationData | null, d: LocationData | null) => {
    if (!o || !d) return;
    const route = await getRoute(o.lat, o.lng, d.lat, d.lng);
    if (route) {
      setRouteCoords(route.coordinates);
      setRouteInfo({ distanceKm: route.distanceKm, durationMin: route.durationMin, polyline: route.encodedPolyline });
      const lats = route.coordinates.map(c => c.latitude);
      const lngs = route.coordinates.map(c => c.longitude);
      cameraRef.current?.fitBounds(
        [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
        { padding: { top: 100, right: 50, bottom: 250, left: 50 }, duration: 1000 }
      );
    }
  };

  // Auto-calculate route on mount if prefilled
  useEffect(() => {
    if (origin && destination && routeCoords.length === 0) {
      calculateRouteIfReady(origin, destination);
    }
  }, [origin, destination]);

  // Geocode text-only prefilled labels on mount
  useEffect(() => {
    const geocodePrefill = async () => {
      let resolvedOrigin = origin;
      let resolvedDest = destination;
      let updated = false;

      if (!origin && params.origin_label && !params.origin_lat) {
        try {
          const results = await searchPlaces(params.origin_label);
          if (results.length > 0) {
            const first = results[0];
            resolvedOrigin = { lat: first.lat, lng: first.lng, label: first.displayName };
            setOrigin(resolvedOrigin);
            updated = true;
          }
        } catch (e) {
          console.error('Error geocoding prefill origin:', e);
        }
      }

      if (!destination && params.destination_label && !params.destination_lat) {
        try {
          const results = await searchPlaces(params.destination_label);
          if (results.length > 0) {
            const first = results[0];
            resolvedDest = { lat: first.lat, lng: first.lng, label: first.displayName };
            setDestination(resolvedDest);
            updated = true;
          }
        } catch (e) {
          console.error('Error geocoding prefill destination:', e);
        }
      }

      if (updated && resolvedOrigin && resolvedDest) {
        calculateRouteIfReady(resolvedOrigin, resolvedDest);
      }
    };

    geocodePrefill();
  }, [params.origin_label, params.destination_label]);

  const handleSelectPlace = async (place: GeocodingResult) => {
    const loc: LocationData = { lat: place.lat, lng: place.lng, label: place.displayName };
    const newOrigin = searchMode === 'origin' ? loc : origin;
    const newDest = searchMode === 'destination' ? loc : destination;
    if (searchMode === 'origin') setOrigin(loc);
    else setDestination(loc);

    setSearchMode(null);
    setSearchQuery('');
    setSearchResults([]);

    await calculateRouteIfReady(newOrigin, newDest);
  };

  // ── Map tap handler ──
  const handleMapPress = async (event: any) => {
    if (reverseGeocoding) return; // Prevent overlapping taps

    let coords: [number, number] | null = null;
    try {
      if (event?.nativeEvent?.lngLat) {
        coords = event.nativeEvent.lngLat;
      } else if (event?.geometry?.coordinates) {
        coords = event.geometry.coordinates;
      }
    } catch {}
    if (!coords) return;

    const [lng, lat] = coords;
    setReverseGeocoding(true);

    let label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    try {
      const addr = await reverseGeocode(lat, lng);
      if (addr && addr !== 'Unknown location') label = addr;
    } catch {}

    const loc: LocationData = { lat, lng, label };

    let newOrigin = origin;
    let newDest = destination;

    if (pinMode === 'origin') {
      setOrigin(loc);
      newOrigin = loc;
      setPinMode('destination'); // Auto-advance to destination
    } else {
      setDestination(loc);
      newDest = loc;
      setPinMode('origin'); // Cycle back
    }

    setReverseGeocoding(false);
    await calculateRouteIfReady(newOrigin, newDest);
  };

  // ── Save route handler ──
  const handleSaveRoute = async () => {
    if (!origin || !destination) {
      Alert.alert('Incomplete', 'Please set both origin and destination.');
      return;
    }

    if (params.mode === 'request') {
      router.navigate({
        pathname: '/(main)/(tabs)/rides',
        params: {
          from_set_route: 'true',
          req_origin_lat: String(origin.lat),
          req_origin_lng: String(origin.lng),
          req_origin_label: origin.label,
          req_destination_lat: String(destination.lat),
          req_destination_lng: String(destination.lng),
          req_destination_label: destination.label,
        }
      });
      return;
    }

    await saveRoute({
      origin_label: origin.label,
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      destination_label: destination.label,
      destination_lat: destination.lat,
      destination_lng: destination.lng,
      label: `${origin.label.split(',')[0]} → ${destination.label.split(',')[0]}`,
    });

    Alert.alert('Route Saved! 🎉', 'Your commute route has been set. You can now see updates from your route community.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
          {params.mode === 'request' ? 'Set Ride Request Route' : 'Set Commute Route'}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      {searchMode ? (
        /* ═══ Search Overlay ═══ */
        <View style={[styles.searchOverlay, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}>
            <Ionicons name="search" size={20} color={theme.colors.primary} />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder={`Search ${searchMode}...`}
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.searchInput, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]}
              autoFocus
            />
            <Pressable onPress={() => { setSearchMode(null); setSearchResults([]); setSearchQuery(''); }}>
              <Ionicons name="close-circle" size={22} color={theme.colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={styles.searchResults}>
            {searchResults.map((result, i) => (
              <Pressable key={i} style={[styles.searchItem, { borderBottomColor: theme.colors.border }]} onPress={() => handleSelectPlace(result)}>
                <Ionicons name="location" size={20} color={theme.colors.primary} />
                <Text style={[styles.searchItemText, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]} numberOfLines={2}>
                  {result.displayName}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : (
        /* ═══ Route Map ═══ */
        <View style={styles.mapContainer}>
          <Map
            style={styles.map}
            logo={false}
            attribution={false}
            compass={false}
            mapStyle={{ version: 8, sources: {}, layers: [] }}
            onPress={handleMapPress}
          >
            <Camera
              ref={cameraRef}
              initialViewState={{
                center: [location?.longitude || 121.0509, location?.latitude || 14.5818],
                zoom: 14,
              }}
            />
            <RasterSource
              id="osm"
              tiles={['https://tile.openstreetmap.org/{z}/{x}/{y}.png']}
              tileSize={256}
              maxzoom={19}
            >
              <Layer id="osm-layer" type="raster" source="osm" />
            </RasterSource>

            {/* User location indicator */}
            {location && (
              <Marker id="user-location" lngLat={[location.longitude, location.latitude]}>
                <View style={styles.userDotOuter}>
                  <View style={[styles.userDotInner, { backgroundColor: theme.colors.primary }]} />
                </View>
              </Marker>
            )}

            {origin && (
              <Marker id="origin" lngLat={[origin.lng, origin.lat]}>
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="location" size={36} color={theme.colors.success} style={styles.pinShadow} />
                </View>
              </Marker>
            )}
            {destination && (
              <Marker id="destination" lngLat={[destination.lng, destination.lat]}>
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="flag" size={36} color={theme.colors.error} style={styles.pinShadow} />
                </View>
              </Marker>
            )}

            {routeCoords.length > 0 && (
              <GeoJSONSource
                id="route"
                data={{
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: routeCoords.map(c => [c.longitude, c.latitude]),
                  },
                  properties: {}
                }}
              >
                <Layer id="routeLayer" type="line" source="route" style={{ lineColor: '#0D9488', lineWidth: 4 }} />
              </GeoJSONSource>
            )}
          </Map>

          {/* Location inputs overlay */}
          <View style={[styles.locationInputs, { backgroundColor: theme.colors.surface }]}>
            <Pressable style={[styles.locationRow, { borderBottomColor: theme.colors.border }]} onPress={() => setSearchMode('origin')}>
              <View style={[styles.locationDot, { backgroundColor: theme.colors.success }]} />
              <Text style={[styles.locationText, { color: origin ? theme.colors.text : theme.colors.textMuted, fontFamily: 'Inter-Regular' }]} numberOfLines={1}>
                {origin?.label || 'Set origin location'}
              </Text>
              <Pressable onPress={() => setSearchMode('origin')} hitSlop={8}>
                <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
              </Pressable>
            </Pressable>
            <Pressable style={styles.locationRow} onPress={() => setSearchMode('destination')}>
              <View style={[styles.locationDot, { backgroundColor: theme.colors.accent }]} />
              <Text style={[styles.locationText, { color: destination ? theme.colors.text : theme.colors.textMuted, fontFamily: 'Inter-Regular' }]} numberOfLines={1}>
                {destination?.label || 'Set destination location'}
              </Text>
              <Pressable onPress={() => setSearchMode('destination')} hitSlop={8}>
                <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
              </Pressable>
            </Pressable>
          </View>

          {/* Pin mode toggle */}
          <View style={[styles.pinModeBar, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="finger-print" size={16} color={theme.colors.primary} />
            <Text style={[styles.pinModeLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
              Tap map to set:
            </Text>
            <Pressable
              style={[
                styles.pinModeBtn,
                pinMode === 'origin' && { backgroundColor: `${theme.colors.success}20`, borderColor: theme.colors.success },
              ]}
              onPress={() => setPinMode('origin')}
            >
              <View style={[styles.pinModeDot, { backgroundColor: theme.colors.success }]} />
              <Text style={[styles.pinModeBtnText, {
                color: pinMode === 'origin' ? theme.colors.success : theme.colors.textMuted,
                fontFamily: pinMode === 'origin' ? 'Inter-SemiBold' : 'Inter-Regular',
              }]}>
                Origin
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.pinModeBtn,
                pinMode === 'destination' && { backgroundColor: `${theme.colors.error}20`, borderColor: theme.colors.error },
              ]}
              onPress={() => setPinMode('destination')}
            >
              <View style={[styles.pinModeDot, { backgroundColor: theme.colors.error }]} />
              <Text style={[styles.pinModeBtnText, {
                color: pinMode === 'destination' ? theme.colors.error : theme.colors.textMuted,
                fontFamily: pinMode === 'destination' ? 'Inter-SemiBold' : 'Inter-Regular',
              }]}>
                Destination
              </Text>
            </Pressable>
          </View>

          {/* Reverse geocoding indicator */}
          {reverseGeocoding && (
            <View style={[styles.geocodingBanner, { backgroundColor: `${theme.colors.primary}DD` }]}>
              <Text style={[styles.geocodingText, { fontFamily: 'Inter-Medium' }]}>📍 Getting address…</Text>
            </View>
          )}

          {routeInfo && (
            <View style={[styles.routeInfoCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.routeInfoRow}>
                <Ionicons name="navigate" size={16} color={theme.colors.primary} />
                <Text style={[styles.routeInfoText, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>
                  {routeInfo.distanceKm} km
                </Text>
              </View>
              <View style={styles.routeInfoRow}>
                <Ionicons name="time" size={16} color={theme.colors.primary} />
                <Text style={[styles.routeInfoText, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>
                  {routeInfo.durationMin} min
                </Text>
              </View>
            </View>
          )}

          {origin && destination && routeInfo && (
            <Pressable style={[styles.nextButton, { backgroundColor: theme.colors.primary }]} onPress={handleSaveRoute}>
              <Text style={styles.nextButtonText}>
                {params.mode === 'request' ? 'Confirm Request Route' : 'Save Route'}
              </Text>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17 },

  searchOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 16, marginTop: 60, paddingHorizontal: 16, height: 56, borderRadius: 16, borderWidth: 1.5 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16 },
  searchResults: { flex: 1 },
  searchItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  searchItemText: { fontSize: 15, marginLeft: 12, flex: 1 },

  mapContainer: { flex: 1 },
  map: { flex: 1 },

  userDotOuter: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(13, 148, 136, 0.2)', alignItems: 'center', justifyContent: 'center' },
  userDotInner: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  pinShadow: { textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },

  locationInputs: { position: 'absolute', top: 16, left: 16, right: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  locationDot: { width: 10, height: 10, borderRadius: 5, marginRight: 16 },
  locationText: { flex: 1, fontSize: 15 },

  pinModeBar: { position: 'absolute', bottom: 120, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', padding: 8, paddingHorizontal: 16, borderRadius: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  pinModeLabel: { fontSize: 13, marginLeft: 6, marginRight: 12 },
  pinModeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: 'transparent', marginRight: 8 },
  pinModeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  pinModeBtnText: { fontSize: 13 },

  geocodingBanner: { position: 'absolute', top: 130, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  geocodingText: { color: '#fff', fontSize: 13 },

  routeInfoCard: { position: 'absolute', bottom: 180, right: 16, padding: 12, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  routeInfoRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  routeInfoText: { fontSize: 14, marginLeft: 8 },

  nextButton: { position: 'absolute', bottom: 32, left: 16, right: 16, height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  nextButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-SemiBold', marginRight: 8 },
});
