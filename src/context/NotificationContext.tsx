import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

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
