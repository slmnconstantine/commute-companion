import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '@/components/common/Avatar';
import Badge from '@/components/common/Badge';
import { formatCurrency } from '@/utils/fareCalculator';
import { BookingWithCommuter, TripWithDriver } from '@/types/database';

interface DriverBookingsListProps {
  bookings: BookingWithCommuter[];
  trip: TripWithDriver;
  theme: any;
  processingBookingId: string | null;
  acceptedBookings: BookingWithCommuter[];
  driverPayoutDetails: { netPayout: number; platformFee: number };
  handleAcceptBooking: (b: BookingWithCommuter) => void;
  handleRejectBooking: (b: BookingWithCommuter) => void;
  handleRemovePassenger: (b: BookingWithCommuter) => void;
  handleDriverArrival: (id: string) => void;
  onAvatarPress: (userId: string) => void;
}

export default function DriverBookingsList({
  bookings,
  trip,
  theme,
  processingBookingId,
  acceptedBookings,
  driverPayoutDetails,
  handleAcceptBooking,
  handleRejectBooking,
  handleRemovePassenger,
  handleDriverArrival,
  onAvatarPress,
}: DriverBookingsListProps) {
  if (bookings.length === 0) return null;

  const totalCollectedFare = acceptedBookings.reduce((sum, b) => sum + (b.fare_paid || 0), 0);

  return (
    <View style={[styles.driverCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[{ color: theme.colors.text, fontFamily: 'Inter-SemiBold', fontSize: 16, marginBottom: 8 }]}>Booking Requests</Text>
      {bookings.map(booking => (
        <View key={booking.id} style={[styles.bookingItem, { borderBottomColor: theme.colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Pressable onPress={() => booking.commuter?.id && onAvatarPress(booking.commuter.id)}>
              <Avatar uri={booking.commuter?.avatar_url} name={booking.commuter?.full_name || ''} size="sm" />
            </Pressable>
            <View style={{ marginLeft: 10, flex: 1, alignItems: 'flex-start' }}>
              <Text style={{ color: theme.colors.text, fontFamily: 'Inter-Medium', marginBottom: 4 }} numberOfLines={1}>
                {booking.commuter?.full_name}
              </Text>
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
  );
}

const styles = StyleSheet.create({
  driverCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  bookingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
