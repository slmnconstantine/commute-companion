import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@/utils/fareCalculator';
import { BookingWithCommuter, TripWithDriver } from '@/types/database';

interface TripBottomActionsProps {
  trip: TripWithDriver;
  theme: any;
  insets: any;
  isDriver: boolean;
  userBooking?: BookingWithCommuter;
  showChatButton: boolean;
  chatRoomId: string | null;
  processingBookingId: string | null;
  handleLeaveTrip: (id: string) => void;
  handleCommuterArrival: (id: string) => void;
  handleUpdateTripStatus: (status: 'ongoing' | 'completed') => void;
  router: any;
  id: string;
}

export default function TripBottomActions({
  trip,
  theme,
  insets,
  isDriver,
  userBooking,
  showChatButton,
  chatRoomId,
  processingBookingId,
  handleLeaveTrip,
  handleCommuterArrival,
  handleUpdateTripStatus,
  router,
  id,
}: TripBottomActionsProps) {
  return (
    <>
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
              style={[
                styles.ctaButton,
                {
                  backgroundColor: 'transparent',
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  elevation: 0,
                  shadowOpacity: 0,
                  flexDirection: 'row',
                  gap: 8,
                }
              ]}
              onPress={() => router.push(`/(main)/chat/${chatRoomId}`)}
            >
              <Ionicons name="chatbubbles" size={20} color={theme.colors.primary} />
              <Text style={[styles.ctaButtonText, { color: theme.colors.primary }]}>Open Trip Chat</Text>
            </Pressable>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bottomCTA: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaInfo: {
    flex: 1,
  },
  ctaPrice: {
    fontSize: 24,
  },
  ctaPerSeat: {
    fontSize: 13,
    marginTop: 2,
  },
  ctaButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
});
