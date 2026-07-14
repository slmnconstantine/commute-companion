import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { getTripById } from '@/services/trips';
import { getTripBookings } from '@/services/bookings';
import { formatDepartureTime } from '@/utils/dateFormatter';
import { formatCurrency, getDriverPayout } from '@/utils/fareCalculator';
import Avatar from '@/components/common/Avatar';
import Badge from '@/components/common/Badge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { TripWithDriver, BookingWithCommuter } from '@/types/database';
import { PLATFORM_FEE_RATE } from '@/lib/constants';

export default function TripSummaryScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [trip, setTrip] = useState<TripWithDriver | null>(null);
  const [bookings, setBookings] = useState<BookingWithCommuter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    (async () => {
      try {
        const [tripData, bookingsData] = await Promise.all([
          getTripById(tripId),
          getTripBookings(tripId),
        ]);
        setTrip(tripData);
        setBookings(bookingsData);
      } catch (e) {
        Alert.alert('Error', 'Failed to load trip summary.');
      } finally {
        setLoading(false);
      }
    })();
  }, [tripId]);

  const handleShare = async () => {
    if (!trip) return;
    const acceptedBookings = bookings.filter(b => b.status === 'accepted' || b.status === 'completed');
    const totalPassengers = acceptedBookings.reduce((sum, b) => sum + (b.seats_booked || 1), 0);
    const totalFare = acceptedBookings.reduce((sum, b) => sum + (b.fare_paid || 0), 0);

    const text = [
      `🧾 Trip Receipt — Commute Companion`,
      ``,
      `📍 ${trip.origin_label?.split(',')[0]} → ${trip.destination_label?.split(',')[0]}`,
      `📅 ${formatDepartureTime(trip.departure_time)}`,
      `🚗 Driver: ${trip.driver?.full_name}`,
      `👥 Passengers: ${totalPassengers}`,
      `💰 Total Fare: ${formatCurrency(totalFare)}`,
      ``,
      `Status: ${trip.status?.toUpperCase()}`,
    ].join('\n');

    try {
      await Share.share({ message: text });
    } catch (e) {
      // User cancelled
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.colors.textMuted }}>Trip not found.</Text>
      </View>
    );
  }

  const acceptedBookings = bookings.filter(b => b.status === 'accepted' || b.status === 'completed' || b.status === 'dropped_off_early');
  const totalPassengers = acceptedBookings.reduce((sum, b) => sum + (b.seats_booked || 1), 0);
  const totalFare = acceptedBookings.reduce((sum, b) => sum + (b.fare_paid || 0), 0);
  const platformFee = Math.round(totalFare * PLATFORM_FEE_RATE * 100) / 100;
  const baseFare = totalFare - platformFee;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Trip Receipt</Text>
        <Pressable onPress={handleShare} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={22} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.statusSection}>
          <View style={[styles.statusIcon, { backgroundColor: trip.status === 'completed' ? theme.colors.success + '20' : theme.colors.error + '20' }]}>
            <Ionicons
              name={trip.status === 'completed' ? 'checkmark-circle' : 'close-circle'}
              size={48}
              color={trip.status === 'completed' ? theme.colors.success : theme.colors.error}
            />
          </View>
          <Text style={[styles.statusTitle, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
            {trip.status === 'completed' ? 'Trip Completed!' : 'Trip ' + (trip.status || '')}
          </Text>
          <Text style={[styles.statusDate, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            {formatDepartureTime(trip.departure_time)}
          </Text>
        </View>

        {/* Route Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
            <View style={styles.routeInfo}>
              <Text style={[styles.routeLabel, { color: theme.colors.textMuted }]}>Pickup</Text>
              <Text style={[styles.routeAddr, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]} numberOfLines={2}>{trip.origin_label}</Text>
            </View>
          </View>
          <View style={[styles.routeDivider, { borderLeftColor: theme.colors.border }]} />
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: theme.colors.accent, borderRadius: 3 }]} />
            <View style={styles.routeInfo}>
              <Text style={[styles.routeLabel, { color: theme.colors.textMuted }]}>Drop-off</Text>
              <Text style={[styles.routeAddr, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]} numberOfLines={2}>{trip.destination_label}</Text>
            </View>
          </View>
        </View>

        {/* Driver Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.driverRow}>
            <Avatar uri={trip.driver?.avatar_url} name={trip.driver?.full_name || ''} size="md" showBadge={trip.driver?.verified_badge} />
            <View style={styles.driverInfo}>
              <Text style={[styles.driverName, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>{trip.driver?.full_name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={theme.colors.accent} />
                <Text style={[{ color: theme.colors.text, fontFamily: 'Inter-Medium', fontSize: 13, marginLeft: 4 }]}>
                  {trip.driver?.rating_avg?.toFixed(1) || 'New'}
                </Text>
              </View>
              {trip.vehicle && (
                <Text style={[{ color: theme.colors.textMuted, fontSize: 12, fontFamily: 'Inter-Regular' }]}>
                  {trip.vehicle.model} • {trip.vehicle.plate_number}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Fare Breakdown */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Fare Breakdown</Text>

          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: theme.colors.textMuted }]}>Passengers</Text>
            <Text style={[styles.fareValue, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>{totalPassengers}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: theme.colors.textMuted }]}>Fare per seat</Text>
            <Text style={[styles.fareValue, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>{formatCurrency(trip.fare_per_seat)}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: theme.colors.textMuted }]}>Subtotal</Text>
            <Text style={[styles.fareValue, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>{formatCurrency(baseFare)}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: theme.colors.textMuted }]}>Platform Fee (10%)</Text>
            <Text style={[styles.fareValue, { color: theme.colors.error, fontFamily: 'Inter-Medium' }]}>+{formatCurrency(platformFee)}</Text>
          </View>
          <View style={[styles.fareDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: theme.colors.text, fontFamily: 'Inter-Bold', fontSize: 16 }]}>Total</Text>
            <Text style={[styles.fareValue, { color: theme.colors.primary, fontFamily: 'Inter-Bold', fontSize: 18 }]}>{formatCurrency(totalFare)}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Share Receipt</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
            <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>Go Back</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  shareBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18 },
  scrollContent: { padding: 20, gap: 16, paddingBottom: 40 },
  statusSection: { alignItems: 'center', gap: 8, marginBottom: 8 },
  statusIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 22 },
  statusDate: { fontSize: 14 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  routeInfo: { flex: 1 },
  routeLabel: { fontSize: 12, marginBottom: 2, fontFamily: 'Inter-Regular' },
  routeAddr: { fontSize: 14, lineHeight: 20 },
  routeDivider: { borderLeftWidth: 2, borderStyle: 'dashed', height: 20, marginLeft: 5, marginVertical: 4 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  driverInfo: { flex: 1, gap: 4 },
  driverName: { fontSize: 16 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 16, marginBottom: 12 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  fareLabel: { fontSize: 14, fontFamily: 'Inter-Regular' },
  fareValue: { fontSize: 14 },
  fareDivider: { height: 1, marginVertical: 8 },
  actionsRow: { gap: 12 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 16 },
});
