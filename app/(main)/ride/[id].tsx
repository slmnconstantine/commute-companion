import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map, Camera, RasterSource, Layer, GeoJSONSource, Marker } from '@maplibre/maplibre-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { getTripById, updateTripStatus } from '@/services/trips';
import { getTripBookings, updateBookingStatus } from '@/services/bookings';
import { getOrCreateChatRoom, joinChatRoom, getChatRoom } from '@/services/chatRooms';
import { sendMessage } from '@/services/messages';
import { decodePolyline } from '@/services/routing';
import { formatDepartureTime } from '@/utils/dateFormatter';
import { formatCurrency, calculateFare } from '@/utils/fareCalculator';
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
  
  const [bookings, setBookings] = useState<BookingWithCommuter[]>([]);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);

  useEffect(() => {
    loadTrip();
  }, [id]);

  const loadTrip = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getTripById(id);
      setTrip(data);
      if (data?.route_polyline) {
        setRouteCoords(decodePolyline(data.route_polyline));
      }
      
      const bookingsData = await getTripBookings(id);
      setBookings(bookingsData);
      
      const chatRoom = await getChatRoom(id);
      if (chatRoom) setChatRoomId(chatRoom.id);
    } catch (e) {
      Alert.alert('Error', 'Failed to load trip details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBooking = async (booking: BookingWithCommuter) => {
    setProcessingBookingId(booking.id);
    try {
      await updateBookingStatus(booking.id, 'accepted');
      
      let room = await getChatRoom(id);
      let isNewRoom = false;
      if (!room) {
        room = await getOrCreateChatRoom(id);
        isNewRoom = true;
      }
      if (!room) throw new Error("Could not create chat room");
      
      setChatRoomId(room.id);
      await joinChatRoom(room.id, booking.commuter_id);
      
      if (isNewRoom && profile?.id) {
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
  };

  const handleRejectBooking = async (bookingId: string) => {
    setProcessingBookingId(bookingId);
    try {
      await updateBookingStatus(bookingId, 'rejected');
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'rejected' } : b));
    } catch (e) {
      Alert.alert('Error', 'Failed to reject booking');
    } finally {
      setProcessingBookingId(null);
    }
  };

  const handleUpdateTripStatus = async (newStatus: 'ongoing' | 'completed') => {
    try {
      await updateTripStatus(id as string, newStatus);
      setTrip(prev => prev ? { ...prev, status: newStatus } : null);
      Alert.alert('Success', newStatus === 'ongoing' ? 'Trip started! Drive safely.' : 'Trip completed!');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update trip status');
    }
  };

  if (loading) return <LoadingSpinner size="lg" message="Loading trip..." />;
  if (!trip) return <LoadingSpinner size="lg" message="Trip not found" />;

  const isDriver = profile?.id === trip.driver_id;
  const userBooking = bookings.find(b => b.commuter_id === profile?.id);
  const isConfirmedPassenger = userBooking?.status === 'accepted';
  
  const showChatButton = (isDriver && chatRoomId) || (isConfirmedPassenger && chatRoomId);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Map Header */}
      <View style={styles.mapSection}>
        <Map
          style={styles.map}
          logo={false}
          attribution={false}
          compass={false}
          mapStyle={{ version: 8, sources: {}, layers: [] }}
        >
          <Camera
            initialViewState={{
              center: [(trip.origin_lng + trip.destination_lng) / 2, (trip.origin_lat + trip.destination_lat) / 2],
              zoom: 10,
            }}
          />
          <RasterSource
            id="osm"
            tiles={['https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png']}
            tileSize={256}
          >
            <Layer id="osm-layer" type="raster" source="osm" />
          </RasterSource>

          <Marker id="origin" lngLat={[trip.origin_lng, trip.origin_lat]}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#0D9488', borderWidth: 2, borderColor: '#fff' }} />
          </Marker>
          
          <Marker id="destination" lngLat={[trip.destination_lng, trip.destination_lat]}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#F59E0B', borderWidth: 2, borderColor: '#fff' }} />
          </Marker>

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
          <StatItem icon="cash" label="Per seat" value={formatCurrency(trip.fare_per_seat)} theme={theme} highlight />
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
                      onPress={() => handleRejectBooking(booking.id)}
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
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      {!isDriver && trip.status === 'open' && !userBooking && (
        <View style={[styles.bottomCTA, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border }]}>
          <View style={styles.ctaInfo}>
            <Text style={[styles.ctaPrice, { color: theme.colors.primary, fontFamily: 'Inter-Bold' }]}>
              {formatCurrency(trip.fare_per_seat)}
            </Text>
            <Text style={[styles.ctaPerSeat, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>per seat</Text>
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
      {!isDriver && showChatButton && (
        <View style={[styles.bottomCTA, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border }]}>
          <Pressable
            style={[styles.ctaButton, { backgroundColor: theme.colors.primary, flex: 1, flexDirection: 'row', gap: 8 }]}
            onPress={() => router.push(`/(main)/chat/${chatRoomId}`)}
          >
            <Ionicons name="chatbubbles" size={20} color="#fff" />
            <Text style={styles.ctaButtonText}>Open Trip Chat</Text>
          </Pressable>
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
  map: { flex: 1 },
  backBtn: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
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
