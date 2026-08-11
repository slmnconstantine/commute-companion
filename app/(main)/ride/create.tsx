import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, Pressable, Alert, Animated, Platform, Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map, Camera, RasterSource, Layer, GeoJSONSource, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/hooks/useLocation';
import { DEFAULT_DELTA } from '@/lib/constants';
import { getRoute } from '@/services/routing';
import { searchPlaces, GeocodingResult, reverseGeocode } from '@/services/geocoding';
import { createTrip } from '@/services/trips';
import { getVehicles } from '@/services/vehicles';
import { Vehicle } from '@/types/database';
import { calculateFare, formatCurrency } from '@/utils/fareCalculator';
import DatePickerModal from '@/components/ride/DatePickerModal';
import TimePickerModal from '@/components/ride/TimePickerModal';
import AnimatedMarker from '@/components/common/AnimatedMarker';
import GlassCard from '@/components/common/GlassCard';

interface LocationData {
  lat: number;
  lng: number;
  label: string;
}

// ── Month names for the date picker ──
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ══════════════════════════════════════════════════════════════════════════════
// CreateRideScreen
// ══════════════════════════════════════════════════════════════════════════════
export default function CreateRideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { profile } = useAuth();
  const { location, loading: locationLoading } = useLocation();

  const [step, setStep] = useState(1); // 1: route, 2: details, 3: confirm
  const params = useLocalSearchParams<{
    time?: string;
    date?: string;
    origin?: string;
    destination?: string;
    origin_lat?: string;
    originLat?: string;
    origin_lng?: string;
    originLng?: string;
    origin_label?: string;
    originLabel?: string;
    destination_lat?: string;
    destLat?: string;
    destination_lng?: string;
    destLng?: string;
    destination_label?: string;
    destLabel?: string;
    seats?: string;
    fare?: string;
  }>();

  const [origin, setOrigin] = useState<LocationData | null>(() => {
    const lat = params.origin_lat || params.originLat;
    const lng = params.origin_lng || params.originLng;
    const label = params.origin_label || params.originLabel;
    if (lat && lng && label) {
      return {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        label,
      };
    }
    return null;
  });

  const [destination, setDestination] = useState<LocationData | null>(() => {
    const lat = params.destination_lat || params.destLat;
    const lng = params.destination_lng || params.destLng;
    const label = params.destination_label || params.destLabel;
    if (lat && lng && label) {
      return {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        label,
      };
    }
    return null;
  });

  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number; polyline: string } | null>(null);
  
  const [availableSeats, setAvailableSeats] = useState(() => {
    if (params.seats) {
      const s = parseInt(params.seats, 10);
      if (!isNaN(s) && s >= 1 && s <= 6) return s;
    }
    return 3;
  });

  const [departureDate, setDepartureDate] = useState(params.date || '');
  const [departureTime, setDepartureTime] = useState(params.time || '');
  const [isFree, setIsFree] = useState(params.fare === '0' || params.fare === '0.00');
  const [loading, setLoading] = useState(false);

  // Prevent unverified accounts from creating rides
  useEffect(() => {
    if (profile && (profile.role !== 'driver' || !profile.is_verified || !profile.verified_badge)) {
      Alert.alert(
        'Verification Required',
        'Your driver application is currently under review. You will be able to create rides once your documents have been verified.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [profile]);

  // Search state
  const [searchMode, setSearchMode] = useState<'origin' | 'destination' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Vehicle and Fare
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [manualFare, setManualFare] = useState(params.fare && params.fare !== '0' ? params.fare : '');

  useEffect(() => {
    if (profile?.id) {
      getVehicles(profile.id).then(v => {
        if (v.length > 0) setVehicle(v[0]);
      });
    }
  }, [profile?.id]);

  // Map pin mode: which location the next map tap will set
  const [pinMode, setPinMode] = useState<'origin' | 'destination'>('origin');
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  // Picker modals
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const cameraRef = useRef<CameraRef>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const hasAutoCenteredRef = useRef(false);

  // Auto-focus camera to user's real GPS location once resolved
  useEffect(() => {
    const hasPrefilledRoute = !!((params.origin_lat || params.originLat) && (params.destination_lat || params.destLat));
    if (location?.latitude && location?.longitude && !locationLoading && !hasPrefilledRoute && !routeInfo) {
      if (!hasAutoCenteredRef.current) {
        hasAutoCenteredRef.current = true;
        setTimeout(() => {
          cameraRef.current?.easeTo({
            center: [location.longitude, location.latitude],
            zoom: 14,
            duration: 800,
          });
        }, 300);
      }
    }
  }, [location?.latitude, location?.longitude, locationLoading, params, routeInfo]);

  const handleCenterOnUser = () => {
    if (location?.latitude && location?.longitude) {
      cameraRef.current?.easeTo({
        center: [location.longitude, location.latitude],
        zoom: 14,
        duration: 600,
      });
    }
  };

  const fareBreakdown = useMemo(() => {
    if (!routeInfo) return null;
    return calculateFare(routeInfo.distanceKm, routeInfo.durationMin, availableSeats);
  }, [routeInfo, availableSeats]);

  const finalFarePerSeat = useMemo(() => {
    if (isFree) return 0;
    if (vehicle?.type === 'private') return parseFloat(manualFare) || 0;
    return fareBreakdown?.totalPerSeat || 0;
  }, [isFree, vehicle, manualFare, fareBreakdown]);

  // ── Auto-Geocode from Voice Assistant Params ──
  useEffect(() => {
    const autoGeocode = async () => {
      if (params.origin && params.destination && !origin && !destination) {
        setLoading(true);
        try {
          const originResults = await searchPlaces(params.origin);
          const destResults = await searchPlaces(params.destination);

          let newOrigin: LocationData | null = null;
          let newDest: LocationData | null = null;

          if (originResults.length > 0) {
            newOrigin = { lat: originResults[0].lat, lng: originResults[0].lng, label: originResults[0].displayName };
            setOrigin(newOrigin);
          }
          if (destResults.length > 0) {
            newDest = { lat: destResults[0].lat, lng: destResults[0].lng, label: destResults[0].displayName };
            setDestination(newDest);
          }

          if (newOrigin && newDest) {
            await calculateRouteIfReady(newOrigin, newDest);
          }
        } catch (e) {
          console.error("Auto geocode failed:", e);
        } finally {
          setLoading(false);
        }
      }
    };
    autoGeocode();
  }, [params.origin, params.destination]);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // ── Search handlers ──
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.trim().length < 3) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchPlaces(query.trim());
      setSearchResults(results);
      setSearching(false);
    }, 250);
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
        { padding: { top: 100, right: 50, bottom: 100, left: 50 }, duration: 1000 }
      );
    }
  };

  // Auto-calculate route coordinates and info on mount if locations are prefilled
  useEffect(() => {
    if (origin && destination && routeCoords.length === 0) {
      calculateRouteIfReady(origin, destination);
    }
  }, [origin, destination]);

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
      // MapLibre RN v11 event: nativeEvent.lngLat = [lng, lat]
      if (event?.nativeEvent?.lngLat) {
        coords = event.nativeEvent.lngLat;
      } else if (event?.geometry?.coordinates) {
        // Fallback for older event format
        coords = event.geometry.coordinates;
      }
    } catch {}
    if (!coords) return;

    const [lng, lat] = coords;
    setReverseGeocoding(true);

    // Reverse geocode the tapped location
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

  // ── Create trip handler ──
  const handleCreateTrip = async () => {
    if (!origin || !destination || !routeInfo || !fareBreakdown || !profile) return;

    const depTime = departureDate && departureTime
      ? new Date(`${departureDate}T${departureTime}`).toISOString()
      : new Date(Date.now() + 3600000).toISOString(); // Default 1 hour from now

    setLoading(true);
    try {
      const { data, error } = await createTrip({
        driver_id: profile.id,
        vehicle_id: vehicle?.id || null as any,
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        origin_label: origin.label,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        destination_label: destination.label,
        route_polyline: routeInfo.polyline,
        departure_time: depTime,
        available_seats: availableSeats,
        fare_per_seat: finalFarePerSeat,
        status: 'open',
      });

      if (error) throw error;
      Alert.alert('Success!', 'Your ride has been published.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create ride.');
    } finally {
      setLoading(false);
    }
  };

  // Format display values for the date/time pickers
  const displayDate = departureDate
    ? new Date(departureDate + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  const displayTime = departureTime
    ? (() => {
        const [h, m] = departureTime.split(':').map(Number);
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const ampm = h < 12 ? 'AM' : 'PM';
        return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
      })()
    : '';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => step > 1 ? setStep(step - 1) : router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
          {step === 1 ? 'Set Route' : step === 2 ? 'Ride Details' : 'Confirm & Publish'}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Progress */}
      <View style={[styles.progressBar, { backgroundColor: theme.colors.surface }]}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={[styles.progressStep, { backgroundColor: s <= step ? theme.colors.primary : theme.colors.border }]} />
        ))}
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
      ) : step === 1 ? (
        /* ═══ Step 1: Route Map ═══ */
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
                center: [location.longitude, location.latitude],
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

            {/* User location */}
            {location && (
              <Marker id="user-location" lngLat={[location.longitude, location.latitude]}>
                <AnimatedMarker variant="user" primaryColor={theme.colors.primary} />
              </Marker>
            )}

            {origin && (
              <Marker id="origin" lngLat={[origin.lng, origin.lat]}>
                <AnimatedMarker variant="origin" label="Pickup" color={theme.colors.success} />
              </Marker>
            )}
            {destination && (
              <Marker id="destination" lngLat={[destination.lng, destination.lat]}>
                <AnimatedMarker variant="destination" label="Drop-off" color={theme.colors.error} />
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
                {origin?.label || 'Set pickup location'}
              </Text>
              <Pressable onPress={() => setSearchMode('origin')} hitSlop={8}>
                <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
              </Pressable>
            </Pressable>
            <Pressable style={styles.locationRow} onPress={() => setSearchMode('destination')}>
              <View style={[styles.locationDot, { backgroundColor: theme.colors.accent }]} />
              <Text style={[styles.locationText, { color: destination ? theme.colors.text : theme.colors.textMuted, fontFamily: 'Inter-Regular' }]} numberOfLines={1}>
                {destination?.label || 'Set drop-off location'}
              </Text>
              <Pressable onPress={() => setSearchMode('destination')} hitSlop={8}>
                <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
              </Pressable>
            </Pressable>
          </View>

          {/* Pin mode toggle */}
          <GlassCard
            style={[
              styles.pinModeBar,
              { bottom: (origin && destination && routeInfo) ? 96 : 24 },
            ]}
          >
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
          </GlassCard>

          {/* Reverse geocoding indicator */}
          {reverseGeocoding && (
            <View style={[styles.geocodingBanner, { backgroundColor: `${theme.colors.primary}DD` }]}>
              <Text style={[styles.geocodingText, { fontFamily: 'Inter-Medium' }]}>📍 Getting address…</Text>
            </View>
          )}

          {routeInfo && (
            <GlassCard
              style={[
                styles.routeInfoCard,
                { bottom: (origin && destination && routeInfo) ? 160 : 88 },
              ]}
            >
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
            </GlassCard>
          )}

          {/* Focus on User Location Button */}
          <Pressable
            style={({ pressed }) => [
              styles.fab,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                bottom: (origin && destination && routeInfo) ? 260 : 88,
                transform: [{ scale: pressed ? 0.9 : 1 }],
              },
            ]}
            onPress={handleCenterOnUser}
          >
            <Ionicons name="locate" size={20} color={theme.colors.primary} />
          </Pressable>

          {origin && destination && routeInfo && (
            <Pressable style={[styles.nextButton, { backgroundColor: theme.colors.primary }]} onPress={() => setStep(2)}>
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
          )}
        </View>
      ) : step === 2 ? (
        /* ═══ Step 2: Details ═══ */
        <ScrollView style={styles.detailsContainer} contentContainerStyle={styles.detailsContent}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Available Seats</Text>
          <View style={styles.seatRow}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Pressable
                key={n}
                style={[styles.seatButton, {
                  backgroundColor: n === availableSeats ? theme.colors.primary : theme.colors.surface,
                  borderColor: n === availableSeats ? theme.colors.primary : theme.colors.border,
                }]}
                onPress={() => setAvailableSeats(n)}
              >
                <Ionicons name="person" size={18} color={n === availableSeats ? '#fff' : theme.colors.textMuted} />
                <Text style={[styles.seatNum, { color: n === availableSeats ? '#fff' : theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>{n}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', marginTop: 24 }]}>Departure</Text>
          <View style={styles.dateTimeRow}>
            {/* Date picker button */}
            <Pressable
              style={[styles.dateInput, { backgroundColor: theme.colors.surface, borderColor: departureDate ? theme.colors.primary : theme.colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={departureDate ? theme.colors.primary : theme.colors.textMuted} />
              <Text
                style={[styles.dateText, {
                  color: departureDate ? theme.colors.text : theme.colors.textMuted,
                  fontFamily: departureDate ? 'Inter-Medium' : 'Inter-Regular',
                }]}
                numberOfLines={1}
              >
                {displayDate || 'Select date'}
              </Text>
            </Pressable>

            {/* Time picker button */}
            <Pressable
              style={[styles.dateInput, { backgroundColor: theme.colors.surface, borderColor: departureTime ? theme.colors.primary : theme.colors.border, flex: 0.8 }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color={departureTime ? theme.colors.primary : theme.colors.textMuted} />
              <Text
                style={[styles.dateText, {
                  color: departureTime ? theme.colors.text : theme.colors.textMuted,
                  fontFamily: departureTime ? 'Inter-Medium' : 'Inter-Regular',
                }]}
                numberOfLines={1}
              >
                {displayTime || 'Select time'}
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', marginTop: 24 }]}>Fare Option</Text>
          <Pressable
            style={[
              styles.freeFareToggle,
              { 
                backgroundColor: theme.colors.surface, 
                borderColor: isFree ? theme.colors.primary : theme.colors.border,
                borderWidth: isFree ? 1.5 : 1
              }
            ]}
            onPress={() => setIsFree(!isFree)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons 
                name={isFree ? "gift-outline" : "cash-outline"} 
                size={22} 
                color={isFree ? theme.colors.primary : theme.colors.textMuted} 
              />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ color: theme.colors.text, fontFamily: 'Inter-SemiBold', fontSize: 14 }}>
                  Make this ride FREE 🎁
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontFamily: 'Inter-Regular', fontSize: 12, marginTop: 2 }}>
                  Share your commute without charging passengers
                </Text>
              </View>
            </View>
            <Ionicons 
              name={isFree ? "checkbox" : "square-outline"} 
              size={24} 
              color={isFree ? theme.colors.primary : theme.colors.textMuted} 
            />
          </Pressable>

          {vehicle?.type === 'private' && !isFree && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Set Fare (per seat)</Text>
              <TextInput
                style={[styles.fareInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                keyboardType="numeric"
                placeholder="Enter amount (e.g. 50)"
                placeholderTextColor={theme.colors.textMuted}
                value={manualFare}
                onChangeText={setManualFare}
              />
            </View>
          )}

          {fareBreakdown && vehicle?.type !== 'private' && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', marginTop: 24 }]}>Fare Estimate (Automatic Tariff)</Text>
              <View style={[styles.fareCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: isFree ? 0.6 : 1 }]}>
                <FareLine label="Base fare" amount={isFree ? 0 : fareBreakdown.baseFare} theme={theme} />
                <FareLine label={`Distance (${routeInfo?.distanceKm} km)`} amount={isFree ? 0 : fareBreakdown.distanceCost} theme={theme} />
                <FareLine label={`Duration (${routeInfo?.durationMin} min)`} amount={isFree ? 0 : fareBreakdown.timeCost} theme={theme} />
                <View style={[styles.fareDivider, { backgroundColor: theme.colors.border }]} />
                <View style={styles.fareRow}>
                  <Text style={[styles.fareTotalLabel, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>Total per seat</Text>
                  <Text style={[styles.fareTotalAmount, { color: isFree ? theme.colors.success : theme.colors.primary, fontFamily: 'Inter-Bold' }]}>
                    {isFree ? 'FREE' : formatCurrency(finalFarePerSeat)}
                  </Text>
                </View>
              </View>
            </>
          )}

          <Pressable style={[styles.nextButton, { backgroundColor: theme.colors.primary, marginTop: 24 }]} onPress={() => setStep(3)}>
            <Text style={styles.nextButtonText}>Review & Publish</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </Pressable>
        </ScrollView>
      ) : (
        /* ═══ Step 3: Confirm ═══ */
        <ScrollView style={styles.detailsContainer} contentContainerStyle={styles.detailsContent}>
          <View style={[styles.confirmCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.confirmTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Route</Text>
            <View style={styles.confirmRoute}>
              <View style={[styles.locationDot, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.confirmText, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]} numberOfLines={2}>{origin?.label}</Text>
            </View>
            <View style={styles.confirmRoute}>
              <View style={[styles.locationDot, { backgroundColor: theme.colors.accent }]} />
              <Text style={[styles.confirmText, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]} numberOfLines={2}>{destination?.label}</Text>
            </View>
          </View>

          <View style={[styles.confirmCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.confirmTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Details</Text>
            <Text style={[styles.confirmText, { color: theme.colors.textMuted }]}>Seats: {availableSeats}</Text>
            <Text style={[styles.confirmText, { color: theme.colors.textMuted }]}>Distance: {routeInfo?.distanceKm} km</Text>
            <Text style={[styles.confirmText, { color: theme.colors.textMuted }]}>Duration: ~{routeInfo?.durationMin} min</Text>
            {departureDate && departureTime && (
              <Text style={[styles.confirmText, { color: theme.colors.textMuted }]}>Departure: {displayDate} at {displayTime}</Text>
            )}
            <Text style={[styles.confirmText, { color: isFree ? theme.colors.success : theme.colors.primary, fontFamily: 'Inter-Bold', fontSize: 18, marginTop: 8 }]}>
              {isFree ? 'FREE' : formatCurrency(finalFarePerSeat)} per seat
            </Text>
          </View>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Pressable
              style={[styles.publishButton, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleCreateTrip}
              onPressIn={() => Animated.spring(buttonScale, { toValue: 0.97, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(buttonScale, { toValue: 1, friction: 5, useNativeDriver: true }).start()}
              disabled={loading}
            >
              <Ionicons name="rocket" size={22} color="#fff" />
              <Text style={styles.publishText}>{loading ? 'Publishing...' : 'Publish Ride'}</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      )}

      {/* ═══ Picker Modals ═══ */}
      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={setDepartureDate}
        selectedDate={departureDate}
        theme={theme}
      />
      <TimePickerModal
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onSelect={setDepartureTime}
        selectedTime={departureTime}
        theme={theme}
      />
    </View>
  );
}

function FareLine({ label, amount, theme }: { label: string; amount: number; theme: any }) {
  return (
    <View style={styles.fareRow}>
      <Text style={[styles.fareLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>{label}</Text>
      <Text style={[styles.fareAmount, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>{formatCurrency(amount)}</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Styles
// ══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17 },
  progressBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingVertical: 12 },
  freeFareToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  progressStep: { flex: 1, height: 4, borderRadius: 2 },
  mapContainer: { flex: 1 },
  map: { flex: 1 },

  /* User dot */
  userDotOuter: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(13, 148, 136, 0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  userDotInner: {
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  pinShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  locationInputs: { position: 'absolute', top: 12, left: 16, right: 16, borderRadius: 16, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  locationDot: { width: 12, height: 12, borderRadius: 6 },
  locationText: { flex: 1, fontSize: 14 },

  fab: {
    position: 'absolute',
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 10,
  },

  /* Pin mode bar */
  pinModeBar: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center',
    padding: 8, paddingHorizontal: 16,
    borderRadius: 100, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  pinModeLabel: { fontSize: 13, marginLeft: 6, marginRight: 12 },
  pinModeBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 100, borderWidth: 1, borderColor: 'transparent', marginRight: 8,
  },
  pinModeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  pinModeBtnText: { fontSize: 13 },

  /* Geocoding banner */
  geocodingBanner: {
    position: 'absolute', top: 130, alignSelf: 'center',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  geocodingText: { color: '#fff', fontSize: 13 },

  routeInfoCard: {
    position: 'absolute', right: 16,
    padding: 12, borderRadius: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  routeInfoRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  routeInfoText: { fontSize: 14, marginLeft: 8 },

  nextButton: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    height: 56, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#0057FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 6,
  },
  nextButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-SemiBold' },
  searchOverlay: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 14, borderWidth: 2, paddingHorizontal: 16, gap: 12 },
  searchInput: { flex: 1, fontSize: 16 },
  searchResults: { marginTop: 8 },
  searchItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, paddingHorizontal: 8 },
  searchItemText: { flex: 1, fontSize: 14 },
  detailsContainer: { flex: 1 },
  detailsContent: { padding: 24, paddingBottom: 120 },
  sectionTitle: { fontSize: 17, marginBottom: 12 },
  seatRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  seatButton: { width: 56, height: 56, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 2 },
  seatNum: { fontSize: 12 },
  dateTimeRow: { flexDirection: 'row', gap: 12 },
  dateInput: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 12, gap: 8 },
  dateText: { flex: 1, fontSize: 15 },
  fareCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fareLabel: { fontSize: 14 },
  fareAmount: { fontSize: 14 },
  fareDivider: { height: 1, marginVertical: 4 },
  fareTotalLabel: { fontSize: 16 },
  fareTotalAmount: { fontSize: 20 },
  confirmCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10, marginBottom: 16 },
  confirmTitle: { fontSize: 16, marginBottom: 4 },
  confirmRoute: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  confirmText: { flex: 1, fontSize: 14, fontFamily: 'Inter-Regular' },
  publishButton: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  publishText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-SemiBold' },
  fareInput: { height: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 16, fontFamily: 'Inter-Medium' },
});

// ══════════════════════════════════════════════════════════════════════════════
// Picker styles
// ══════════════════════════════════════════════════════════════════════════════
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

  /* Calendar */
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

  /* Time picker */
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
  timeScroll: { paddingHorizontal: 20 },
  timeSlot: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, marginBottom: 2,
  },
  timeSlotText: { fontSize: 16 },
});
