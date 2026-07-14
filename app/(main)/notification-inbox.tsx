import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, AppNotification } from '@/services/notifications';

export default function NotificationInboxScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await getUserNotifications(profile.id);
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: AppNotification) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
    }

    // Navigate based on type
    if (notification.type === 'booking' || notification.type === 'booking_update') {
      if (notification.data?.bookingId) {
        // Find if driver or commuter and navigate to appropriate tab
        router.push('/(main)/(tabs)/rides');
      }
    } else if (notification.type === 'passenger_arrival' || notification.type === 'driver_arrival') {
      // Typically these are handled in-ride, so we could just go to rides tab
      router.push('/(main)/(tabs)/rides');
    }
  };

  const handleMarkAllRead = async () => {
    if (!profile) return;
    await markAllNotificationsAsRead(profile.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'booking': return 'car';
      case 'booking_update': return 'checkmark-circle';
      case 'passenger_arrival': return 'walk';
      case 'driver_arrival': return 'car-sport';
      case 'ride_reminder': return 'time';
      default: return 'notifications';
    }
  };

  const hasUnread = notifications.some(n => !n.read);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Notifications</Text>
        <Pressable onPress={handleMarkAllRead} style={styles.markReadBtn} disabled={!hasUnread || loading}>
          <Ionicons name="checkmark-done" size={24} color={hasUnread ? theme.colors.primary : theme.colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {loading ? (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Loading...</Text>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color={theme.colors.textMuted} />
            <Text style={[styles.emptyText, { color: theme.colors.textMuted, marginTop: 12 }]}>No notifications yet.</Text>
          </View>
        ) : (
          notifications.map(notification => (
            <Pressable
              key={notification.id}
              style={[
                styles.notificationCard,
                { backgroundColor: notification.read ? theme.colors.surface : theme.colors.primary + '10', borderColor: theme.colors.border }
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name={getIconForType(notification.type)} size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.contentContainer}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, { color: theme.colors.text, fontFamily: notification.read ? 'Inter-Medium' : 'Inter-Bold' }]} numberOfLines={1}>
                    {notification.title}
                  </Text>
                  <Text style={[styles.time, { color: theme.colors.textMuted }]}>
                    {getRelativeTime(notification.created_at)}
                  </Text>
                </View>
                <Text style={[styles.body, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]} numberOfLines={2}>
                  {notification.body}
                </Text>
              </View>
              {!notification.read && <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />}
            </Pressable>
          ))
        )}
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
  markReadBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18 },
  scrollContent: { padding: 16, gap: 12 },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 15, flex: 1 },
  time: { fontSize: 12 },
  body: { fontSize: 14, lineHeight: 20 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
