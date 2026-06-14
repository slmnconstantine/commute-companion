import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function CommuterRequestModal({
  visible,
  onClose,
  theme,
  reqOrigin,
  reqDestination,
  activeRoute,
  seatsNeeded,
  setSeatsNeeded,
  requestDate,
  setShowReqDatePicker,
  requestTime,
  setShowReqTimePicker,
  savingRequest,
  submitRideRequest,
  parseRequestDetails,
}: {
  visible: boolean;
  onClose: () => void;
  theme: any;
  reqOrigin: any;
  reqDestination: any;
  activeRoute: any;
  seatsNeeded: number;
  setSeatsNeeded: (val: number) => void;
  requestDate: string;
  setShowReqDatePicker: (val: boolean) => void;
  requestTime: string;
  setShowReqTimePicker: (val: boolean) => void;
  savingRequest: boolean;
  submitRideRequest: () => void;
  parseRequestDetails: (label: string | null) => any;
}) {
  const router = useRouter();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={pickerStyles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[pickerStyles.timeSheet, { backgroundColor: theme.colors.surface }]}
        >
          <Pressable onPress={() => { }} style={{ width: '100%' }}>
            {/* Handle bar */}
            <View style={pickerStyles.sheetHandle}>
              <View style={[pickerStyles.handleBar, { backgroundColor: theme.colors.border }]} />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 }}>
              <Text style={[pickerStyles.sheetTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', marginBottom: 0 }]}>
                Ride Request Details
              </Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </Pressable>
            </View>

            <ScrollView style={{ paddingHorizontal: 20, maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {/* Route Info Summary Card (Pressable to Edit request route) */}
              {(() => {
                const displayOrigin = reqOrigin || (activeRoute ? { lat: activeRoute.origin_lat, lng: activeRoute.origin_lng, label: activeRoute.origin_label } : null);
                const displayDestination = reqDestination || (activeRoute ? { lat: activeRoute.destination_lat, lng: activeRoute.destination_lng, label: activeRoute.destination_label } : null);

                if (!displayOrigin || !displayDestination) return null;

                return (
                  <Pressable
                    style={[
                      styles.routeSummaryCard,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                        borderWidth: 1,
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }
                    ]}
                    onPress={() => {
                      onClose();
                      router.push({
                        pathname: '/(main)/ride/set-route',
                        params: {
                          mode: 'request',
                          origin_lat: String(displayOrigin.lat),
                          origin_lng: String(displayOrigin.lng),
                          origin_label: displayOrigin.label,
                          destination_lat: String(displayDestination.lat),
                          destination_lng: String(displayDestination.lng),
                          destination_label: displayDestination.label,
                        }
                      });
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 13, color: theme.colors.textMuted, marginBottom: 8 }}>
                        REQUESTED ROUTE
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success }} />
                        <Text style={{ fontFamily: 'Inter-Medium', fontSize: 14, color: theme.colors.text }} numberOfLines={1}>
                          {displayOrigin.label}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 1.5, backgroundColor: theme.colors.error }} />
                        <Text style={{ fontFamily: 'Inter-Medium', fontSize: 14, color: theme.colors.text }} numberOfLines={1}>
                          {displayDestination.label}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ color: theme.colors.primary, fontFamily: 'Inter-SemiBold', fontSize: 13 }}>Edit</Text>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
                    </View>
                  </Pressable>
                );
              })()}

              {/* Seat Selector */}
              <Text style={[styles.modalSectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', marginBottom: 8 }]}>
                Seats Needed
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <Pressable
                    key={n}
                    style={[
                      styles.seatSelectBtn,
                      {
                        backgroundColor: n === seatsNeeded ? theme.colors.primary : theme.colors.background,
                        borderColor: n === seatsNeeded ? theme.colors.primary : theme.colors.border,
                        borderWidth: 1.5,
                        borderRadius: 10,
                        flex: 1,
                        height: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }
                    ]}
                    onPress={() => setSeatsNeeded(n)}
                  >
                    <Text style={{ color: n === seatsNeeded ? '#fff' : theme.colors.text, fontFamily: 'Inter-Bold', fontSize: 15 }}>
                      {n}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Date / Time Inputs */}
              <Text style={[styles.modalSectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', marginBottom: 8 }]}>
                Departure Schedule
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                <Pressable
                  style={[
                    styles.modalDateBtn,
                    {
                      flex: 1.2,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      height: 48,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: requestDate ? theme.colors.primary : theme.colors.border,
                      paddingHorizontal: 12,
                      backgroundColor: theme.colors.background,
                    }
                  ]}
                  onPress={() => setShowReqDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color={requestDate ? theme.colors.primary : theme.colors.textMuted} />
                  <Text style={{ color: requestDate ? theme.colors.text : theme.colors.textMuted, fontFamily: 'Inter-Medium', fontSize: 14 }} numberOfLines={1}>
                    {requestDate ? new Date(requestDate + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select Date'}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.modalDateBtn,
                    {
                      flex: 0.8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      height: 48,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: requestTime ? theme.colors.primary : theme.colors.border,
                      paddingHorizontal: 12,
                      backgroundColor: theme.colors.background,
                    }
                  ]}
                  onPress={() => setShowReqTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={18} color={requestTime ? theme.colors.primary : theme.colors.textMuted} />
                  <Text style={{ color: requestTime ? theme.colors.text : theme.colors.textMuted, fontFamily: 'Inter-Medium', fontSize: 14 }} numberOfLines={1}>
                    {requestTime ? (() => {
                      const [h, m] = requestTime.split(':').map(Number);
                      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                      const ampm = h < 12 ? 'AM' : 'PM';
                      return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
                    })() : 'Time'}
                  </Text>
                </Pressable>
              </View>

              {/* Action button */}
              <Pressable
                style={[
                  styles.postRequestBtn,
                  {
                    backgroundColor: theme.colors.primary,
                    height: 52,
                    borderRadius: 14,
                    justifyContent: 'center',
                    opacity: savingRequest ? 0.7 : 1,
                    marginBottom: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }
                ]}
                onPress={submitRideRequest}
                disabled={savingRequest}
              >
                <Ionicons name="paper-plane" size={18} color="#fff" />
                <Text style={[styles.postRequestBtnText, { fontFamily: 'Inter-SemiBold', fontSize: 16 }]}>
                  {savingRequest ? 'Saving Request...' : parseRequestDetails(activeRoute?.label || null) ? 'Update Ride Request' : 'Publish Ride Request'}
                </Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  routeSummaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 15,
    marginTop: 12,
  },
  seatSelectBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
  },
  postRequestBtn: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postRequestBtnText: {
    color: '#fff',
    fontSize: 14,
  },
});

const pickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 48,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 12,
  },
  sheetHandle: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  sheetTitle: { fontSize: 17, textAlign: 'center', marginBottom: 12 },
});
