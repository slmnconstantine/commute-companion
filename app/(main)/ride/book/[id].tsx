import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { getTripById } from '@/services/trips';
import { createBooking } from '@/services/bookings';
import { supabase } from '@/lib/supabase';
import { formatCurrency, calculateFare } from '@/utils/fareCalculator';
import { formatDepartureTime } from '@/utils/dateFormatter';
import { TripWithDriver } from '@/types/database';
import LoadingSpinner from '@/components/common/LoadingSpinner';

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

  useEffect(() => {
    if (id) {
      getTripById(id).then((data) => { setTrip(data); setLoading(false); });
    }
  }, [id]);

  const handleBook = async () => {
    if (!trip || !profile) return;
    setBooking(true);
    try {
      const fareEst = trip.fare_per_seat * seats;
      const platformFee = Math.ceil(fareEst * 0.10);
      const { error } = await createBooking({
        trip_id: trip.id,
        commuter_id: profile.id,
        pickup_lat: trip.origin_lat,
        pickup_lng: trip.origin_lng,
        dropoff_lat: trip.destination_lat,
        dropoff_lng: trip.destination_lng,
        status: 'pending',
        fare_paid: fareEst,
        platform_fee: platformFee,
      });
      if (error) throw error;

      // Deactivate any matching active ride request for this passenger
      try {
        const oLat = trip.origin_lat.toFixed(2);
        const oLng = trip.origin_lng.toFixed(2);
        const dLat = trip.destination_lat.toFixed(2);
        const dLng = trip.destination_lng.toFixed(2);
        const routeHash = `${oLat},${oLng}_${dLat},${dLng}`;

        await supabase
          .from('routes')
          .update({ is_active: false })
          .eq('user_id', profile.id)
          .eq('route_hash', routeHash)
          .eq('is_active', true);
      } catch (deactivateErr) {
        console.warn('Failed to deactivate matching active request:', deactivateErr);
      }

      Alert.alert('Booking Sent!', 'Your booking request has been sent to the driver.', [
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
  const platformFee = Math.ceil(totalFare * 0.10);

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

        {/* Seat Selection */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>How many seats?</Text>
          <View style={styles.seatRow}>
            {Array.from({ length: Math.min(trip.available_seats, 4) }, (_, i) => i + 1).map((n) => (
              <Pressable
                key={n}
                style={[styles.seatBtn, {
                  backgroundColor: n <= seats ? theme.colors.primary : theme.colors.background,
                  borderColor: n <= seats ? theme.colors.primary : theme.colors.border,
                }]}
                onPress={() => setSeats(n)}
              >
                <Ionicons name="person" size={24} color={n <= seats ? '#fff' : theme.colors.textMuted} />
              </Pressable>
            ))}
          </View>
          <Text style={[styles.seatsLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            {seats} of {trip.available_seats} available seats
          </Text>
        </View>

        {/* Fare Summary */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Fare Summary</Text>
          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: theme.colors.textMuted }]}>Fare per seat</Text>
            <Text style={[styles.fareValue, { color: trip.fare_per_seat === 0 ? theme.colors.success : theme.colors.text, fontFamily: trip.fare_per_seat === 0 ? 'Inter-SemiBold' : 'Inter-Regular' }]}>
              {trip.fare_per_seat === 0 ? 'FREE' : formatCurrency(trip.fare_per_seat)}
            </Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: theme.colors.textMuted }]}>Seats</Text>
            <Text style={[styles.fareValue, { color: theme.colors.text }]}>x{seats}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: theme.colors.textMuted }]}>Platform fee</Text>
            <Text style={[styles.fareValue, { color: theme.colors.text }]}>
              {trip.fare_per_seat === 0 ? 'FREE' : formatCurrency(platformFee)}
            </Text>
          </View>
          <View style={[styles.fareDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.fareRow}>
            <Text style={[styles.fareTotalLabel, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>Total</Text>
            <Text style={[styles.fareTotalValue, { color: trip.fare_per_seat === 0 ? theme.colors.success : theme.colors.primary, fontFamily: 'Inter-Bold' }]}>
              {trip.fare_per_seat === 0 ? 'FREE' : formatCurrency(totalFare + platformFee)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Book Button */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border }]}>
        <Pressable
          style={[styles.bookBtn, { backgroundColor: theme.colors.primary, opacity: booking ? 0.7 : 1 }]}
          onPress={handleBook}
          disabled={booking}
        >
          <Text style={styles.bookBtnText}>{booking ? 'Sending Request...' : 'Confirm Booking'}</Text>
        </Pressable>
      </View>
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
  seatRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  seatBtn: { width: 60, height: 60, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  seatsLabel: { textAlign: 'center', fontSize: 13 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between' },
  fareLabel: { fontSize: 14, fontFamily: 'Inter-Regular' },
  fareValue: { fontSize: 14, fontFamily: 'Inter-Medium' },
  fareDivider: { height: 1 },
  fareTotalLabel: { fontSize: 16 },
  fareTotalValue: { fontSize: 20 },
  bottomBar: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  bookBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  bookBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-SemiBold' },
});
