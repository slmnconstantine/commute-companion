/**
 * Set Route Screen
 *
 * Allows users to set their daily commute route (origin + destination).
 * Uses the existing geocoding service for place search, and map pinning.
 * Persists the route via RouteContext.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map, Camera, type MapRef, type CameraRef } from '@maplibre/maplibre-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useRoute } from '@/context/RouteContext';
import { searchPlaces, GeocodingResult, reverseGeocode } from '@/services/geocoding';
import { useLocation } from '@/hooks/useLocation';

interface LocationData {
  lat: number;
  lng: number;
  label: string;
}

// ── Stable mapStyle constant (MUST be outside component to avoid re-renders) ──
const MAP_STYLE = {
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

export default function SetRouteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { saveRoute, recentRoutes, setActiveRoute } = useRoute();
  const { location } = useLocation();

  const [origin, setOrigin] = useState<LocationData | null>(null);
  const [destination, setDestination] = useState<LocationData | null>(null);
  const [searchMode, setSearchMode] = useState<'origin' | 'destination' | null>(null);
  const [mapMode, setMapMode] = useState<'origin' | 'destination' | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [isConfirmingLocation, setIsConfirmingLocation] = useState(false);

  // Refs for the map picker
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);

  // Fly camera to user's real GPS location once it's loaded
  useEffect(() => {
    // Only fly if location differs significantly from default Manila coords or if we know it's loaded
    if (location && cameraRef.current) {
      cameraRef.current.flyTo({ center: [location.longitude, location.latitude], zoom: 15, duration: 1000 });
    }
  }, [location]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) { setSearchResults([]); return; }
    setSearching(true);
    const results = await searchPlaces(query);
    setSearchResults(results);
    setSearching(false);
  };

  const handleSelectPlace = (place: GeocodingResult) => {
    const loc: LocationData = { lat: place.lat, lng: place.lng, label: place.displayName };
    if (searchMode === 'origin') setOrigin(loc);
    else if (searchMode === 'destination') setDestination(loc);
    setSearchMode(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  /** Confirm the map center as the selected location */
  const handleConfirmMapLocation = async () => {
    setIsConfirmingLocation(true);
    try {
      // Use MapRef.getCenter() — the most reliable way to read the center
      const center = await mapRef.current?.getCenter();
      if (!center) {
        Alert.alert('Error', 'Could not read the map center. Please try again.');
        setIsConfirmingLocation(false);
        return;
      }

      const [lng, lat] = center;
      const label = await reverseGeocode(lat, lng);

      const loc: LocationData = { lat, lng, label };
      if (mapMode === 'origin') setOrigin(loc);
      else if (mapMode === 'destination') setDestination(loc);

      setMapMode(null);
      setSearchMode(null);
    } catch (err) {
      console.error('Confirm location error:', err);
      Alert.alert('Error', 'Failed to get the location. Please try again.');
    } finally {
      setIsConfirmingLocation(false);
    }
  };

  const handleSaveRoute = async () => {
    if (!origin || !destination) {
      Alert.alert('Incomplete', 'Please set both origin and destination.');
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

  // --- MAP MODE SCREEN ---
  if (mapMode) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <Pressable onPress={() => setMapMode(null)} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
            Pin {mapMode === 'origin' ? 'Origin' : 'Destination'}
          </Text>
          <View style={styles.headerBtn} />
        </View>

        <View style={{ flex: 1 }}>
          <Map
            ref={mapRef}
            androidView="texture"
            style={styles.map}
            logo={false}
            attribution={false}
            compass={false}
            mapStyle={MAP_STYLE as any}
          >
            <Camera
              ref={cameraRef}
              initialViewState={{
                center: [location.longitude, location.latitude],
                zoom: 15,
              }}
            />
          </Map>

          {/* Center Pin Overlay */}
          <View style={styles.centerPinContainer} pointerEvents="none">
            <Ionicons name="location" size={48} color={mapMode === 'origin' ? theme.colors.success : theme.colors.error} />
          </View>

          {/* Confirm Button */}
          <View style={[styles.mapConfirmContainer, { paddingBottom: insets.bottom + 20 }]}>
            <Pressable
              style={[styles.saveButton, { backgroundColor: theme.colors.primary, marginHorizontal: 20 }]}
              onPress={handleConfirmMapLocation}
              disabled={isConfirmingLocation}
            >
              {isConfirmingLocation ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.saveButtonText}>Confirm Location</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // --- SEARCH MODE SCREEN ---
  if (searchMode) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <Pressable onPress={() => { setSearchMode(null); setSearchResults([]); setSearchQuery(''); }} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
            Search {searchMode === 'origin' ? 'Origin' : 'Destination'}
          </Text>
          <View style={styles.headerBtn} />
        </View>

        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}>
          <Ionicons name="search" size={20} color={theme.colors.primary} />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder={`Search for a place...`}
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.searchInput, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
              <Ionicons name="close-circle" size={22} color={theme.colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Choose on Map Button */}
        <Pressable
          style={[styles.chooseOnMapBtn, { backgroundColor: `${theme.colors.primary}15` }]}
          onPress={() => setMapMode(searchMode)}
        >
          <Ionicons name="map-outline" size={20} color={theme.colors.primary} />
          <Text style={[theme.typography.body, { color: theme.colors.primary, fontFamily: 'Inter-SemiBold', marginLeft: 8 }]}>
            Choose on Map
          </Text>
        </Pressable>

        <ScrollView style={styles.searchResultsList}>
          {searchResults.map((result, i) => (
            <Pressable
              key={i}
              style={[styles.searchItem, { borderBottomColor: theme.colors.border }]}
              onPress={() => handleSelectPlace(result)}
            >
              <Ionicons name="location" size={20} color={theme.colors.primary} />
              <Text style={[styles.searchItemText, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]} numberOfLines={2}>
                {result.displayName}
              </Text>
            </Pressable>
          ))}
          {searching && (
            <Text style={[styles.searchingText, { color: theme.colors.textMuted }]}>Searching...</Text>
          )}
        </ScrollView>
      </View>
    );
  }

  // --- MAIN SET ROUTE SCREEN ---
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Set Commute Route</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: `${theme.colors.primary}10`, borderColor: `${theme.colors.primary}25` }]}>
          <Ionicons name="compass" size={24} color={theme.colors.primary} />
          <Text style={[styles.infoText, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            Set your daily commute route to join a community of users who share the same path. Get real-time updates about traffic, tips, and more!
          </Text>
        </View>

        {/* Route inputs */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Your Route</Text>

        <Pressable
          style={[styles.locationInput, { backgroundColor: theme.colors.surface, borderColor: origin ? theme.colors.primary : theme.colors.border }]}
          onPress={() => setSearchMode('origin')}
        >
          <View style={[styles.locationDot, { backgroundColor: theme.colors.success }]} />
          <Text
            style={[styles.locationText, { color: origin ? theme.colors.text : theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}
            numberOfLines={1}
          >
            {origin?.label || 'Set starting point (e.g. Home)'}
          </Text>
          <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
        </Pressable>

        <View style={[styles.routeConnector, { borderColor: theme.colors.border }]} />

        <Pressable
          style={[styles.locationInput, { backgroundColor: theme.colors.surface, borderColor: destination ? theme.colors.primary : theme.colors.border }]}
          onPress={() => setSearchMode('destination')}
        >
          <View style={[styles.locationDot, { backgroundColor: theme.colors.error }]} />
          <Text
            style={[styles.locationText, { color: destination ? theme.colors.text : theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}
            numberOfLines={1}
          >
            {destination?.label || 'Set destination (e.g. Work, School)'}
          </Text>
          <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
        </Pressable>

        {/* Save Button */}
        {origin && destination && (
          <Pressable
            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleSaveRoute}
          >
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.saveButtonText}>Save Commute Route</Text>
          </Pressable>
        )}

        {/* Recent Routes */}
        {recentRoutes.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', marginTop: 32 }]}>
              Recent Routes
            </Text>
            {recentRoutes.map((route) => (
              <Pressable
                key={route.id}
                style={[styles.recentRoute, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => {
                  setActiveRoute(route);
                  Alert.alert('Route Set!', `Active route: ${route.label || route.origin_label + ' → ' + route.destination_label}`, [
                    { text: 'OK', onPress: () => router.back() },
                  ]);
                }}
              >
                <Ionicons name="time-outline" size={20} color={theme.colors.textMuted} />
                <View style={styles.recentRouteInfo}>
                  <Text style={[styles.recentRouteLabel, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]} numberOfLines={1}>
                    {route.label || `${route.origin_label.split(',')[0]} → ${route.destination_label.split(',')[0]}`}
                  </Text>
                  <Text style={[styles.recentRouteDate, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                    {new Date(route.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17 },
  scrollContent: { padding: 20, paddingBottom: 100 },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19 },

  sectionTitle: { fontSize: 17, marginBottom: 14 },

  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  locationDot: { width: 12, height: 12, borderRadius: 6 },
  locationText: { flex: 1, fontSize: 14 },

  routeConnector: { width: 2, height: 20, marginLeft: 21, borderLeftWidth: 2, borderStyle: 'dashed' },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 16,
    marginTop: 24,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-SemiBold' },

  recentRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  recentRouteInfo: { flex: 1, gap: 2 },
  recentRouteLabel: { fontSize: 14 },
  recentRouteDate: { fontSize: 12 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 16,
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  searchInput: { flex: 1, fontSize: 16 },
  searchResultsList: { paddingHorizontal: 16, marginTop: 16 },
  searchItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, paddingHorizontal: 8 },
  searchItemText: { flex: 1, fontSize: 14 },
  searchingText: { textAlign: 'center', paddingVertical: 20, fontFamily: 'Inter-Regular' },

  chooseOnMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
  },

  map: { ...StyleSheet.absoluteFill },
  centerPinContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
  },
  mapConfirmContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  }
});
