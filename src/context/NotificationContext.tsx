import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import * as Notifications from 'expo-notifications';
import { Alert, Animated, StyleSheet, Pressable, View, Text } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationContextType {
  driverPendingCount: number;
  commuterUpcomingCount: number;
  refreshCounts: () => Promise<void>;
  showInAppNotification: (title: string, body: string, data?: any) => void;
  // Alert preference states
  pushEnabled: boolean;
  rideAlerts: boolean;
  chatAlerts: boolean;
  soundEnabled: boolean;
  emailAlerts: boolean;
  // State setters
  setPushEnabled: (val: boolean) => Promise<void>;
  setRideAlerts: (val: boolean) => Promise<void>;
  setChatAlerts: (val: boolean) => Promise<void>;
  setSoundEnabled: (val: boolean) => Promise<void>;
  setEmailAlerts: (val: boolean) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const [driverPendingCount, setDriverPendingCount] = useState(0);
  const [commuterUpcomingCount, setCommuterUpcomingCount] = useState(0);

  // In-app notification state
  const [activeNotification, setActiveNotification] = useState<{
    title: string;
    body: string;
    data?: any;
  } | null>(null);

  // Center popup notification state
  const [centerPopupNotification, setCenterPopupNotification] = useState<{
    title: string;
    body: string;
    tripId?: string;
  } | null>(null);

  const popupScaleAnim = useRef(new Animated.Value(0)).current;

  // Preference states
  const [pushEnabled, _setPushEnabled] = useState(true);
  const [rideAlerts, _setRideAlerts] = useState(true);
  const [chatAlerts, _setChatAlerts] = useState(true);
  const [soundEnabled, _setSoundEnabled] = useState(true);
  const [emailAlerts, _setEmailAlerts] = useState(false);

  const slideAnim = useRef(new Animated.Value(-200)).current;

  // Sync preference values to refs to avoid stale enclosures inside event listeners
  const prefsRef = useRef({ pushEnabled, rideAlerts, chatAlerts });
  useEffect(() => {
    prefsRef.current = { pushEnabled, rideAlerts, chatAlerts };
  }, [pushEnabled, rideAlerts, chatAlerts]);

  // Load preferences from AsyncStorage on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const storedPush = await AsyncStorage.getItem('@notif_push_enabled');
        const storedRide = await AsyncStorage.getItem('@notif_ride_enabled');
        const storedChat = await AsyncStorage.getItem('@notif_chat_enabled');
        const storedSound = await AsyncStorage.getItem('@notif_sound_enabled');
        const storedEmail = await AsyncStorage.getItem('@notif_email_enabled');

        if (storedPush !== null) _setPushEnabled(JSON.parse(storedPush));
        if (storedRide !== null) _setRideAlerts(JSON.parse(storedRide));
        if (storedChat !== null) _setChatAlerts(JSON.parse(storedChat));
        if (storedSound !== null) _setSoundEnabled(JSON.parse(storedSound));
        if (storedEmail !== null) _setEmailAlerts(JSON.parse(storedEmail));
      } catch (err) {
        console.error('Error loading notification preferences', err);
      }
    };
    loadPreferences();
  }, []);

  // Setters that persist preferences
  const setPushEnabled = async (val: boolean) => {
    _setPushEnabled(val);
    await AsyncStorage.setItem('@notif_push_enabled', JSON.stringify(val));
  };
  const setRideAlerts = async (val: boolean) => {
    _setRideAlerts(val);
    await AsyncStorage.setItem('@notif_ride_enabled', JSON.stringify(val));
  };
  const setChatAlerts = async (val: boolean) => {
    _setChatAlerts(val);
    await AsyncStorage.setItem('@notif_chat_enabled', JSON.stringify(val));
  };
  const setSoundEnabled = async (val: boolean) => {
    _setSoundEnabled(val);
    await AsyncStorage.setItem('@notif_sound_enabled', JSON.stringify(val));
  };
  const setEmailAlerts = async (val: boolean) => {
    _setEmailAlerts(val);
    await AsyncStorage.setItem('@notif_email_enabled', JSON.stringify(val));
  };

  // Configure Expo Notification Handler dynamically based on settings
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: false,
        shouldShowBanner: false,
        shouldShowList: pushEnabled,
        shouldPlaySound: soundEnabled,
        shouldSetBadge: pushEnabled,
      }),
    });
  }, [pushEnabled, soundEnabled]);

  const showInAppNotification = (title: string, body: string, data?: any) => {
    // Also enforce preferences for programmatically shown alerts
    const { pushEnabled: push, rideAlerts: ride, chatAlerts: chat } = prefsRef.current;
    if (!push) return;
    if (data) {
      if ((data.type === 'ride_matched' || data.type === 'trip_update') && !ride) return;
      if ((data.type === 'chat' || data.type === 'new_message') && !chat) return;
    }

    if (data && data.type === 'ride_matched') {
      setCenterPopupNotification({
        title,
        body,
        tripId: data.tripId,
      });
    } else {
      setActiveNotification({ title, body, data });
    }
  };

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -200,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      setActiveNotification(null);
    });
  };

  useEffect(() => {
    if (centerPopupNotification) {
      Animated.spring(popupScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 7,
      }).start();
    } else {
      popupScaleAnim.setValue(0);
    }
  }, [centerPopupNotification]);

  const handleDismissPopup = () => {
    Animated.timing(popupScaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setCenterPopupNotification(null);
    });
  };

  useEffect(() => {
    if (activeNotification) {
      // Slide down
      Animated.spring(slideAnim, {
        toValue: 60, // position from top
        useNativeDriver: true,
        tension: 40,
        friction: 8,
      }).start();

      // Auto dismiss after 6 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [activeNotification]);

  const refreshCounts = async () => {
    if (!profile?.id) {
      setDriverPendingCount(0);
      setCommuterUpcomingCount(0);
      return;
    }

    try {
      // 1. Fetch driver pending count (bookings on trips they posted)
      if (profile.role === 'driver') {
        const { count, error } = await supabase
          .from('bookings')
          .select('id, trips!inner(driver_id)', { count: 'exact', head: true })
          .eq('status', 'pending')
          .eq('trips.driver_id', profile.id);
        
        if (!error && count !== null) {
          setDriverPendingCount(count);
        }
      }

      // 2. Fetch commuter upcoming count (their bookings that are accepted or pending, with a valid trip)
      const { count: commuterCount, error: commuterError } = await supabase
        .from('bookings')
        .select('id, trips!inner(id)', { count: 'exact', head: true })
        .eq('commuter_id', profile.id)
        .in('status', ['pending', 'accepted']);

      if (!commuterError && commuterCount !== null) {
        setCommuterUpcomingCount(commuterCount);
      }
    } catch (err) {
      console.error('Error fetching notification counts', err);
    }
  };

  useEffect(() => {
    refreshCounts();

    if (!profile?.id) return;

    // Listen to real-time changes on the bookings table
    const channelName = `bookings_changes_${profile.id}_${Date.now()}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          // When any booking changes, re-fetch counts
          refreshCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [profile?.id, profile?.role]);

  // Push notifications foreground/background click handling
  useEffect(() => {
    if (!profile?.id) return;

    // 1. Foreground Notification Listener: Trigger custom sliding in-app banner
    const foregroundSub = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content;
      console.log('[PUSH] Received in-app match notification:', title, body, data);
      
      const { pushEnabled: push, rideAlerts: ride, chatAlerts: chat } = prefsRef.current;
      if (!push) {
        console.log('[PUSH] Suppressed in foreground: pushEnabled is false');
        return;
      }
      if (data) {
        if ((data.type === 'ride_matched' || data.type === 'trip_update') && !ride) {
          console.log('[PUSH] Suppressed in foreground: rideAlerts is false');
          return;
        }
        if ((data.type === 'chat' || data.type === 'new_message') && !chat) {
          console.log('[PUSH] Suppressed in foreground: chatAlerts is false');
          return;
        }
      }

      showInAppNotification(
        title || 'Notification Received',
        body || '',
        data
      );
    });

    // 2. Background Tap Listener: Auto-route to the matching ride page or chatroom
    const backgroundSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const { data } = response.notification.request.content;
      console.log('[PUSH] User tapped background notification:', data);

      if (data) {
        if (data.chatRoomId && data.type === 'chat') {
          router.push(`/(main)/chat/${data.chatRoomId}` as any);
        } else if (data.tripId) {
          if (data.type === 'ride_matched' || data.type === 'trip_update') {
            router.push(`/(main)/ride/${data.tripId}` as any);
          }
        }
      }
    });

    return () => {
      foregroundSub.remove();
      backgroundSub.remove();
    };
  }, [profile?.id]);

  const handleBannerPress = () => {
    if (!activeNotification) return;
    const { data } = activeNotification;
    if (data) {
      if (data.type === 'chat' && data.chatRoomId) {
        router.push(`/(main)/chat/${data.chatRoomId}` as any);
      } else if (data.tripId) {
        router.push(`/(main)/ride/${data.tripId}` as any);
      }
    }
    handleDismiss();
  };

  return (
    <NotificationContext.Provider
      value={{
        driverPendingCount,
        commuterUpcomingCount,
        refreshCounts,
        showInAppNotification,
        pushEnabled,
        rideAlerts,
        chatAlerts,
        soundEnabled,
        emailAlerts,
        setPushEnabled,
        setRideAlerts,
        setChatAlerts,
        setSoundEnabled,
        setEmailAlerts,
      }}
    >
      {children}
      {activeNotification && (
        <Animated.View
          style={[
            styles.bannerContainer,
            {
              transform: [{ translateY: slideAnim }],
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
            },
          ]}
        >
          <Pressable onPress={handleBannerPress}>
            <View style={styles.bannerRow}>
              <View style={[styles.iconBox, { backgroundColor: `${theme.colors.primary}15` }]}>
                <Ionicons
                  name={
                    activeNotification.data?.type === 'chat'
                      ? 'chatbubbles'
                      : activeNotification.data?.type === 'ride_matched'
                      ? 'car-sport'
                      : 'notifications'
                  }
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.textContainer}>
                <Text
                  style={[
                    theme.typography.body,
                    { color: theme.colors.text, fontFamily: 'Inter-SemiBold' },
                  ]}
                  numberOfLines={1}
                >
                  {activeNotification.title}
                </Text>
                <Text
                  style={[
                    theme.typography.small,
                    { color: theme.colors.textMuted },
                  ]}
                  numberOfLines={2}
                >
                  {activeNotification.body}
                </Text>
              </View>
            </View>
          </Pressable>
          <View style={[styles.btnRow, { borderTopColor: theme.colors.border }]}>
            <Pressable
              style={[styles.bannerBtn, { backgroundColor: `${theme.colors.textMuted}15` }]}
              onPress={handleDismiss}
            >
              <Text style={[styles.bannerBtnText, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>
                Dismiss
              </Text>
            </Pressable>
            {activeNotification.data?.chatRoomId && (
              <Pressable
                style={[styles.bannerBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  router.push(`/(main)/chat/${activeNotification.data.chatRoomId}` as any);
                  handleDismiss();
                }}
              >
                <Text style={[styles.bannerBtnText, { color: theme.colors.white, fontFamily: 'Inter-SemiBold' }]}>
                  Open Chat
                </Text>
              </Pressable>
            )}
            {activeNotification.data?.tripId && !activeNotification.data?.chatRoomId && (
              <Pressable
                style={[styles.bannerBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  router.push(`/(main)/ride/${activeNotification.data.tripId}` as any);
                  handleDismiss();
                }}
              >
                <Text style={[styles.bannerBtnText, { color: theme.colors.white, fontFamily: 'Inter-SemiBold' }]}>
                  View Details
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}
      {centerPopupNotification && (
        <View style={styles.popupOverlay}>
          <Animated.View
            style={[
              styles.popupCard,
              {
                transform: [{ scale: popupScaleAnim }],
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                shadowColor: theme.colors.shadow,
              },
            ]}
          >
            <View style={[styles.popupIconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
              <Ionicons name="car-sport-outline" size={32} color={theme.colors.primary} />
            </View>
            <Text
              style={[
                theme.typography.heading,
                styles.popupTitle,
                { color: theme.colors.text, fontFamily: 'Inter-SemiBold' },
              ]}
            >
              {centerPopupNotification.title}
            </Text>
            <Text
              style={[
                theme.typography.body,
                styles.popupBody,
                { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' },
              ]}
            >
              {centerPopupNotification.body}
            </Text>
            <View style={styles.popupBtnRow}>
              <Pressable
                style={[styles.popupBtn, { backgroundColor: `${theme.colors.textMuted}15` }]}
                onPress={handleDismissPopup}
              >
                <Text
                  style={[
                    styles.popupBtnText,
                    { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' },
                  ]}
                >
                  Dismiss
                </Text>
              </Pressable>
              {centerPopupNotification.tripId && (
                <Pressable
                  style={[styles.popupBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={() => {
                    router.push(`/(main)/ride/${centerPopupNotification.tripId}` as any);
                    handleDismissPopup();
                  }}
                >
                  <Text
                    style={[
                      styles.popupBtnText,
                      { color: theme.colors.white, fontFamily: 'Inter-SemiBold' },
                    ]}
                  >
                    Check Details
                  </Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        </View>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  bannerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  bannerBtnText: {
    fontSize: 12,
  },
  popupOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    padding: 24,
  },
  popupCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  popupIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  popupTitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
  popupBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  popupBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  popupBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupBtnText: {
    fontSize: 14,
  },
});
