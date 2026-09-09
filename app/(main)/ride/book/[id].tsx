import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { getTripById } from '@/services/trips';
import { createBooking } from '@/services/bookings';
import { sendPushNotification } from '@/services/pushNotifications';
import { supabase } from '@/lib/supabase';
import { formatCurrency, calculateFare } from '@/utils/fareCalculator';
import { PLATFORM_FEE_RATE } from '@/lib/constants';
import { formatDepartureTime } from '@/utils/dateFormatter';
import { TripWithDriver } from '@/types/database';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Avatar from '@/components/common/Avatar';
import { getDriverLiveCapture, saveCommuterLiveCapture, LiveFaceRecord } from '@/services/liveFaceVerification';
import LiveFaceCaptureModal from '@/components/verification/LiveFaceCaptureModal';
import LiveFacePreviewModal from '@/components/verification/LiveFacePreviewModal';

function isJsonLabel(label: string | null) {
  if (!label) return false;
  try {
    const parsed = JSON.parse(label);
    return !!(parsed && typeof parsed === 'object');
  } catch (e) {
    return false;
  }
}

export default function BookRideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { profile } = useAuth();

  const [trip, setTrip] = useState<TripWithDriver | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [seats, setSeats] = useState(1);

  // Live face capture states
  const [driverCapture, setDriverCapture] = useState<LiveFaceRecord | null>(null);
  const [showDriverPreview, setShowDriverPreview] = useState(false);
  const [commuterLivePhoto, setCommuterLivePhoto] = useState<string | null>(null);
  const [showCommuterCaptureModal, setShowCommuterCaptureModal] = useState(false);
  const [commuterConfidence, setCommuterConfidence] = useState<number>(97);

  useEffect(() => {
    if (id) {
      getTripById(id).then((data) => {
        setTrip(data);
        setLoading(false);
        if (data) {
          getDriverLiveCapture(data.id, data.driver_id).then(setDriverCapture);
        }
      });
    }
  }, [id]);

  const handleBook = async (overridePhoto?: string, overrideConfidence?: number) => {
    if (!trip || !profile) return;

    if (trip.driver_id === profile.id) {
      Alert.alert('Invalid Booking', 'You cannot book a seat on your own ride.');
      return;
    }

    const photoToUse = overridePhoto || commuterLivePhoto;
    const confidenceToUse = overrideConfidence || commuterConfidence;

    if (!photoToUse) {
      setShowCommuterCaptureModal(true);
      return;
    }

    setBooking(true);
    try {
      // 1. Verify trip is still open with available seats
      const freshTrip = await getTripById(trip.id);
      if (!freshTrip || freshTrip.status !== 'open' || freshTrip.available_seats < seats) {
        Alert.alert('Unavailable', 'This ride is no longer available or does not have enough seats.');
        return;
      }

      // 2. Check for existing booking by this commuter on this trip
      const { data: existingBooking } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('trip_id', trip.id)
        .eq('commuter_id', profile.id)
        .maybeSingle();

      if (existingBooking && (existingBooking.status === 'pending' || existingBooking.status === 'accepted')) {
        Alert.alert('Already Booked', 'You already have an active booking request for this ride.');
        return;
      }

      const fareEst = trip.fare_per_seat * seats;
      const totalBookingPrice = fareEst;
      const driverPlatformFee = Math.round(fareEst * PLATFORM_FEE_RATE * 100) / 100;
      let createdBookingId = existingBooking?.id || '';

      // If user previously had a rejected or cancelled booking, update it back to pending
      if (existingBooking && (existingBooking.status === 'rejected' || existingBooking.status === 'cancelled')) {
        const { error: updateErr } = await supabase
          .from('bookings')
          .update({
            status: 'pending',
            seats_booked: seats,
            fare_paid: totalBookingPrice,
            platform_fee: driverPlatformFee,
            pickup_lat: trip.origin_lat,
            pickup_lng: trip.origin_lng,
            dropoff_lat: trip.destination_lat,
            dropoff_lng: trip.destination_lng,
            driver_confirmed: false,
            commuter_confirmed: false,
          })
          .eq('id', existingBooking.id);

        if (updateErr) throw updateErr;
        createdBookingId = existingBooking.id;

        // Notify the driver of renewed request
        const { data: tripData } = await supabase
          .from('trips')
          .select('driver:profiles!driver_id(id, push_token)')
          .eq('id', trip.id)
          .single();
        const pushToken = (tripData?.driver as any)?.push_token;
        if (pushToken) {
          await sendPushNotification(
            pushToken,
            'Ride Request Updated',
            `${profile.full_name || 'A commuter'} has requested to join your ride!`,
            { type: 'booking', bookingId: existingBooking.id, tripId: trip.id },
            (tripData?.driver as any)?.id
          );
        }
      } else {
        const { data: newBooking, error } = await createBooking({
          trip_id: trip.id,
          commuter_id: profile.id,
          pickup_lat: trip.origin_lat,
          pickup_lng: trip.origin_lng,
          dropoff_lat: trip.destination_lat,
          dropoff_lng: trip.destination_lng,
          status: 'pending',
          fare_paid: totalBookingPrice,
          platform_fee: driverPlatformFee,
          seats_booked: seats,
          driver_confirmed: false,
          commuter_confirmed: false,
        });
        if (error) throw error;
        createdBookingId = newBooking?.id || '';
      }

      // Broadcast and persist commuter live face capture for the driver
      if (photoToUse) {
        await saveCommuterLiveCapture(trip.id, profile.id, createdBookingId, photoToUse, confidenceToUse);
      }

      // Deactivate any matching active ride request for this passenger
      try {
        const oLat = trip.origin_lat.toFixed(2);
        const oLng = trip.origin_lng.toFixed(2);
        const dLat = trip.destination_lat.toFixed(2);
        const dLng = trip.destination_lng.toFixed(2);
        const routeHash = `${oLat},${oLng}_${dLat},${dLng}`;

        const { data: routesData } = await supabase
          .from('routes')
          .select('id, label')
          .eq('user_id', profile.id)
          .eq('route_hash', routeHash)
          .eq('is_active', true);

        if (routesData) {
          const requestRoute = routesData.find(r => isJsonLabel(r.label));
          if (requestRoute) {
            await supabase
              .from('routes')
              .update({ is_active: false })
              .eq('id', requestRoute.id);
          }
        }
      } catch (deactivateErr) {
        console.warn('Failed to deactivate matching active request:', deactivateErr);
      }

      Alert.alert('Booking Sent!', 'Your booking request and live face verification have been sent to the driver.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to book ride.');
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" message="Loading..." />;
  if (!trip) return <LoadingSpinner size="lg" message="Trip not found" />;

  const totalFare = trip.fare_per_seat * seats;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Book a Seat</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Driver Summary Card with Live Verification */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar uri={trip.driver?.avatar_url} name={trip.driver?.full_name || 'Driver'} size="md" showBadge={trip.driver?.verified_badge} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontFamily: 'Inter-SemiBold', fontSize: 16 }}>
                {trip.driver?.full_name}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontFamily: 'Inter-Regular' }}>
                {trip.vehicle?.model ? `${trip.vehicle.model} • ` : ''}⭐ {trip.driver?.rating_avg?.toFixed(1) || 'New'}
              </Text>
            </View>

            {driverCapture ? (
              <Pressable
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  backgroundColor: `${theme.colors.success}15`,
                  borderWidth: 1,
                  borderColor: theme.colors.success,
                }}
                onPress={() => setShowDriverPreview(true)}
              >
                {driverCapture.photoUri ? (
                  <Image source={{ uri: driverCapture.photoUri }} style={{ width: 22, height: 22, borderRadius: 11 }} />
                ) : (
                  <Ionicons name="shield-checkmark" size={14} color={theme.colors.success} />
                )}
                <Text style={{ color: theme.colors.success, fontSize: 11, fontFamily: 'Inter-SemiBold' }}>
                  Live Verified
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Route Summary */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Route</Text>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
            <Text style={[styles.routeText, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]} numberOfLines={1}>{trip.origin_label}</Text>
          </View>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: theme.colors.accent, borderRadius: 3 }]} />
            <Text style={[styles.routeText, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]} numberOfLines={1}>{trip.destination_label}</Text>
          </View>
          <Text style={[styles.departureText, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            <Ionicons name="time-outline" size={14} /> {formatDepartureTime(trip.departure_time)}
          </Text>
        </View>

        {/* Passenger Live Face Verification Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="camera-reverse" size={18} color={theme.colors.primary} />
              <Text style={[styles.cardTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', marginBottom: 0 }]}>
                Passenger Live Face Scan
              </Text>
            </View>
            {commuterLivePhoto ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                <Text style={{ color: theme.colors.success, fontSize: 12, fontFamily: 'Inter-Medium' }}>Ready</Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: `${theme.colors.error}20` }}>
                <Text style={{ color: theme.colors.error, fontSize: 11, fontFamily: 'Inter-SemiBold' }}>Required</Text>
              </View>
            )}
          </View>

          {commuterLivePhoto ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Image
                source={{ uri: commuterLivePhoto }}
                style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: theme.colors.success }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontFamily: 'Inter-SemiBold', fontSize: 13 }}>
                  Live Photo Captured ({commuterConfidence}%)
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontFamily: 'Inter-Regular', marginTop: 2 }}>
                  Your driver will see this at the pickup location to recognize you.
                </Text>
              </View>
              <Pressable
                style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border }}
                onPress={() => setShowCommuterCaptureModal(true)}
              >
                <Text style={{ color: theme.colors.text, fontSize: 12, fontFamily: 'Inter-Medium' }}>Retake</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontFamily: 'Inter-Regular', marginBottom: 10 }}>
                Take a quick live photo so your driver can easily recognize you at the pickup location.
              </Text>
              <Pressable
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 11,
                  backgroundColor: `${theme.colors.primary}15`,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                }}
                onPress={() => setShowCommuterCaptureModal(true)}
              >
                <Ionicons name="camera" size={18} color={theme.colors.primary} />
                <Text style={{ color: theme.colors.primary, fontFamily: 'Inter-SemiBold', fontSize: 14 }}>
                  Take Passenger Live Photo
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Seat Selection */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>How many seats?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seatScroll}>
            {Array.from({ length: Math.max(1, trip.available_seats) }, (_, i) => i + 1).map((n) => {
              const isSelected = n <= seats;
              return (
                <Pressable
                  key={n}
                  style={[styles.seatBtn, {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.background,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  }]}
                  onPress={() => setSeats(n)}
                >
                  <Ionicons name="person" size={20} color={isSelected ? '#fff' : theme.colors.textMuted} />
                  <Text style={[styles.seatNumText, { color: isSelected ? '#fff' : theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
                    {n}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={[styles.seatsLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            {seats} of {trip.available_seats} available seat{trip.available_seats !== 1 ? 's' : ''} selected
          </Text>
        </View>

        {/* Fare Summary */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Price Breakdown</Text>
          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: theme.colors.textMuted }]}>Base per seat</Text>
            <Text style={[styles.fareValue, { color: trip.fare_per_seat === 0 ? theme.colors.success : theme.colors.text, fontFamily: trip.fare_per_seat === 0 ? 'Inter-SemiBold' : 'Inter-Regular' }]}>
              {trip.fare_per_seat === 0 ? 'FREE' : formatCurrency(trip.fare_per_seat)}
            </Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: theme.colors.textMuted }]}>Seats</Text>
            <Text style={[styles.fareValue, { color: theme.colors.text }]}>x{seats}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: theme.colors.textMuted }]}>
              Passenger platform fee
            </Text>
            <Text style={[styles.fareValue, { color: theme.colors.success, fontFamily: 'Inter-SemiBold' }]}>
              FREE
            </Text>
          </View>
          <View style={[styles.fareDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.fareRow}>
            <Text style={[styles.fareTotalLabel, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>Total</Text>
            <Text style={[styles.fareTotalValue, { color: trip.fare_per_seat === 0 ? theme.colors.success : theme.colors.primary, fontFamily: 'Inter-Bold' }]}>
              {trip.fare_per_seat === 0 ? 'FREE' : formatCurrency(totalFare)}
            </Text>
          </View>
          {seats > 1 && trip.fare_per_seat > 0 && (
            <Text style={[styles.breakdownText, { color: theme.colors.textMuted }]}>
              ({formatCurrency(trip.fare_per_seat)} × {seats} passengers)
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Book Button */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border }]}>
        <Pressable
          style={[styles.bookBtn, { backgroundColor: theme.colors.primary, opacity: booking ? 0.7 : 1 }]}
          onPress={() => handleBook()}
          disabled={booking}
        >
          {booking ? (
            <View style={styles.loadingBtnContent}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.bookBtnText}>Sending Request...</Text>
            </View>
          ) : (
            <Text style={styles.bookBtnText}>Confirm Booking</Text>
          )}
        </Pressable>
      </View>

      {/* ═══ Commuter Live Face Capture Modal ═══ */}
      <LiveFaceCaptureModal
        visible={showCommuterCaptureModal}
        onClose={() => setShowCommuterCaptureModal(false)}
        onCaptureSuccess={(photoUri, base64, confidence) => {
          setCommuterLivePhoto(base64);
          setCommuterConfidence(confidence);
          handleBook(base64, confidence);
        }}
        role="commuter"
        userName={profile?.full_name || 'Passenger'}
      />

      {/* ═══ Driver Live Face Preview Modal ═══ */}
      <LiveFacePreviewModal
        visible={showDriverPreview}
        onClose={() => setShowDriverPreview(false)}
        photoUri={driverCapture?.photoUri || trip.driver?.avatar_url}
        userName={trip.driver?.full_name || 'Driver'}
        role="driver"
        timestamp={driverCapture?.timestamp}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17 },
  content: { padding: 20, gap: 16, paddingBottom: 120 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  cardTitle: { fontSize: 16, marginBottom: 4 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  routeText: { flex: 1, fontSize: 14, fontFamily: 'Inter-Regular' },
  departureText: { fontSize: 13, marginTop: 4 },
  seatScroll: { flexDirection: 'row', gap: 12, paddingVertical: 4 },
  seatBtn: { width: 56, height: 60, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 2 },
  seatNumText: { fontSize: 12 },
  seatsLabel: { textAlign: 'center', fontSize: 13 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between' },
  fareLabel: { fontSize: 14, fontFamily: 'Inter-Regular' },
  fareValue: { fontSize: 14, fontFamily: 'Inter-Medium' },
  fareDivider: { height: 1 },
  fareTotalLabel: { fontSize: 16 },
  fareTotalValue: { fontSize: 20 },
  breakdownText: { fontSize: 13, marginTop: 4, fontFamily: 'Inter-Regular', textAlign: 'right' },
  bottomBar: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  bookBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  loadingBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-SemiBold' },
});
