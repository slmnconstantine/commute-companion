import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';
import { router } from 'expo-router';

interface NotificationContextType {
  driverPendingCount: number;
  commuterUpcomingCount: number;
  refreshCounts: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [driverPendingCount, setDriverPendingCount] = useState(0);
  const [commuterUpcomingCount, setCommuterUpcomingCount] = useState(0);

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
          // When any booking changes, re-fetch counts (simplest reliable approach)
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

    // 1. Foreground Notification Listener: Trigger custom Alert popup
    const foregroundSub = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content;
      console.log('[PUSH] Received in-app match notification:', title, body, data);

      if (data && data.type === 'ride_matched') {
        Alert.alert(
          title || 'Ride Matched! 🚗',
          body || 'A driver has offered a ride matching your requested route.',
          [
            {
              text: 'View Ride',
              onPress: () => {
                if (data.tripId) {
                  router.push(`/(main)/ride/${data.tripId}` as any);
                }
              }
            },
            {
              text: 'Dismiss',
              style: 'cancel'
            }
          ]
        );
      }
    });

    // 2. Background Tap Listener: Auto-route to the matching ride page
    const backgroundSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const { data } = response.notification.request.content;
      console.log('[PUSH] User tapped background notification:', data);

      if (data && data.tripId) {
        if (data.type === 'ride_matched' || data.type === 'trip_update') {
          router.push(`/(main)/ride/${data.tripId}` as any);
        }
      }
    });

    return () => {
      foregroundSub.remove();
      backgroundSub.remove();
    };
  }, [profile?.id]);

  return (
    <NotificationContext.Provider
      value={{
        driverPendingCount,
        commuterUpcomingCount,
        refreshCounts,
      }}
    >
      {children}
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
