/**
 * Rides Tab
 *
 * Two-section segmented control visible to ALL users:
 * - "Search Rides": Browse available posted rides (Commuter & Driver)
 * - "Post a Ride": Drivers can post rides; Commuters see "Become a Driver" banner
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRoute } from '@/context/RouteContext';
import { useNotifications } from '@/context/NotificationContext';
import EmptyState from '@/components/common/EmptyState';
import Avatar from '@/components/common/Avatar';
import { supabase } from '@/lib/supabase';

import { getDriverTrips, getTrips } from '@/services/trips';
import { getCommuterRequests, CommuterRequest } from '@/services/rideRequests';
import type { TripWithDriver } from '@/types/database';
import TripCard from '@/components/ride/TripCard';

const SEGMENTS = ['Search Rides', 'Post a Ride'] as const;
type Segment = (typeof SEGMENTS)[number];

// ── Picker Constants & Modals ──────────────────────────────────────────────────
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// DatePickerModal — calendar-style date picker
function DatePickerModal({
  visible, onClose, onSelect, selectedDate, theme,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  selectedDate: string;
  theme: any;
}) {
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to full rows of 7
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={pickerStyles.backdrop} onPress={onClose}>
        <Pressable style={[pickerStyles.card, { backgroundColor: theme.colors.surface }]} onPress={() => {}}>
          {/* Header */}
          <View style={pickerStyles.calHeader}>
            <Pressable onPress={prevMonth} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
            </Pressable>
            <Text style={[pickerStyles.calTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
              {MONTH_NAMES[month]} {year}
            </Text>
            <Pressable onPress={nextMonth} hitSlop={12}>
              <Ionicons name="chevron-forward" size={22} color={theme.colors.text} />
            </Pressable>
          </View>

          {/* Day-of-week headers */}
          <View style={pickerStyles.calRow}>
            {DAY_LABELS.map((d) => (
              <View key={d} style={pickerStyles.calCell}>
                <Text style={[pickerStyles.calDayLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <View key={row} style={pickerStyles.calRow}>
              {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                if (day === null) return <View key={col} style={pickerStyles.calCell} />;
                const dateObj = new Date(year, month, day);
                const isPast = dateObj < today;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = dateStr === selectedDate;
                const isToday = dateObj.getTime() === today.getTime();
                return (
                  <Pressable
                    key={col}
                    style={pickerStyles.calCell}
                    disabled={isPast}
                    onPress={() => { onSelect(dateStr); onClose(); }}
                  >
                    <View
                      style={[
                        pickerStyles.dayCircle,
                        isSelected && { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          pickerStyles.calDayNum,
                          { color: isPast ? theme.colors.textMuted : theme.colors.text, fontFamily: 'Inter-Regular' },
                          isSelected && { color: '#fff', fontFamily: 'Inter-Bold' },
                          isToday && !isSelected && { color: theme.colors.primary, fontFamily: 'Inter-Bold' },
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                    {isToday && !isSelected && <View style={[pickerStyles.todayDot, { backgroundColor: theme.colors.primary }]} />}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// TimePickerModal — modernized select picker
function TimePickerModal({
  visible, onClose, onSelect, selectedTime, theme,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (time: string) => void;
  selectedTime: string;
  theme: any;
}) {
  const [hour24, setHour24] = useState(() => {
    const [h] = selectedTime.split(':');
    return parseInt(h || '0', 10);
  });
  const [minute, setMinute] = useState(() => {
    const [, m] = selectedTime.split(':');
    return parseInt(m || '0', 10);
  });
  const [activePicker, setActivePicker] = useState<'hour' | 'minute'>('hour');

  useEffect(() => {
    if (visible) {
      const [h, m] = selectedTime.split(':');
      setHour24(parseInt(h || '0', 10));
      setMinute(parseInt(m || '0', 10));
      setActivePicker('hour');
    }
  }, [selectedTime, visible]);

  const isPM = hour24 >= 12;
  const hour12 = hour24 === 0 ? 12 : (hour24 > 12 ? hour24 - 12 : hour24);

  const handleHourSelect = (h: number) => {
    const newH24 = isPM ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
    setHour24(newH24);
    setTimeout(() => {
      setActivePicker('minute');
    }, 250);
  };

  const handleAmPmSelect = (pm: boolean) => {
    if (pm && !isPM) setHour24(hour24 + 12);
    if (!pm && isPM) setHour24(hour24 - 12);
  };

  const handleSave = () => {
    const hStr = String(hour24).padStart(2, '0');
    const mStr = String(minute).padStart(2, '0');
    onSelect(`${hStr}:${mStr}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pickerStyles.backdrop} onPress={onClose}>
        <Pressable style={[pickerStyles.timeSheet, { backgroundColor: theme.colors.surface }]} onPress={() => {}}>
          {/* Header handle */}
          <View style={pickerStyles.sheetHandle}>
            <View style={[pickerStyles.handleBar, { backgroundColor: theme.colors.border }]} />
          </View>
          
          {/* Title Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 }}>
             <Text style={{ color: theme.colors.text, fontFamily: 'Inter-SemiBold', fontSize: 18 }}>
                Departure Time
             </Text>
             <Pressable 
               onPress={handleSave}
               style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 100 }}
             >
               <Text style={{ color: '#fff', fontFamily: 'Inter-Bold', fontSize: 14 }}>Done</Text>
             </Pressable>
          </View>

          <View style={{ paddingHorizontal: 24 }}>
            {/* Elegant Digital Time Display capsule */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              backgroundColor: theme.colors.inputBackground, 
              borderRadius: 24, 
              paddingHorizontal: 24, 
              paddingVertical: 16,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: theme.colors.border
            }}>
              {/* Left Side: Time Selectors (Hour : Minute) */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Hour display button */}
                <Pressable 
                  onPress={() => setActivePicker('hour')}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: activePicker === 'hour' ? `${theme.colors.primary}15` : 'transparent',
                    borderWidth: 1.5,
                    borderColor: activePicker === 'hour' ? theme.colors.primary : 'transparent',
                  }}
                >
                  <Text style={{ 
                    fontSize: 40, 
                    fontFamily: 'Inter-Bold', 
                    color: activePicker === 'hour' ? theme.colors.primary : theme.colors.text 
                  }}>
                    {hour12}
                  </Text>
                </Pressable>
                
                <Text style={{ fontSize: 36, fontFamily: 'Inter-Bold', color: theme.colors.textMuted, marginHorizontal: 4 }}>
                  :
                </Text>

                {/* Minute display button */}
                <Pressable 
                  onPress={() => setActivePicker('minute')}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: activePicker === 'minute' ? `${theme.colors.primary}15` : 'transparent',
                    borderWidth: 1.5,
                    borderColor: activePicker === 'minute' ? theme.colors.primary : 'transparent',
                  }}
                >
                  <Text style={{ 
                    fontSize: 40, 
                    fontFamily: 'Inter-Bold', 
                    color: activePicker === 'minute' ? theme.colors.primary : theme.colors.text 
                  }}>
                    {String(minute).padStart(2, '0')}
                  </Text>
                </Pressable>
              </View>

              {/* Right Side: Modern Segmented AM/PM selector */}
              <View style={{ 
                flexDirection: 'row', 
                backgroundColor: theme.colors.background, 
                borderRadius: 12, 
                padding: 3,
                borderWidth: 1,
                borderColor: theme.colors.border
              }}>
                <Pressable 
                  onPress={() => handleAmPmSelect(false)} 
                  style={{ 
                    paddingVertical: 8, 
                    paddingHorizontal: 16, 
                    borderRadius: 9, 
                    backgroundColor: !isPM ? theme.colors.primary : 'transparent',
                    shadowColor: !isPM ? theme.colors.primary : 'transparent',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: !isPM ? 2 : 0
                  }}
                >
                  <Text style={{ color: !isPM ? '#fff' : theme.colors.textMuted, fontFamily: 'Inter-Bold', fontSize: 14 }}>AM</Text>
                </Pressable>
                <Pressable 
                  onPress={() => handleAmPmSelect(true)} 
                  style={{ 
                    paddingVertical: 8, 
                    paddingHorizontal: 16, 
                    borderRadius: 9, 
                    backgroundColor: isPM ? theme.colors.primary : 'transparent',
                    shadowColor: isPM ? theme.colors.primary : 'transparent',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: isPM ? 2 : 0
                  }}
                >
                  <Text style={{ color: isPM ? '#fff' : theme.colors.textMuted, fontFamily: 'Inter-Bold', fontSize: 14 }}>PM</Text>
                </Pressable>
              </View>
            </View>

            {/* Dynamic Selector Area */}
            {activePicker === 'hour' ? (
              <View style={{ marginBottom: 16 }}>
                {/* Hours Grid */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 13, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Select Hour
                  </Text>
                  <Text style={{ fontFamily: 'Inter-Medium', fontSize: 12, color: theme.colors.primary }}>
                    Tapping an hour auto-switches to minutes
                  </Text>
                </View>
                
                {/* 3x4 clean numeric pad layout */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginBottom: 12 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => {
                    const isSelected = hour12 === h;
                    return (
                      <Pressable 
                        key={`h-${h}`} 
                        onPress={() => handleHourSelect(h)}
                        style={{ 
                          width: '21%', 
                          aspectRatio: 1, 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          borderRadius: 100, 
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.inputBackground,
                          borderWidth: 1.5,
                          borderColor: isSelected ? theme.colors.primary : 'transparent',
                          shadowColor: isSelected ? theme.colors.primary : 'transparent',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: isSelected ? 3 : 0
                        }}
                      >
                        <Text style={{ 
                          color: isSelected ? '#fff' : theme.colors.text, 
                          fontFamily: isSelected ? 'Inter-Bold' : 'Inter-Medium', 
                          fontSize: 18 
                        }}>{h}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={{ marginBottom: 16 }}>
                {/* Minutes Grid */}
                <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 13, color: theme.colors.textMuted, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Select Minute
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginBottom: 20 }}>
                  {[0, 15, 30, 45].map(m => {
                    const isSelected = minute === m;
                    return (
                      <Pressable 
                        key={`m-${m}`} 
                        onPress={() => setMinute(m)}
                        style={{ 
                          width: '21%', 
                          aspectRatio: 1, 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          borderRadius: 100, 
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.inputBackground,
                          borderWidth: 1.5,
                          borderColor: isSelected ? theme.colors.primary : 'transparent',
                          shadowColor: isSelected ? theme.colors.primary : 'transparent',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: isSelected ? 3 : 0
                        }}
                      >
                        <Text style={{ 
                          color: isSelected ? '#fff' : theme.colors.text, 
                          fontFamily: isSelected ? 'Inter-Bold' : 'Inter-Medium', 
                          fontSize: 18 
                        }}>{String(m).padStart(2, '0')}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Safely parse serialized passenger request details
function parseRequestDetails(label: string | null) {
  if (!label) return null;
  try {
    const parsed = JSON.parse(label);
    if (parsed && typeof parsed === 'object') {
      return {
        text: parsed.text || '',
        seats: typeof parsed.seats === 'number' ? parsed.seats : 1,
        departure_time: parsed.departure_time || '',
      };
    }
  } catch (e) {
    // Normal route label string (not serialized JSON request)
  }
  return null;
}

function isJsonLabel(label: string | null) {
  if (!label) return false;
  try {
    const parsed = JSON.parse(label);
    return !!(parsed && typeof parsed === 'object');
  } catch (e) {
    return false;
  }
}

function generateRouteHash(originLat: number, originLng: number, destLat: number, destLng: number) {
  const oLat = originLat.toFixed(2);
  const oLng = originLng.toFixed(2);
  const dLat = destLat.toFixed(2);
  const dLng = destLng.toFixed(2);
  return `${oLat},${oLng}_${dLat},${dLng}`;
}

// ── Components ────────────────────────────────────────────────────────────────

/** Banner shown to commuters in the "Post a Ride" section */
function BecomeDriverBanner({
  theme,
  onPress,
}: {
  theme: ReturnType<typeof useTheme>['theme'];
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.driverBanner, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}
      onPress={onPress}
    >
      <View style={[styles.bannerIconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
        <Ionicons name="car-sport" size={36} color={theme.colors.primary} />
      </View>
      <Text style={[styles.bannerTitle, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
        Want to offer rides?
      </Text>
      <Text style={[styles.bannerDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
        Become a driver to start posting rides and earn by sharing your commute with others.
      </Text>
      <View style={[styles.bannerButton, { backgroundColor: theme.colors.primary }]}>
        <Ionicons name="arrow-forward" size={18} color={theme.colors.white} />
        <Text style={[styles.bannerButtonText, { fontFamily: 'Inter-SemiBold' }]}>Become a Driver</Text>
      </View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function RidesScreen() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const { activeRoute, setActiveRoute } = useRoute();
  const { driverPendingCount, refreshCounts } = useNotifications();
  const router = useRouter();
  const isDriver = profile?.role === 'driver';

  const params = useLocalSearchParams<{
    from_set_route?: string;
    req_origin_lat?: string;
    req_origin_lng?: string;
    req_origin_label?: string;
    req_destination_lat?: string;
    req_destination_lng?: string;
    req_destination_label?: string;
  }>();

  const [activeSegment, setActiveSegment] = useState<Segment>('Search Rides');
  const [refreshing, setRefreshing] = useState(false);
  const [myRides, setMyRides] = useState<TripWithDriver[]>([]);
  const [availableRides, setAvailableRides] = useState<TripWithDriver[]>([]);
  const [rideRequests, setRideRequests] = useState<CommuterRequest[]>([]);

  // Commuter Request States
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [seatsNeeded, setSeatsNeeded] = useState(1);
  const [requestDate, setRequestDate] = useState('');
  const [requestTime, setRequestTime] = useState('');
  const [showReqDatePicker, setShowReqDatePicker] = useState(false);
  const [showReqTimePicker, setShowReqTimePicker] = useState(false);
  const [savingRequest, setSavingRequest] = useState(false);

  // Independent Request Route coordinates
  interface RequestLocationData {
    lat: number;
    lng: number;
    label: string;
  }
  const [reqOrigin, setReqOrigin] = useState<RequestLocationData | null>(null);
  const [reqDestination, setReqDestination] = useState<RequestLocationData | null>(null);
  const [activeRequestRoute, setActiveRequestRoute] = useState<any | null>(null);

  // Load route coordinates returned from set-route
  useEffect(() => {
    if (params.from_set_route === 'true') {
      if (params.req_origin_lat && params.req_origin_lng && params.req_origin_label) {
        setReqOrigin({
          lat: parseFloat(params.req_origin_lat),
          lng: parseFloat(params.req_origin_lng),
          label: params.req_origin_label,
        });
      }
      if (params.req_destination_lat && params.req_destination_lng && params.req_destination_label) {
        setReqDestination({
          lat: parseFloat(params.req_destination_lat),
          lng: parseFloat(params.req_destination_lng),
          label: params.req_destination_label,
        });
      }
      setShowRequestModal(true);
    }
  }, [params]);

  const handlePostRequestPress = () => {
    const isVerified = profile?.is_verified && profile?.verified_badge;
    if (!isVerified) {
      Alert.alert(
        'Verification Required',
        'Only verified commuters can post ride requests. Please submit your verification documents in the Profile tab.',
        [
          { text: 'Go to Profile', onPress: () => router.push('/(main)/(tabs)/profile') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    // Prefill modal: if no custom request route is set, default to activeRoute (commute route)
    if (!reqOrigin && !reqDestination && activeRoute) {
      setReqOrigin({
        lat: activeRoute.origin_lat,
        lng: activeRoute.origin_lng,
        label: activeRoute.origin_label,
      });
      setReqDestination({
        lat: activeRoute.destination_lat,
        lng: activeRoute.destination_lng,
        label: activeRoute.destination_label,
      });
    }

    setShowRequestModal(true);
  };

  const submitRideRequest = async () => {
    if (!profile) return;
    const targetOrigin = reqOrigin || (activeRoute ? { lat: activeRoute.origin_lat, lng: activeRoute.origin_lng, label: activeRoute.origin_label } : null);
    const targetDestination = reqDestination || (activeRoute ? { lat: activeRoute.destination_lat, lng: activeRoute.destination_lng, label: activeRoute.destination_label } : null);

    if (!targetOrigin || !targetDestination) {
      Alert.alert('Route Missing', 'Please set a route for your ride request.');
      return;
    }
    if (!requestDate || !requestTime) {
      Alert.alert('Details Missing', 'Please select both departure date and time.');
      return;
    }

    setSavingRequest(true);
    try {
      const dateTimeIso = new Date(`${requestDate}T${requestTime}`).toISOString();
      const updatedLabel = JSON.stringify({
        text: `${targetOrigin.label.split(',')[0]} → ${targetDestination.label.split(',')[0]}`,
        seats: seatsNeeded,
        departure_time: dateTimeIso,
      });

      if (activeRequestRoute) {
        // Update existing ride request route
        const { error } = await supabase
          .from('routes')
          .update({
            origin_lat: targetOrigin.lat,
            origin_lng: targetOrigin.lng,
            origin_label: targetOrigin.label,
            destination_lat: targetDestination.lat,
            destination_lng: targetDestination.lng,
            destination_label: targetDestination.label,
            label: updatedLabel,
            route_hash: generateRouteHash(targetOrigin.lat, targetOrigin.lng, targetDestination.lat, targetDestination.lng),
            is_active: true,
          })
          .eq('id', activeRequestRoute.id);

        if (error) throw error;
      } else {
        // Create a new separate ride request route record in Supabase
        const routeHash = generateRouteHash(targetOrigin.lat, targetOrigin.lng, targetDestination.lat, targetDestination.lng);
        const { error } = await supabase
          .from('routes')
          .insert({
            user_id: profile.id,
            origin_lat: targetOrigin.lat,
            origin_lng: targetOrigin.lng,
            origin_label: targetOrigin.label,
            destination_lat: targetDestination.lat,
            destination_lng: targetDestination.lng,
            destination_label: targetDestination.label,
            label: updatedLabel,
            route_hash: routeHash,
            is_active: true,
          });

        if (error) throw error;
      }

      setShowRequestModal(false);
      Alert.alert('Success!', 'Your ride request has been published. Drivers will see it on their board and can offer you rides.');
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to publish request.');
    } finally {
      setSavingRequest(false);
    }
  };

  const cancelRideRequest = async () => {
    if (!profile) return;
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this "Looking for a Ride" request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              if (activeRequestRoute) {
                // Set is_active: false on request route
                const { error } = await supabase
                  .from('routes')
                  .update({ is_active: false })
                  .eq('id', activeRequestRoute.id);

                if (error) throw error;
              }

              Alert.alert('Cancelled', 'Your ride request has been removed.');
              setReqOrigin(null);
              setReqDestination(null);
              await loadData();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to cancel request.');
            }
          }
        }
      ]
    );
  };

  const loadData = useCallback(async () => {
    try {
      // Load all open rides (in a real app, this would use activeRoute to filter nearby rides via PostGIS)
      const allRides = await getTrips({ limit: 50 });
      setAvailableRides(allRides.filter(t => t.status === 'open' || t.status === 'full' || t.status === 'ongoing'));

      // Load active ride request for the user
      if (profile?.id) {
        const { data: routesData, error: routesError } = await supabase
          .from('routes')
          .select('*')
          .eq('user_id', profile.id)
          .eq('is_active', true);

        if (!routesError && routesData) {
          const reqRoute = routesData.find((r: any) => isJsonLabel(r.label));
          if (reqRoute) {
            setActiveRequestRoute(reqRoute);
            const details = parseRequestDetails(reqRoute.label);
            if (details) {
              setSeatsNeeded(details.seats || 1);
              if (details.departure_time) {
                const dateObj = new Date(details.departure_time);
                const y = dateObj.getFullYear();
                const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                const d = String(dateObj.getDate()).padStart(2, '0');
                setRequestDate(`${y}-${m}-${d}`);
                
                const hr = String(dateObj.getHours()).padStart(2, '0');
                const mn = String(dateObj.getMinutes()).padStart(2, '0');
                setRequestTime(`${hr}:${mn}`);
              }
            }
            // Populate coordinates if they haven't been overwritten by query parameters
            if (params.from_set_route !== 'true') {
              setReqOrigin({
                lat: reqRoute.origin_lat,
                lng: reqRoute.origin_lng,
                label: reqRoute.origin_label,
              });
              setReqDestination({
                lat: reqRoute.destination_lat,
                lng: reqRoute.destination_lng,
                label: reqRoute.destination_label,
              });
            }
          } else {
            setActiveRequestRoute(null);
            if (params.from_set_route !== 'true') {
              setReqOrigin(null);
              setReqDestination(null);
            }
          }
        }
      }

      // Load my rides if user is driver
      if (profile?.id && isDriver) {
        const myPostedRides = await getDriverTrips(profile.id);
        myPostedRides.sort((a, b) => {
          const activeA = ['open', 'ongoing', 'full'].includes(a.status);
          const activeB = ['open', 'ongoing', 'full'].includes(b.status);
          if (activeA && !activeB) return -1;
          if (!activeA && activeB) return 1;
          
          const timeA = new Date(a.departure_time).getTime();
          const timeB = new Date(b.departure_time).getTime();
          
          if (activeA) {
            return timeA - timeB; // Nearest departure first
          } else {
            return timeB - timeA; // Most recently completed first
          }
        });
        setMyRides(myPostedRides);
        
        const requests = await getCommuterRequests();
        setRideRequests(requests);
      }
    } catch (e) {
      console.log('Error loading trips', e);
    }
  }, [profile?.id, isDriver, params]);

  React.useEffect(() => {
    loadData();
  }, [loadData, activeSegment]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    await refreshCounts();
    setRefreshing(false);
  }, [loadData, refreshCounts]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[theme.typography.heading, { color: theme.colors.text }]}>
          Rides
        </Text>
        <Pressable
          style={[styles.filterBtn, { backgroundColor: theme.colors.inputBackground }]}
        >
          <Ionicons name="options-outline" size={20} color={theme.colors.text} />
        </Pressable>
      </View>

      {/* Segmented control — visible to ALL users */}
      <View
        style={[
          styles.segmentRow,
          { backgroundColor: theme.colors.inputBackground },
        ]}
      >
        {SEGMENTS.map((seg) => {
          const active = seg === activeSegment;
          return (
            <Pressable
              key={seg}
              style={[
                styles.segmentBtn,
                active && {
                  backgroundColor: theme.colors.surface,
                  shadowColor: theme.colors.shadow,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 1,
                  shadowRadius: 3,
                  elevation: 2,
                },
              ]}
              onPress={() => setActiveSegment(seg)}
            >
              <Ionicons
                name={seg === 'Search Rides' ? 'search' : 'add-circle'}
                size={16}
                color={active ? theme.colors.primary : theme.colors.textMuted}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  theme.typography.caption,
                  {
                    color: active ? theme.colors.primary : theme.colors.textMuted,
                    fontFamily: active ? 'Inter-SemiBold' : 'Inter-Regular',
                  },
                ]}
              >
                {seg}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {activeSegment === 'Search Rides' ? (
          /* ─── Search Rides Section ─── */
          availableRides.length > 0 || activeRoute ? (
            <>
              {/* Active Route Summary */}
              {activeRoute ? (
                <View style={{ marginBottom: 16 }}>
                  <Pressable
                    style={[
                      styles.activeRouteCard,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 8 },
                    ]}
                    onPress={() => router.push('/(main)/ride/set-route' as any)}
                  >
                    <View style={styles.activeRouteDots}>
                      <View style={[styles.routeDotGreen, { backgroundColor: theme.colors.success }]} />
                      <View style={[styles.routeLine, { backgroundColor: theme.colors.border }]} />
                      <View style={[styles.routeDotRed, { backgroundColor: theme.colors.error }]} />
                    </View>
                    <View style={styles.activeRouteInfo}>
                      <Text style={[theme.typography.small, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium', marginBottom: 2 }]}>Your Commute</Text>
                      <Text style={[theme.typography.caption, { color: theme.colors.text }]} numberOfLines={1}>
                        {activeRoute.origin_label.split(',')[0]}
                      </Text>
                      <Text style={[theme.typography.caption, { color: theme.colors.text }]} numberOfLines={1}>
                        {activeRoute.destination_label.split(',')[0]}
                      </Text>
                    </View>
                    <Ionicons name="pencil" size={18} color={theme.colors.primary} />
                  </Pressable>

                  {/* Active Ride Request Details */}
                  {activeRequestRoute && (() => {
                    const reqDetails = parseRequestDetails(activeRequestRoute.label);
                    if (!reqDetails) return null;
                    const displayTime = reqDetails.departure_time
                      ? new Date(reqDetails.departure_time).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '';
                    return (
                      <View style={[styles.requestStatusCard, { backgroundColor: `${theme.colors.success}10`, borderColor: theme.colors.success, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                            <Text style={{ color: theme.colors.text, fontFamily: 'Inter-SemiBold', fontSize: 14 }}>
                              Active Ride Request
                            </Text>
                          </View>
                          <Pressable onPress={cancelRideRequest} hitSlop={12}>
                            <Text style={{ color: theme.colors.error, fontFamily: 'Inter-SemiBold', fontSize: 13 }}>Cancel Request</Text>
                          </Pressable>
                        </View>
                        <View style={{ marginTop: 8, gap: 4 }}>
                          <Text style={{ color: theme.colors.textMuted, fontFamily: 'Inter-Regular', fontSize: 13 }}>
                            Route: <Text style={{ color: theme.colors.text, fontFamily: 'Inter-Medium' }}>{activeRequestRoute.origin_label.split(',')[0]} → {activeRequestRoute.destination_label.split(',')[0]}</Text>
                          </Text>
                          <Text style={{ color: theme.colors.textMuted, fontFamily: 'Inter-Regular', fontSize: 13 }}>
                            Seats Needed: <Text style={{ color: theme.colors.text, fontFamily: 'Inter-Medium' }}>{reqDetails.seats}</Text>
                          </Text>
                          <Text style={{ color: theme.colors.textMuted, fontFamily: 'Inter-Regular', fontSize: 13 }}>
                            Departure: <Text style={{ color: theme.colors.text, fontFamily: 'Inter-Medium' }}>{displayTime}</Text>
                          </Text>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Post / Update Request Button (Commuters Only) */}
                  {!isDriver && (
                    <Pressable
                      style={[
                        styles.postRequestBtn,
                        { backgroundColor: theme.colors.primary }
                      ]}
                      onPress={handlePostRequestPress}
                    >
                      <Ionicons name="megaphone-outline" size={18} color={theme.colors.white} />
                      <Text style={[styles.postRequestBtnText, { fontFamily: 'Inter-SemiBold' }]}>
                        {activeRequestRoute ? "Update Ride Request" : "Post 'Looking for a Ride' Request"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <Pressable
                  style={[
                    styles.setRouteCard,
                    { backgroundColor: `${theme.colors.primary}10`, borderColor: `${theme.colors.primary}30` },
                  ]}
                  onPress={() => router.push('/(main)/ride/set-route' as any)}
                >
                  <Ionicons name="navigate-circle" size={28} color={theme.colors.primary} />
                  <View style={styles.setRouteInfo}>
                    <Text style={[{ color: theme.colors.text, fontFamily: 'Inter-SemiBold', fontSize: 14 }]}>Set Your Commute Route</Text>
                    <Text style={[{ color: theme.colors.textMuted, fontFamily: 'Inter-Regular', fontSize: 12 }]}>Pin your origin & destination on the map</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
                </Pressable>
              )}

              <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>
                {availableRides.length} rides available
              </Text>
              {availableRides.map((trip) => (
                <View key={trip.id} style={{ marginBottom: 14 }}>
                  <TripCard trip={trip} onPress={() => router.push(`/(main)/ride/${trip.id}`)} />
                </View>
              ))}
            </>
          ) : (
            <EmptyState
              icon="car-outline"
              title="No Rides Available"
              message="There are no rides in your area right now. Check back soon!"
            />
          )
        ) : (
          /* ─── Post a Ride Section ─── */
          isDriver ? (
            <>
              {/* Create New Ride Button */}
              <Pressable
                style={[styles.createRideCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}
                onPress={() => router.push('/(main)/ride/create' as any)}
              >
                <View style={[styles.createRideIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
                  <Ionicons name="add-circle" size={32} color={theme.colors.primary} />
                </View>
                <View style={styles.createRideInfo}>
                  <Text style={[styles.createRideTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
                    Create New Ride
                  </Text>
                  <Text style={[styles.createRideDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                    Set your route, departure time, and fare
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={theme.colors.primary} />
              </Pressable>

              {/* My Posted Rides */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <Text style={[styles.myRidesTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', marginBottom: 0 }]}>
                  My Posted Rides
                </Text>
                {driverPendingCount > 0 && (
                  <View style={[styles.badgeIndicator, { backgroundColor: theme.colors.error }]}>
                    <Text style={styles.badgeText}>{driverPendingCount} new request{driverPendingCount !== 1 && 's'}</Text>
                  </View>
                )}
              </View>
              {myRides.length > 0 ? (
                myRides.map((trip) => (
                  <View key={trip.id} style={{ marginBottom: 14 }}>
                    <TripCard trip={trip} onPress={() => router.push(`/(main)/ride/${trip.id}`)} />
                  </View>
                ))
              ) : (
                <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginBottom: 14 }}>
                  You don't have any active posted rides.
                </Text>
              )}

              {/* Ride Requests Board */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginTop: 16 }}>
                <Text style={[styles.myRidesTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', marginBottom: 0 }]}>
                  Commuter Ride Requests
                </Text>
              </View>
              {rideRequests.length > 0 ? (
                rideRequests.map((req) => {
                  const details = parseRequestDetails(req.label);
                  const displayTime = details?.departure_time
                    ? new Date(details.departure_time).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Flexible Time';
                  const seatsNeeded = details?.seats || 1;

                  const handleOfferRide = () => {
                    let dateStr = '';
                    let timeStr = '';
                    if (details?.departure_time) {
                      const dateObj = new Date(details.departure_time);
                      const y = dateObj.getFullYear();
                      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                      const d = String(dateObj.getDate()).padStart(2, '0');
                      dateStr = `${y}-${m}-${d}`;
                      
                      const hr = String(dateObj.getHours()).padStart(2, '0');
                      const mn = String(dateObj.getMinutes()).padStart(2, '0');
                      timeStr = `${hr}:${mn}`;
                    }

                    router.push({
                      pathname: '/(main)/ride/create',
                      params: {
                        origin_lat: String(req.origin_lat),
                        origin_lng: String(req.origin_lng),
                        origin_label: req.origin_label,
                        destination_lat: String(req.destination_lat),
                        destination_lng: String(req.destination_lng),
                        destination_label: req.destination_label,
                        date: dateStr,
                        time: timeStr,
                        seats: String(seatsNeeded),
                      }
                    });
                  };

                  return (
                    <View key={req.id} style={[styles.createRideCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
                        <Avatar
                          uri={req.commuter?.avatar_url}
                          name={req.commuter?.full_name || 'Commuter'}
                          size="md"
                          showBadge={req.commuter?.verified_badge}
                        />
                        <View style={styles.createRideInfo}>
                          <Text style={[styles.createRideTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', fontSize: 15 }]}>
                            {req.commuter?.full_name}
                          </Text>
                          
                          <Text style={[styles.createRideDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular', fontSize: 12 }]} numberOfLines={1}>
                            From: {req.origin_label.split(',')[0]}
                          </Text>
                          <Text style={[styles.createRideDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular', fontSize: 12 }]} numberOfLines={1}>
                            To: {req.destination_label.split(',')[0]}
                          </Text>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="people-outline" size={14} color={theme.colors.textMuted} />
                              <Text style={{ fontSize: 12, color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }}>
                                {seatsNeeded} seats
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
                              <Text style={{ fontSize: 12, color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }}>
                                {displayTime}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                      <Pressable 
                        style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                        onPress={handleOfferRide}
                      >
                        <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'Inter-SemiBold' }}>Offer Ride</Text>
                      </Pressable>
                    </View>
                  );
                })
              ) : (
                <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginBottom: 14 }}>
                  There are currently no active commuter requests.
                </Text>
              )}
            </>
          ) : (
            /* Commuter — Become a Driver Banner */
            <BecomeDriverBanner
              theme={theme}
              onPress={() => router.push('/(main)/settings/become-driver' as any)}
            />
          )
        )}
      </ScrollView>

      {/* ─── Commuter Request Modal ─── */}
      <Modal
        visible={showRequestModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRequestModal(false)}
      >
        <Pressable style={pickerStyles.backdrop} onPress={() => setShowRequestModal(false)}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={[pickerStyles.timeSheet, { backgroundColor: theme.colors.surface }]}
          >
            <Pressable onPress={() => {}} style={{ width: '100%' }}>
              {/* Handle bar */}
              <View style={pickerStyles.sheetHandle}>
                <View style={[pickerStyles.handleBar, { backgroundColor: theme.colors.border }]} />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 }}>
                <Text style={[pickerStyles.sheetTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', marginBottom: 0 }]}>
                  Ride Request Details
                </Text>
                <Pressable onPress={() => setShowRequestModal(false)} hitSlop={12}>
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
                        setShowRequestModal(false);
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

      {/* Date & Time Picker Sub-modals */}
      <DatePickerModal
        visible={showReqDatePicker}
        onClose={() => setShowReqDatePicker(false)}
        onSelect={setRequestDate}
        selectedDate={requestDate}
        theme={theme}
      />
      <TimePickerModal
        visible={showReqTimePicker}
        onClose={() => setShowReqTimePicker(false)}
        onSelect={setRequestTime}
        selectedTime={requestTime}
        theme={theme}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Segment control */
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Section subtitle */
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },

  /* ScrollView */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  /* Trip card */
  tripCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  tripDriverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  tripAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripAvatarText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  tripDriverInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  fareContainer: {
    alignItems: 'flex-end',
  },

  /* Route */
  routeRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  routeDots: {
    alignItems: 'center',
    width: 14,
    marginRight: 10,
    paddingTop: 2,
  },
  routeDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLine: {
    width: 2,
    flex: 1,
    marginVertical: 3,
  },
  routeDotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLabels: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 0,
    minHeight: 44,
  },

  /* Footer */
  tripFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  tripFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  bookBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
  },

  /* Create Ride Card */
  createRideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  createRideIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createRideInfo: {
    flex: 1,
    gap: 2,
  },
  createRideTitle: {
    fontSize: 16,
  },
  createRideDesc: {
    fontSize: 12,
    lineHeight: 17,
  },

  /* My Rides */
  myRidesTitle: {
    fontSize: 17,
  },
  badgeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
  },

  /* Become Driver Banner */
  driverBanner: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    marginTop: 20,
    gap: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 20,
    textAlign: 'center',
  },
  bannerDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  bannerButtonText: {
    color: '#fff',
    fontSize: 15,
  },

  /* Active Route Card */
  activeRouteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  activeRouteDots: {
    alignItems: 'center',
    width: 10,
  },
  activeRouteInfo: {
    flex: 1,
    gap: 1,
  },

  /* Set Route Card */
  setRouteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  setRouteInfo: {
    flex: 1,
    gap: 2,
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
  requestStatusCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 8,
  },
  requestIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalSectionTitle: {
    fontSize: 15,
    marginTop: 12,
  },
  routeSummaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
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
});

const pickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '88%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
  },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calTitle: { fontSize: 17 },
  calRow: { flexDirection: 'row' },
  calCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 40 },
  calDayLabel: { fontSize: 12 },
  calDayNum: { fontSize: 15 },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  timeSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '60%',
    paddingBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 12,
  },
  sheetHandle: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  sheetTitle: { fontSize: 17, textAlign: 'center', marginBottom: 12 },
});
