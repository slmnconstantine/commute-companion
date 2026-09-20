import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '@/components/common/Avatar';
import Badge from '@/components/common/Badge';
import { formatCurrency } from '@/utils/fareCalculator';
import { BookingWithCommuter, TripWithDriver } from '@/types/database';
import { isTripArchived } from '@/services/liveFaceVerification';
import GCashReceiptModal from './GCashReceiptModal';

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
  commuterLiveRecords?: Record<string, any>;
  onViewPassengerPhoto?: (passenger: { name: string; photoUri: string; pickup?: string }) => void;
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
  commuterLiveRecords,
  onViewPassengerPhoto,
}: DriverBookingsListProps) {
  const [selectedReceiptBooking, setSelectedReceiptBooking] = useState<BookingWithCommuter | null>(null);

  if (bookings.length === 0) return null;

  const isArchived = isTripArchived(trip);
  const totalCollectedFare = acceptedBookings.reduce((sum, b) => sum + (b.fare_paid || 0), 0);
  const totalReservationDeposits = acceptedBookings.reduce(
    (sum, b) => sum + (b.is_reservation ? (b.reservation_fee || 0) : 0),
    0
  );
  const cashToCollect = Math.max(0, totalCollectedFare - totalReservationDeposits);

  return (
    <View style={[styles.driverCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Booking Requests
        </Text>
        <View style={[styles.countBadge, { backgroundColor: theme.colors.primary + '18' }]}>
          <Text style={[styles.countText, { color: theme.colors.primary }]}>
            {bookings.length}
          </Text>
        </View>
      </View>

      {bookings.map((booking, index) => {
        const commuterCapture = commuterLiveRecords?.[booking.commuter_id] || commuterLiveRecords?.[booking.id];
        const isLast = index === bookings.length - 1;

        return (
          <View
            key={booking.id}
            style={[
              styles.bookingItem,
              !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
            ]}
          >
            {/* Top Row: Passenger Info + Primary Action / Status */}
            <View style={styles.itemTopRow}>
              <Pressable
                onPress={() => booking.commuter?.id && onAvatarPress(booking.commuter.id)}
                style={styles.avatarWrap}
              >
                <Avatar
                  uri={booking.commuter?.avatar_url}
                  name={booking.commuter?.full_name || ''}
                  size="md"
                />
              </Pressable>

              <View style={styles.commuterInfo}>
                <Text
                  style={[styles.commuterName, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {booking.commuter?.full_name || 'Commuter'}
                </Text>

                <View style={styles.seatsFareRow}>
                  <Text style={[styles.seatsFareText, { color: theme.colors.textMuted }]}>
                    {booking.seats_booked || 1} {(booking.seats_booked || 1) === 1 ? 'seat' : 'seats'}
                    {booking.fare_paid != null && ` • ${formatCurrency(booking.fare_paid)}`}
                  </Text>
                </View>

                {booking.is_reservation && (
                  <View style={[styles.reservationBadge, { backgroundColor: '#007DFE18', borderColor: '#007DFE40' }]}>
                    <Ionicons name="wallet" size={11} color="#007DFE" />
                    <Text style={[styles.reservationBadgeText, { color: '#007DFE' }]}>
                      Reserved ({formatCurrency(booking.reservation_fee || 0)})
                    </Text>
                  </View>
                )}
              </View>

              {/* Right Side: Status or Action */}
              <View style={styles.actionCol}>
                {booking.status === 'pending' && (
                  <View style={styles.decisionBtnsRow}>
                    <Pressable
                      style={[styles.decisionBtn, { backgroundColor: theme.colors.error + '15', borderColor: theme.colors.error + '40' }]}
                      onPress={() => handleRejectBooking(booking)}
                      disabled={processingBookingId === booking.id}
                      hitSlop={6}
                    >
                      <Ionicons name="close" size={18} color={theme.colors.error} />
                    </Pressable>
                    <Pressable
                      style={[styles.decisionBtn, { backgroundColor: theme.colors.success + '15', borderColor: theme.colors.success + '40' }]}
                      onPress={() => handleAcceptBooking(booking)}
                      disabled={processingBookingId === booking.id}
                      hitSlop={6}
                    >
                      <Ionicons name="checkmark" size={18} color={theme.colors.success} />
                    </Pressable>
                  </View>
                )}

                {booking.status === 'accepted' && (trip.status === 'open' || trip.status === 'full') && (
                  <View style={styles.statusAndRemoveRow}>
                    <Badge label="Accepted" variant="accepted" />
                    <Pressable
                      style={[styles.iconBtn, { backgroundColor: theme.colors.error + '15' }]}
                      onPress={() => handleRemovePassenger(booking)}
                      disabled={processingBookingId === booking.id}
                      hitSlop={6}
                    >
                      <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                    </Pressable>
                  </View>
                )}

                {booking.status === 'accepted' && trip.status === 'ongoing' && (
                  <View style={styles.arrivalCol}>
                    {!booking.driver_confirmed ? (
                      <Pressable
                        style={[
                          styles.arrivalConfirmBtn,
                          {
                            backgroundColor: `${theme.colors.success}18`,
                            borderColor: theme.colors.success,
                          },
                        ]}
                        onPress={() => handleDriverArrival(booking.id)}
                        disabled={processingBookingId === booking.id}
                      >
                        <Ionicons name="location-outline" size={14} color={theme.colors.success} />
                        <Text style={[styles.arrivalConfirmText, { color: theme.colors.success }]}>
                          Confirm Arrival
                        </Text>
                      </Pressable>
                    ) : (
                      <View style={[styles.arrivedBadge, { backgroundColor: `${theme.colors.success}15` }]}>
                        <Ionicons name="checkmark-circle" size={15} color={theme.colors.success} />
                        <Text style={[styles.arrivedText, { color: theme.colors.success }]}>
                          Arrived
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {booking.status !== 'pending' && booking.status !== 'accepted' && (
                  <Badge
                    label={booking.status}
                    variant={booking.status === 'completed' ? 'completed' : 'cancelled'}
                  />
                )}
              </View>
            </View>

            {/* Sub Rows: Live Photo & GCash Receipt Buttons */}
            <View style={styles.itemMetaWrap}>
              {commuterCapture && !isArchived && (
                <Pressable
                  style={[
                    styles.livePhotoBtn,
                    {
                      backgroundColor: `${theme.colors.success}12`,
                      borderColor: `${theme.colors.success}40`,
                    },
                  ]}
                  onPress={() => {
                    if (isArchived) return;
                    onViewPassengerPhoto?.({
                      name: booking.commuter?.full_name || 'Passenger',
                      photoUri: commuterCapture.photoUri,
                      pickup: trip.origin_label,
                    });
                  }}
                >
                  {commuterCapture.photoUri ? (
                    <Image source={{ uri: commuterCapture.photoUri }} style={styles.livePhotoThumb} />
                  ) : (
                    <Ionicons name="camera" size={13} color={theme.colors.success} />
                  )}
                  <Text style={[styles.livePhotoBtnText, { color: theme.colors.success }]}>
                    Passenger Live Photo
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color={theme.colors.success} />
                </Pressable>
              )}

              {booking.is_reservation && booking.payment_proof_url && (
                <Pressable
                  style={[
                    styles.livePhotoBtn,
                    {
                      backgroundColor: '#007DFE14',
                      borderColor: '#007DFE40',
                    },
                  ]}
                  onPress={() => setSelectedReceiptBooking(booking)}
                >
                  <Ionicons name="receipt-outline" size={13} color="#007DFE" />
                  <Text style={[styles.livePhotoBtnText, { color: '#007DFE' }]}>
                    View GCash Receipt
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color="#007DFE" />
                </Pressable>
              )}
            </View>
          </View>
        );
      })}

      {/* Financial Breakdown */}
      {acceptedBookings.length > 0 && (
        <View
          style={[
            styles.financialCard,
            {
              backgroundColor: theme.colors.surfaceMuted || `${theme.colors.border}15`,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.financialRow}>
            <Text style={[styles.financialLabel, { color: theme.colors.textMuted }]}>
              Total Trip Fare
            </Text>
            <Text style={[styles.financialVal, { color: theme.colors.text }]}>
              {formatCurrency(totalCollectedFare)}
            </Text>
          </View>

          {totalReservationDeposits > 0 && (
            <>
              <View style={styles.financialRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="wallet-outline" size={13} color="#007DFE" />
                  <Text style={[styles.financialLabel, { color: '#007DFE' }]}>
                    Advance GCash Deposits
                  </Text>
                </View>
                <Text style={[styles.financialVal, { color: '#007DFE', fontFamily: 'Inter-SemiBold' }]}>
                  {formatCurrency(totalReservationDeposits)}
                </Text>
              </View>

              <View style={styles.financialRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="cash-outline" size={13} color={theme.colors.text} />
                  <Text style={[styles.financialLabel, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>
                    Cash to Collect on Pickup
                  </Text>
                </View>
                <Text style={[styles.financialVal, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
                  {formatCurrency(cashToCollect)}
                </Text>
              </View>
            </>
          )}

          <View style={styles.financialRow}>
            <Text style={[styles.financialLabel, { color: theme.colors.textMuted }]}>
              Platform fee (10%)
            </Text>
            <Text style={[styles.financialVal, { color: theme.colors.error }]}>
              -{formatCurrency(driverPayoutDetails.platformFee)}
            </Text>
          </View>

          <View style={[styles.financialDivider, { backgroundColor: theme.colors.border }]} />

          <View style={styles.financialRow}>
            <Text style={[styles.financialTotalLabel, { color: theme.colors.text }]}>
              Net Earnings
            </Text>
            <Text style={[styles.financialTotalVal, { color: theme.colors.success }]}>
              {formatCurrency(driverPayoutDetails.netPayout)}
            </Text>
          </View>
        </View>
      )}

      {/* ═══ GCash Receipt Viewer Modal ═══ */}
      {selectedReceiptBooking && (
        <GCashReceiptModal
          visible={!!selectedReceiptBooking}
          onClose={() => setSelectedReceiptBooking(null)}
          receiptUrl={selectedReceiptBooking.payment_proof_url || null}
          commuterName={selectedReceiptBooking.commuter?.full_name || 'Commuter'}
          reservationFee={selectedReceiptBooking.reservation_fee || 0}
          paymentStatus={selectedReceiptBooking.payment_status}
          onAccept={
            selectedReceiptBooking.status === 'pending'
              ? () => {
                  const b = selectedReceiptBooking;
                  setSelectedReceiptBooking(null);
                  handleAcceptBooking(b);
                }
              : undefined
          }
          accepting={processingBookingId === selectedReceiptBooking.id}
        />
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  bookingItem: {
    paddingVertical: 12,
    gap: 8,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarWrap: {
    marginRight: 12,
  },
  commuterInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  commuterName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    marginBottom: 2,
  },
  seatsFareRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatsFareText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  actionCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  decisionBtnsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  decisionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusAndRemoveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivalCol: {
    alignItems: 'flex-end',
  },
  arrivalConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  arrivalConfirmText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  arrivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  arrivedText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  itemMetaRow: {
    paddingLeft: 48,
  },
  livePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  livePhotoThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  livePhotoBtnText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
  },
  financialCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financialLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  financialVal: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
  },
  financialDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  financialTotalLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  financialTotalVal: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
  },
  reservationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  reservationBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  itemMetaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
});
