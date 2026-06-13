import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map, Camera, RasterSource, Layer, GeoJSONSource, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { getTripById, updateTripStatus } from '@/services/trips';
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

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { profile } = useAuth();

  const [trip, setTrip] = useState<TripWithDriver | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [driverLiveLocation, setDriverLiveLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const [bookings, setBookings] = useState<BookingWithCommuter[]>([]);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);
  const [hasPromptedArrival, setHasPromptedArrival] = useState(false);

  const cameraRef = useRef<CameraRef>(null);

  const userBooking = bookings.find(b => b.commuter_id === profile?.id);
  const isConfirmedPassenger = userBooking?.status === 'accepted';
  const isDriver = profile?.id === trip?.driver_id;
  const isOngoingDriver = !!(isDriver && trip && trip.status === 'ongoing');
  const isOngoingActiveUser = !!(trip && trip.status === 'ongoing' && (isDriver || isConfirmedPassenger));

  const acceptedBookings = bookings.filter(b => b.status === 'accepted');
  const totalCollectedFare = acceptedBookings.reduce((sum, b) => sum + (b.fare_paid || 0), 0);
  const driverPayoutDetails = getDriverPayout(totalCollectedFare);

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
            setDriverLiveLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
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
          setDriverLiveLocation({ latitude: loc.latitude, longitude: loc.longitude });
        });
      }
    };

    setupTracking();

    return () => {
      if (locationSubscription) locationSubscription.remove();
      if (trip.status !== 'ongoing') stopBroadcastingLocation();
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
                const seatsBooked = trip.fare_per_seat > 0 ? Math.round(booking.fare_paid / trip.fare_per_seat) : 1;
                const newAvailableSeats = Math.max(0, trip.available_seats - seatsBooked);

                await supabase
                  .from('trips')
                  .update({ available_seats: newAvailableSeats })
                  .eq('id', trip.id);

                setTrip(prev => prev ? { ...prev, available_seats: newAvailableSeats } : null);
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
                const seatsBooked = trip.fare_per_seat > 0 ? Math.round(booking.fare_paid / trip.fare_per_seat) : 1;
                const newAvailableSeats = trip.available_seats + seatsBooked;

                await supabase
                  .from('trips')
                  .update({ available_seats: newAvailableSeats })
                  .eq('id', trip.id);

                setTrip(prev => prev ? { ...prev, available_seats: newAvailableSeats } : null);
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
    Alert.alert(
      'Leave Trip',
      'Are you sure you want to remove yourself from this trip?',
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
                const seatsBooked = trip.fare_per_seat > 0 ? Math.round(booking.fare_paid / trip.fare_per_seat) : 1;
                const newAvailableSeats = trip.available_seats + seatsBooked;

                await supabase
                  .from('trips')
                  .update({ available_seats: newAvailableSeats })
                  .eq('id', trip.id);

                setTrip(prev => prev ? { ...prev, available_seats: newAvailableSeats } : null);
              }

              if (chatRoomId && profile?.id) {
                await sendMessage(chatRoomId, profile.id, `${profile.full_name} has left the trip.`, true);
              }
              setBookings(prev => prev.filter(b => b.id !== bookingId));
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

  const handleUpdateTripStatus = async (newStatus: 'ongoing' | 'completed') => {
    if (newStatus === 'ongoing') {
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
                Alert.alert('Trip Completed!', 'The trip has been completed successfully.');
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
      {/* Map Header */}
      <View style={[styles.mapSection, isOngoingActiveUser && styles.mapSectionEnlarged]}>
        <Map
          style={styles.map}
          logo={false}
          attribution={false}
          compass={false}
          mapStyle={{ version: 8, sources: {}, layers: [] }}
        >
          <Camera
            ref={cameraRef}
            initialViewState={{
              center: [(trip.origin_lng + trip.destination_lng) / 2, (trip.origin_lat + trip.destination_lat) / 2],
              zoom: 10,
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

          <Marker id="origin" lngLat={[trip.origin_lng, trip.origin_lat]}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#0D9488', borderWidth: 2, borderColor: '#fff' }} />
          </Marker>

          <Marker id="destination" lngLat={[trip.destination_lng, trip.destination_lat]}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#F59E0B', borderWidth: 2, borderColor: '#fff' }} />
          </Marker>

          {driverLiveLocation && (
            <Marker id="driverLive" lngLat={[driverLiveLocation.longitude, driverLiveLocation.latitude]}>
              <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.primary, borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 }} />
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

        {/* Back button overlay */}
        <Pressable
          style={[styles.backBtn, { backgroundColor: theme.colors.surface, top: insets.top + 8 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
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
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
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
          <Avatar uri={trip.driver?.avatar_url} name={trip.driver?.full_name || ''} size="lg" showBadge={trip.driver?.verified_badge} />
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
        {isDriver && bookings.length > 0 && (
          <View style={[styles.driverCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>
            <Text style={[{ color: theme.colors.text, fontFamily: 'Inter-SemiBold', fontSize: 16, marginBottom: 8 }]}>Booking Requests</Text>
            {bookings.map(booking => (
              <View key={booking.id} style={[styles.bookingItem, { borderBottomColor: theme.colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Avatar uri={booking.commuter?.avatar_url} name={booking.commuter?.full_name || ''} size="sm" />
                  <View style={{ marginLeft: 10, flex: 1, alignItems: 'flex-start' }}>
                    <Text style={{ color: theme.colors.text, fontFamily: 'Inter-Medium', marginBottom: 4 }} numberOfLines={1}>{booking.commuter?.full_name}</Text>
                    <Badge label={booking.status} variant={booking.status === 'accepted' ? 'accepted' : booking.status === 'pending' ? 'pending' : 'cancelled'} />
                  </View>
                </View>

                {booking.status === 'pending' && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: theme.colors.error + '20' }]}
                      onPress={() => handleRejectBooking(booking)}
                      disabled={processingBookingId === booking.id}
                    >
                      <Ionicons name="close" size={20} color={theme.colors.error} />
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: theme.colors.success + '20' }]}
                      onPress={() => handleAcceptBooking(booking)}
                      disabled={processingBookingId === booking.id}
                    >
                      <Ionicons name="checkmark" size={20} color={theme.colors.success} />
                    </Pressable>
                  </View>
                )}

                {booking.status === 'accepted' && (trip.status === 'open' || trip.status === 'full') && (
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: theme.colors.error + '20' }]}
                    onPress={() => handleRemovePassenger(booking)}
                    disabled={processingBookingId === booking.id}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                  </Pressable>
                )}

                {booking.status === 'accepted' && trip.status === 'ongoing' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {!booking.driver_confirmed ? (
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: theme.colors.success + '20', width: 'auto', paddingHorizontal: 12 }]}
                        onPress={() => handleDriverArrival(booking.id)}
                        disabled={processingBookingId === booking.id}
                      >
                        <Text style={{ color: theme.colors.success, fontSize: 12, fontFamily: 'Inter-SemiBold' }}>Confirm Arrival</Text>
                      </Pressable>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                        <Text style={{ color: theme.colors.success, fontSize: 12, fontFamily: 'Inter-Medium' }}>Arrived</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}

            {acceptedBookings.length > 0 && (
              <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.colors.textMuted, fontFamily: 'Inter-Regular', fontSize: 14 }}>To Collect</Text>
                  <Text style={{ color: theme.colors.text, fontFamily: 'Inter-Medium', fontSize: 14 }}>{formatCurrency(totalCollectedFare)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.colors.textMuted, fontFamily: 'Inter-Regular', fontSize: 14 }}>Platform fee (10%)</Text>
                  <Text style={{ color: theme.colors.error, fontFamily: 'Inter-Medium', fontSize: 14 }}>-{formatCurrency(driverPayoutDetails.platformFee)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ color: theme.colors.text, fontFamily: 'Inter-SemiBold', fontSize: 15 }}>Net Earnings</Text>
                  <Text style={{ color: theme.colors.success, fontFamily: 'Inter-Bold', fontSize: 15 }}>{formatCurrency(driverPayoutDetails.netPayout)}</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      {!isDriver && trip.status === 'open' && !userBooking && (
        <View style={[styles.bottomCTA, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border }]}>
          <View style={styles.ctaInfo}>
            <Text style={[styles.ctaPrice, { color: trip.fare_per_seat === 0 ? theme.colors.success : theme.colors.primary, fontFamily: 'Inter-Bold' }]}>
              {trip.fare_per_seat === 0 ? 'FREE' : formatCurrency(trip.fare_per_seat)}
            </Text>
            {trip.fare_per_seat > 0 && (
              <Text style={[styles.ctaPerSeat, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>per seat</Text>
            )}
          </View>
          <Pressable
            style={[styles.ctaButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push(`/(main)/ride/book/${id}`)}
          >
            <Text style={styles.ctaButtonText}>Book Seat</Text>
          </Pressable>
        </View>
      )}

      {/* Already Booked / Pending State */}
      {!isDriver && userBooking && userBooking.status === 'pending' && (
        <View style={[styles.bottomCTA, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border, justifyContent: 'center' }]}>
          <Text style={[{ color: theme.colors.textMuted, fontFamily: 'Inter-Medium', fontSize: 16 }]}>Booking Request Pending...</Text>
        </View>
      )}

      {/* Open Trip Chat CTA (Commuter) */}
      {!isDriver && showChatButton && trip.status !== 'ongoing' && (
        <View style={[styles.bottomCTA, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border, gap: 12 }]}>
          <Pressable
            style={[styles.ctaButton, { backgroundColor: theme.colors.primary, flex: 1, flexDirection: 'row', gap: 8 }]}
            onPress={() => router.push(`/(main)/chat/${chatRoomId}`)}
          >
            <Ionicons name="chatbubbles" size={20} color="#fff" />
            <Text style={styles.ctaButtonText}>Open Chat</Text>
          </Pressable>
          {userBooking && (trip.status === 'open' || trip.status === 'full') && (
            <Pressable
              style={[
                styles.ctaButton,
                {
                  backgroundColor: 'transparent',
                  borderColor: theme.colors.error + '40',
                  borderWidth: 1,
                  height: 44,
                  elevation: 0,
                  shadowOpacity: 0,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  gap: 6,
                }
              ]}
              onPress={() => handleLeaveTrip(userBooking.id)}
              disabled={processingBookingId === userBooking.id}
            >
              <Ionicons name="exit-outline" size={16} color={theme.colors.error} />
              <Text style={[styles.ctaButtonText, { color: theme.colors.error, fontSize: 13 }]}>Leave Trip</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Ongoing Trip Commuter Handshake CTA */}
      {!isDriver && userBooking && userBooking.status === 'accepted' && trip.status === 'ongoing' && (
        <View style={[styles.bottomCTA, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border, flexDirection: 'column', gap: 12, alignItems: 'stretch' }]}>
          {!userBooking.commuter_confirmed ? (
            <Pressable
              style={[styles.ctaButton, { backgroundColor: theme.colors.success, flexDirection: 'row', gap: 8 }]}
              onPress={() => handleCommuterArrival(userBooking.id)}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.ctaButtonText}>Confirm Arrival</Text>
            </Pressable>
          ) : (
            <View style={[styles.ctaButton, { backgroundColor: theme.colors.border, flexDirection: 'row', gap: 8, opacity: 0.8, elevation: 0, shadowOpacity: 0 }]}>
              <Ionicons name="time" size={20} color={theme.colors.textMuted} />
              <Text style={[styles.ctaButtonText, { color: theme.colors.textMuted }]}>Waiting for Driver Confirmation...</Text>
            </View>
          )}
          {chatRoomId && (
            <Pressable
              style={[styles.ctaButton, { backgroundColor: theme.colors.primary, flexDirection: 'row', gap: 8 }]}
              onPress={() => router.push(`/(main)/chat/${chatRoomId}`)}
            >
              <Ionicons name="chatbubbles" size={20} color="#fff" />
              <Text style={styles.ctaButtonText}>Open Trip Chat</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Driver Controls */}
      {isDriver && trip.status !== 'completed' && trip.status !== 'cancelled' && (
        <View style={[styles.bottomCTA, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border, flexDirection: 'column', gap: 12, alignItems: 'stretch' }]}>

          {(trip.status === 'open' || trip.status === 'full') && (
            <Pressable
              style={[styles.ctaButton, { backgroundColor: theme.colors.success, flexDirection: 'row', gap: 8 }]}
              onPress={() => handleUpdateTripStatus('ongoing')}
            >
              <Ionicons name="car" size={20} color="#fff" />
              <Text style={styles.ctaButtonText}>Set Off (Start Trip)</Text>
            </Pressable>
          )}

          {trip.status === 'ongoing' && (
            <Pressable
              style={[styles.ctaButton, { backgroundColor: theme.colors.primary, flexDirection: 'row', gap: 8 }]}
              onPress={() => handleUpdateTripStatus('completed')}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.ctaButtonText}>Complete Trip</Text>
            </Pressable>
          )}

          {showChatButton && (
            <Pressable
              style={[styles.ctaButton, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.primary, flexDirection: 'row', gap: 8 }]}
              onPress={() => router.push(`/(main)/chat/${chatRoomId}`)}
            >
              <Ionicons name="chatbubbles" size={20} color={theme.colors.primary} />
              <Text style={[styles.ctaButtonText, { color: theme.colors.primary }]}>Open Trip Chat</Text>
            </Pressable>
          )}
        </View>
      )}
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
  mapSection: { height: 260 },
  mapSectionEnlarged: { height: 480 },
  map: { flex: 1 },
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
