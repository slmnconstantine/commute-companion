import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map, Camera, RasterSource, Layer, GeoJSONSource, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { getTripById, updateTripStatus, hasActiveTrip } from '@/services/trips';
import { getTripBookings, updateBookingStatus, deleteBooking, confirmCommuterArrival, confirmDriverArrival } from '@/services/bookings';
import { getOrCreateChatRoom, joinChatRoom, getChatRoom } from '@/services/chatRooms';
import { sendMessage } from '@/services/messages';
import { decodePolyline } from '@/services/routing';
import { supabase } from '@/lib/supabase';
import { formatDepartureTime } from '@/utils/dateFormatter';
import { formatCurrency, calculateFare, getDriverPayout } from '@/utils/fareCalculator';
import { startBroadcastingLocation, stopBroadcastingLocation, subscribeToDriverLocation } from '@/services/liveTracking';
import * as Location from 'expo-location';
import Avatar from '@/components/common/Avatar';
import Badge from '@/components/common/Badge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { TripWithDriver, BookingWithCommuter } from '@/types/database';
import DriverBookingsList from '@/components/ride/DriverBookingsList';
import TripBottomActions from '@/components/ride/TripBottomActions';
import RouteLayer from '@/components/common/RouteLayer';
import AnimatedMarker from '@/components/common/AnimatedMarker';
import ProfileCardModal from '@/components/common/ProfileCardModal';
import ETAOverlay from '@/components/ride/ETAOverlay';
import SOSButton from '@/components/ride/SOSButton';
import { recordCancellation, getCancellationWarning } from '@/utils/cancellationTracker';

// Haversine formula to calculate distance in km
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const { profile } = useAuth();

  const [trip, setTrip] = useState<TripWithDriver | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [driverLiveLocation, setDriverLiveLocation] = useState<{ latitude: number; longitude: number; timestamp: number } | null>(null);
  const [now, setNow] = useState(Date.now());

  // Interval to re-evaluate staleness
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  const [bookings, setBookings] = useState<BookingWithCommuter[]>([]);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);
  const [hasPromptedArrival, setHasPromptedArrival] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const cameraRef = useRef<CameraRef>(null);

  const userBooking = bookings.find(b => b.commuter_id === profile?.id);
  const isConfirmedPassenger = userBooking?.status === 'accepted';
  const isDriver = profile?.id === trip?.driver_id;
  const isOngoingDriver = !!(isDriver && trip && trip.status === 'ongoing');
  const isOngoingActiveUser = !!(trip && trip.status === 'ongoing' && (isDriver || isConfirmedPassenger));

  // A driver is stale if we haven't received a location update in the last 30 seconds
  const isDriverStale = driverLiveLocation ? (now - driverLiveLocation.timestamp > 30000) : false;

  const acceptedBookings = bookings.filter(b => b.status === 'accepted');
  const totalCollectedFare = acceptedBookings.reduce((sum, b) => sum + (b.fare_paid || 0), 0);
  const driverPayoutDetails = getDriverPayout(totalCollectedFare);

  // Compute ETA & remaining distance during ongoing trips
  const etaInfo = React.useMemo(() => {
    if (!trip || trip.status !== 'ongoing' || !driverLiveLocation || routeCoords.length < 2) return null;
    const destLat = trip.destination_lat;
    const destLng = trip.destination_lng;
    const remainingKm = getDistance(driverLiveLocation.latitude, driverLiveLocation.longitude, destLat, destLng);
    // Estimate ETA: city average ~25 km/h
    const etaMinutes = Math.round((remainingKm / 25) * 60);
    return { remainingKm, etaMinutes };
  }, [driverLiveLocation, trip?.status, routeCoords.length]);



  useFocusEffect(
    useCallback(() => {
      loadTrip();
    }, [id])
  );

  const loadTrip = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [data, bookingsData, chatRoom] = await Promise.all([
        getTripById(id),
        getTripBookings(id),
        getChatRoom(id)
      ]);

      setTrip(data);
      if (data?.route_polyline) {
        setRouteCoords(decodePolyline(data.route_polyline));
      }

      setBookings(bookingsData);
      if (chatRoom) setChatRoomId(chatRoom.id);
    } catch (e) {
      Alert.alert('Error', 'Failed to load trip details.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Live Tracking
  useEffect(() => {
    if (!trip || !profile) return;

    let locationSubscription: Location.LocationSubscription | null = null;
    let unsubscribeCommuter: (() => void) | null = null;

    const setupTracking = async () => {
      const isDriver = profile.id === trip.driver_id;

      if (isDriver && trip.status === 'ongoing') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required to broadcast your location.');
          return;
        }

        locationSubscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 10 },
          (loc) => {
            setDriverLiveLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, timestamp: loc.timestamp });
            startBroadcastingLocation(trip.id, profile.id, {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              heading: loc.coords.heading,
              speed: loc.coords.speed,
              timestamp: loc.timestamp,
            });
          }
        );
      } else if (!isDriver && trip.status === 'ongoing') {
        unsubscribeCommuter = subscribeToDriverLocation(trip.id, (loc) => {
          setDriverLiveLocation({ latitude: loc.latitude, longitude: loc.longitude, timestamp: loc.timestamp });
        });
      }
    };

    setupTracking();

    return () => {
      if (locationSubscription) locationSubscription.remove();
      stopBroadcastingLocation();
      if (unsubscribeCommuter) unsubscribeCommuter();
    };
  }, [trip?.status, profile?.id]);

  // Follow driver's live location on map when trip is ongoing
  useEffect(() => {
    if (isOngoingActiveUser && driverLiveLocation && cameraRef.current) {
      cameraRef.current.flyTo({
        center: [driverLiveLocation.longitude, driverLiveLocation.latitude],
        zoom: 15,
        duration: 1000,
      });
    }
  }, [driverLiveLocation, isOngoingActiveUser]);

  // Prompt driver when they arrive within 100m of the destination
  useEffect(() => {
    if (isOngoingDriver && driverLiveLocation && trip && !hasPromptedArrival) {
      const distance = getDistance(
        driverLiveLocation.latitude,
        driverLiveLocation.longitude,
        trip.destination_lat,
        trip.destination_lng
      );
      if (distance < 0.1) {
        setHasPromptedArrival(true);
        Alert.alert(
          'Destination Reached 🎉',
          'You have arrived at your destination. Would you like to complete this trip now?',
          [
            { text: 'Not Yet', style: 'cancel' },
            { text: 'Complete Trip', onPress: () => handleUpdateTripStatus('completed') }
          ]
        );
      }
    }
  }, [driverLiveLocation, isOngoingDriver, trip, hasPromptedArrival]);

  const handleAcceptBooking = async (booking: BookingWithCommuter) => {
    Alert.alert(
      'Accept Request',
      `Are you sure you want to accept the request from ${booking.commuter.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setProcessingBookingId(booking.id);
            try {
              await updateBookingStatus(booking.id, 'accepted');

              if (trip) {
                const seatsBooked = booking.seats_booked || 1;
                const newAvailableSeats = Math.max(0, trip.available_seats - seatsBooked);

                const updates: any = { available_seats: newAvailableSeats };
                if (newAvailableSeats <= 0 && trip.status === 'open') {
                  updates.status = 'full';
                }

                await supabase
                  .from('trips')
                  .update(updates)
                  .eq('id', trip.id);

                setTrip(prev => prev ? { ...prev, ...updates } : null);
              }

              let room = await getChatRoom(id);
              if (!room) {
                room = await getOrCreateChatRoom(id);
              }
              if (!room) throw new Error("Could not create chat room");

              setChatRoomId(room.id);
              await joinChatRoom(room.id, booking.commuter_id);

              if (profile?.id) {
                await joinChatRoom(room.id, profile.id);
              }

              if (profile?.id) {
                await sendMessage(room.id, profile.id, `${booking.commuter.full_name} has joined the trip!`, true);
              }

              setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'accepted' } : b));
              Alert.alert('Success', 'Booking accepted and added to group chat!');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to accept booking');
              console.error(e);
            } finally {
              setProcessingBookingId(null);
            }
          }
        }
      ]
    );
  };

  const handleRejectBooking = async (booking: BookingWithCommuter) => {
    Alert.alert(
      'Reject Request',
      `Are you sure you want to reject the request from ${booking.commuter.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingBookingId(booking.id);
            try {
              await updateBookingStatus(booking.id, 'rejected');
              setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'rejected' } : b));
              Alert.alert('Success', 'Booking request rejected.');
            } catch (e) {
              Alert.alert('Error', 'Failed to reject booking');
            } finally {
              setProcessingBookingId(null);
            }
          }
        }
      ]
    );
  };

  const handleRemovePassenger = async (booking: BookingWithCommuter) => {
    Alert.alert(
      'Remove Passenger',
      `Are you sure you want to remove ${booking.commuter.full_name} from this trip?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setProcessingBookingId(booking.id);
            try {
              const isAccepted = booking.status === 'accepted';
              await deleteBooking(booking.id);

              if (isAccepted && trip) {
                const seatsBooked = booking.seats_booked || 1;
                const newAvailableSeats = trip.available_seats + seatsBooked;

                const updates: any = { available_seats: newAvailableSeats };
                if (newAvailableSeats > 0 && trip.status === 'full') {
                  updates.status = 'open';
                }

                await supabase
                  .from('trips')
                  .update(updates)
                  .eq('id', trip.id);

                setTrip(prev => prev ? { ...prev, ...updates } : null);
              }

              if (chatRoomId && profile?.id) {
                await sendMessage(chatRoomId, profile.id, `${booking.commuter.full_name} was removed from the trip by the driver.`, true);
              }
              setBookings(prev => prev.filter(b => b.id !== booking.id));
              Alert.alert('Success', `${booking.commuter.full_name} has been removed from the trip.`);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to remove passenger');
            } finally {
              setProcessingBookingId(null);
            }
          }
        }
      ]
    );
  };

  const handleLeaveTrip = async (bookingId: string) => {
    const warning = await getCancellationWarning();
    const alertBody = warning
      ? `Are you sure you want to remove yourself from this trip?\n\n${warning}`
      : 'Are you sure you want to remove yourself from this trip?';

    Alert.alert(
      'Leave Trip',
      alertBody,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setProcessingBookingId(bookingId);
            try {
              const booking = bookings.find(b => b.id === bookingId);
              const isAccepted = booking?.status === 'accepted';

              await deleteBooking(bookingId);

              if (booking && isAccepted && trip) {
                const seatsBooked = booking.seats_booked || 1;
                const newAvailableSeats = trip.available_seats + seatsBooked;

                const updates: any = { available_seats: newAvailableSeats };
                if (newAvailableSeats > 0 && trip.status === 'full') {
                  updates.status = 'open';
                }

                await supabase
                  .from('trips')
                  .update(updates)
                  .eq('id', trip.id);

                setTrip(prev => prev ? { ...prev, ...updates } : null);
              }

              if (chatRoomId && profile?.id) {
                await sendMessage(chatRoomId, profile.id, `${profile.full_name} has left the trip.`, true);
              }
              setBookings(prev => prev.filter(b => b.id !== bookingId));
              await recordCancellation();
              Alert.alert('Success', 'You have left the trip.');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to leave trip');
            } finally {
              setProcessingBookingId(null);
            }
          }
        }
      ]
    );
  };

  const handleCommuterArrival = async (bookingId: string) => {
    try {
      await confirmCommuterArrival(bookingId);
      Alert.alert('Arrived! 🎉', 'You have confirmed your arrival. Waiting for the driver to confirm.');
      await loadTrip();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to confirm arrival');
    }
  };

  const handleDriverArrival = async (bookingId: string) => {
    try {
      await confirmDriverArrival(bookingId);
      Alert.alert('Arrival Confirmed! 🏁', 'You have confirmed drop-off for this passenger.');
      await loadTrip();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to confirm arrival');
    }
  };

  const handleEndRideEarly = async (bookingId: string) => {
    Alert.alert(
      'End Ride Early',
      'Are you sure you want to end your ride here?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Ride',
          style: 'destructive',
          onPress: async () => {
            setProcessingBookingId(bookingId);
            try {
              await updateBookingStatus(bookingId, 'dropped_off_early');
              if (chatRoomId && profile?.id) {
                await sendMessage(chatRoomId, profile.id, `${profile.full_name} has ended their ride early.`, true);
              }
              setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'dropped_off_early' as any } : b));
              Alert.alert('Ride Ended', 'You have successfully ended your ride.');
              await loadTrip();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to end ride early');
            } finally {
              setProcessingBookingId(null);
            }
          }
        }
      ]
    );
  };

  const handleUpdateTripStatus = async (newStatus: 'ongoing' | 'completed') => {
    if (newStatus === 'ongoing') {
      if (profile?.id) {
        const hasActive = await hasActiveTrip(profile.id);
        if (hasActive) {
          Alert.alert('Active Ride Exists', 'You already have an active ride. Please complete or cancel it before starting a new one.');
          return;
        }
      }

      Alert.alert(
        'Start Trip 🚗',
        'Are you sure you want to start this trip and set off now?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Set Off',
            onPress: async () => {
              try {
                await updateTripStatus(id as string, 'ongoing');
                setTrip(prev => prev ? { ...prev, status: 'ongoing' } : null);
                Alert.alert('Success', 'Trip started! Drive safely.');
              } catch (e: any) {
                Alert.alert('Error', e.message || 'Failed to update trip status');
              }
            }
          }
        ]
      );
      return;
    }

    if (newStatus === 'completed') {
      Alert.alert(
        'Complete Trip 🏁',
        'Are you sure you want to complete this trip? This will confirm drop-offs for all passengers.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete',
            onPress: async () => {
              try {
                // Bulk driver confirm unconfirmed accepted bookings
                const unconfirmed = bookings.filter(b => b.status === 'accepted' && !b.driver_confirmed);
                for (const b of unconfirmed) {
                  await confirmDriverArrival(b.id);
                }

                await updateTripStatus(id as string, 'completed');
                setTrip(prev => prev ? { ...prev, status: 'completed' } : null);
                router.push(`/(main)/ride/trip-summary?tripId=${id}` as any);
                await loadTrip();
              } catch (e: any) {
                Alert.alert('Error', e.message || 'Failed to update trip status');
              }
            }
          }
        ]
      );
    }
  };

  const handleDeleteTrip = () => {
    if (!trip) return;
    Alert.alert(
      'Delete Ride 🗑️',
      'Are you sure you want to delete this open ride? This will remove the ride and cancel any bookings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { deleteTrip } = require('@/services/trips');
              const { error } = await deleteTrip(trip.id);
              if (error) throw error;

              Alert.alert('Success', 'Ride successfully deleted.');
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete ride.');
            }
          }
        }
      ]
    );
  };

  if (loading) return <LoadingSpinner size="lg" message="Loading trip..." />;
  if (!trip) return <LoadingSpinner size="lg" message="Trip not found" />;

  const showChatButton = (isDriver && chatRoomId) || (isConfirmedPassenger && chatRoomId);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* @ts-ignore */}
      {trip?.status === 'ongoing' && <StatusBar style="light" backgroundColor={theme.colors.success as any} />}

      {/* Map Header */}
      <View style={[styles.mapSection, isOngoingActiveUser && styles.mapSectionEnlarged]}>
        <Map
          style={styles.map}
          logo={false}
          attribution={false}
          compass={false}
          mapStyle={
            mode === 'dark'
              ? 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json'
              : 'https://basemaps.cartocdn.com/gl/voyager-nolabels-gl-style/style.json'
          }
        >
          <Camera
            ref={cameraRef}
            bounds={[
              Math.min(trip.origin_lng, trip.destination_lng),
              Math.min(trip.origin_lat, trip.destination_lat),
              Math.max(trip.origin_lng, trip.destination_lng),
              Math.max(trip.origin_lat, trip.destination_lat),
            ]}
            padding={{
              top: 100,
              bottom: 380, // Accounts for the bottom sheet
              left: 50,
              right: 50,
            }}
            duration={1000}
            easing="fly"
          />

          <Marker id="origin" lngLat={[trip.origin_lng, trip.origin_lat]}>
            <AnimatedMarker variant="origin" label="Pickup" color={theme.colors.primary} />
          </Marker>
          <Marker id="destination" lngLat={[trip.destination_lng, trip.destination_lat]}>
            <AnimatedMarker variant="destination" label="Drop-off" color={theme.colors.accent} />
          </Marker>

          {driverLiveLocation && (
            <Marker id="driverLive" lngLat={[driverLiveLocation.longitude, driverLiveLocation.latitude]}>
              <AnimatedMarker variant="driver" isStale={isDriverStale} primaryColor={theme.colors.primary} />
            </Marker>
          )}

          {routeCoords.length > 0 && (
            <RouteLayer
              id="tripRoute"
              routeGeoJSON={{
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: routeCoords.map(c => [c.longitude, c.latitude]),
                },
                properties: {}
              }}
              color={theme.colors.primary}
              glowColor={theme.colors.routeGlow}
              casingColor={`${theme.colors.primaryDark}66`}
            />
          )}
        </Map>

        {/* Back button overlay */}
        {trip.status === 'ongoing' && (
          <LinearGradient
            colors={[`${theme.colors.success}DD`, `${theme.colors.success}00`]}
            style={[StyleSheet.absoluteFill, { height: insets.top + 80, zIndex: 5 }]}
            pointerEvents="none"
          />
        )}
        <Pressable
          style={[
            styles.backBtn,
            {
              backgroundColor: trip.status === 'ongoing' ? theme.colors.success : theme.colors.surface,
              top: insets.top + 8,
              zIndex: 10,
            }
          ]}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={trip.status === 'ongoing' ? theme.colors.white : theme.colors.text}
          />
        </Pressable>

        {/* Delete Ride button overlay */}
        {isDriver && trip.status === 'open' && (
          <Pressable
            style={[styles.deleteBtn, { backgroundColor: theme.colors.surface, top: insets.top + 8 }]}
            onPress={handleDeleteTrip}
          >
            <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
          </Pressable>
        )}

        {/* ETA Overlay */}
        {trip.status === 'ongoing' && etaInfo && (
          <ETAOverlay distanceKm={etaInfo.remainingKm} etaMinutes={etaInfo.etaMinutes} theme={theme} />
        )}

        {/* SOS Button */}
        {trip.status === 'ongoing' && (isDriver || isConfirmedPassenger) && (
          <SOSButton
            theme={theme}
            tripId={trip.id}
            driverName={trip.driver?.full_name || 'Driver'}
            currentLocation={driverLiveLocation}
            originLabel={trip.origin_label || ''}
            destinationLabel={trip.destination_label || ''}
          />
        )}
      </View>

      {/* Bottom Sheet Content */}
      <BottomSheet
        index={0}
        snapPoints={['45%', '85%']}
        backgroundStyle={{ backgroundColor: theme.colors.background }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.contentInner}>
          {/* Status + Time */}
          <View style={styles.statusRow}>
            <Badge label={trip.status} variant={trip.status === 'open' || trip.status === 'full' ? 'pending' : trip.status === 'ongoing' ? 'active' : 'completed'} />
            <Text style={[styles.timeText, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
              {formatDepartureTime(trip.departure_time)}
            </Text>
          </View>

          {/* Route */}
          <View style={[styles.routeCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
              <View style={styles.routeInfo}>
                <Text style={[styles.routeLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>Pickup</Text>
                <Text style={[styles.routeAddress, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]} numberOfLines={2}>{trip.origin_label}</Text>
              </View>
            </View>
            <View style={[styles.routeDivider, { borderLeftColor: theme.colors.border }]} />
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: theme.colors.accent, borderRadius: 3 }]} />
              <View style={styles.routeInfo}>
                <Text style={[styles.routeLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>Drop-off</Text>
                <Text style={[styles.routeAddress, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]} numberOfLines={2}>{trip.destination_label}</Text>
              </View>
            </View>
          </View>

          {/* Driver Info */}
          <View style={[styles.driverCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Pressable onPress={() => { setSelectedProfileId(trip.driver?.id || null); setProfileModalVisible(true); }}>
              <Avatar uri={trip.driver?.avatar_url} name={trip.driver?.full_name || ''} size="lg" showBadge={trip.driver?.verified_badge} />
            </Pressable>
            <View style={styles.driverInfo}>
              <Text style={[styles.driverName, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>{trip.driver?.full_name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color={theme.colors.accent} />
                <Text style={[styles.ratingText, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>
                  {trip.driver?.rating_avg?.toFixed(1) || 'New'}
                </Text>
                <Text style={[styles.ratingCount, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                  ({trip.driver?.total_ratings || 0} ratings)
                </Text>
              </View>
              {trip.vehicle && (
                <Text style={[styles.vehicleText, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                  {trip.vehicle.model} • {trip.vehicle.plate_number}
                </Text>
              )}
            </View>
          </View>

          {/* Trip Stats */}
          <View style={styles.statsRow}>
            <StatItem icon="people" label="Seats" value={`${trip.available_seats}`} theme={theme} />
            {isDriver ? (
              <StatItem
                icon="wallet"
                label="Net Earnings"
                value={formatCurrency(driverPayoutDetails.netPayout)}
                theme={theme}
                highlight
              />
            ) : (
              <StatItem icon="cash" label="Per seat" value={trip.fare_per_seat === 0 ? 'FREE' : formatCurrency(trip.fare_per_seat)} theme={theme} highlight />
            )}
          </View>

          {/* Bookings Section (Driver Only) */}
          {isDriver && (
            <DriverBookingsList
              bookings={bookings}
              trip={trip}
              theme={theme}
              processingBookingId={processingBookingId}
              acceptedBookings={acceptedBookings}
              driverPayoutDetails={driverPayoutDetails}
              handleAcceptBooking={handleAcceptBooking}
              handleRejectBooking={handleRejectBooking}
              handleRemovePassenger={handleRemovePassenger}
              handleDriverArrival={handleDriverArrival}
              onAvatarPress={(userId) => { setSelectedProfileId(userId); setProfileModalVisible(true); }}
            />
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Bottom CTA */}
      <TripBottomActions
        trip={trip}
        theme={theme}
        insets={insets}
        isDriver={isDriver}
        userBooking={userBooking}
        showChatButton={!!showChatButton}
        chatRoomId={chatRoomId}
        processingBookingId={processingBookingId}
        handleLeaveTrip={handleLeaveTrip}
        handleCommuterArrival={handleCommuterArrival}
        handleUpdateTripStatus={handleUpdateTripStatus}
        handleEndRideEarly={handleEndRideEarly}
        router={router}
        id={id as string}
      />

      {/* Modals */}
      <ProfileCardModal
        userId={selectedProfileId}
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />
    </View>
  );
}

function StatItem({ icon, label, value, theme, highlight }: any) {
  return (
    <View style={[styles.statItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Ionicons name={icon} size={22} color={highlight ? theme.colors.primary : theme.colors.textMuted} />
      <Text style={[styles.statValue, { color: highlight ? theme.colors.primary : theme.colors.text, fontFamily: 'Inter-Bold' }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapSection: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  mapSectionEnlarged: {},
  map: { flex: 1, width: '100%', height: '100%' },
  backBtn: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  deleteBtn: { position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  content: { flex: 1 },
  contentInner: { padding: 20, gap: 16, paddingBottom: 120 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeText: { fontSize: 14 },
  routeCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  routeInfo: { flex: 1 },
  routeLabel: { fontSize: 12, marginBottom: 2 },
  routeAddress: { fontSize: 14, lineHeight: 20 },
  routeDivider: { borderLeftWidth: 2, borderStyle: 'dashed', height: 20, marginLeft: 5, marginVertical: 4 },
  driverCard: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, padding: 16, gap: 16, alignItems: 'center' },
  driverInfo: { flex: 1, gap: 4 },
  driverName: { fontSize: 17 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 14 },
  ratingCount: { fontSize: 13 },
  vehicleText: { fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statItem: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 16, alignItems: 'center', gap: 6 },
  statValue: { fontSize: 20 },
  statLabel: { fontSize: 12 },
  bottomCTA: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, gap: 16 },
  ctaInfo: { flex: 1 },
  ctaPrice: { fontSize: 24 },
  ctaPerSeat: { fontSize: 13, marginTop: 2 },
  ctaButton: { paddingHorizontal: 32, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  ctaButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-SemiBold' },
  bookingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
