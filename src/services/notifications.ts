import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { handleServiceError } from '@/utils/errorHelper';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  data: any;
  created_at: string;
}

const getStorageKey = (userId: string) => `@app_notifications_${userId}`;

/** Get notifications cached locally in AsyncStorage */
async function getLocalNotifications(userId: string): Promise<AppNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    return JSON.parse(raw) as AppNotification[];
  } catch (e) {
    return [];
  }
}

/** Save notifications to local AsyncStorage cache */
async function saveLocalNotifications(userId: string, notifs: AppNotification[]): Promise<void> {
  try {
    await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(notifs.slice(0, 100)));
  } catch (e) {
    console.warn('Failed to save notifications to AsyncStorage:', e);
  }
}

/** Get all notifications for user, merging remote Supabase and local cache */
export async function getUserNotifications(userId: string): Promise<AppNotification[]> {
  const localList = await getLocalNotifications(userId);

  try {
    const { data: remoteData, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && remoteData) {
      const remoteList = remoteData as AppNotification[];
      
      // Merge remote and local without duplicates
      const seenIds = new Set(remoteList.map((n) => n.id));
      const merged = [...remoteList];

      for (const localNotif of localList) {
        if (!seenIds.has(localNotif.id)) {
          // Check if there is an equivalent remote item created within 10s
          const isDuplicate = remoteList.some(
            (r) =>
              r.title === localNotif.title &&
              r.body === localNotif.body &&
              Math.abs(new Date(r.created_at).getTime() - new Date(localNotif.created_at).getTime()) < 10000
          );
          if (!isDuplicate) {
            seenIds.add(localNotif.id);
            merged.push(localNotif);
          }
        }
      }

      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      await saveLocalNotifications(userId, merged);
      return merged;
    }
  } catch (err) {
    handleServiceError('Failed to load notifications from database', err);
  }

  // Fallback to local notifications if Supabase fails or is offline
  return localList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/** Get total unread notifications count for badge */
export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  try {
    const notifs = await getUserNotifications(userId);
    return notifs.filter((n) => !n.read).length;
  } catch (e) {
    return 0;
  }
}

export async function markNotificationAsRead(id: string, userId?: string): Promise<void> {
  try {
    // 1. Update Supabase if not a local temp ID
    if (!id.startsWith('local_')) {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    }
  } catch (err) {
    console.warn('Failed to mark notification as read in database:', err);
  }

  // 2. Update local storage
  try {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (targetUserId) {
      const list = await getLocalNotifications(targetUserId);
      const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
      await saveLocalNotifications(targetUserId, updated);
    }
  } catch (err) {
    console.warn('Failed to update local read state:', err);
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  } catch (err) {
    console.warn('Failed to mark all as read in database:', err);
  }

  try {
    const list = await getLocalNotifications(userId);
    const updated = list.map((n) => ({ ...n, read: true }));
    await saveLocalNotifications(userId, updated);
  } catch (err) {
    console.warn('Failed to mark all as read locally:', err);
  }
}

export async function deleteNotification(id: string, userId?: string): Promise<void> {
  try {
    if (!id.startsWith('local_')) {
      await supabase.from('notifications').delete().eq('id', id);
    }
  } catch (err) {
    console.warn('Failed to delete notification in database:', err);
  }

  try {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (targetUserId) {
      const list = await getLocalNotifications(targetUserId);
      const updated = list.filter((n) => n.id !== id);
      await saveLocalNotifications(targetUserId, updated);
    }
  } catch (err) {
    console.warn('Failed to delete notification locally:', err);
  }
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  try {
    await supabase.from('notifications').delete().eq('user_id', userId);
  } catch (err) {
    console.warn('Failed to clear notifications in database:', err);
  }

  try {
    await AsyncStorage.removeItem(getStorageKey(userId));
  } catch (err) {
    console.warn('Failed to clear local notifications:', err);
  }
}

/** Create in-app notification: persists locally immediately and attempts DB insert */
export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: string,
  data?: any
): Promise<AppNotification> {
  const localNotif: AppNotification = {
    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user_id: userId,
    title,
    body,
    type,
    read: false,
    data: data || {},
    created_at: new Date().toISOString(),
  };

  // 1. Immediately save to local AsyncStorage
  try {
    const current = await getLocalNotifications(userId);
    // Prevent duplicate entries for the same title & body within 5 seconds
    const isRecentDuplicate = current.slice(0, 5).some(
      (n) => n.title === title && n.body === body && Math.abs(Date.now() - new Date(n.created_at).getTime()) < 5000
    );
    if (!isRecentDuplicate) {
      await saveLocalNotifications(userId, [localNotif, ...current]);
    }
  } catch (e) {
    console.warn('Failed to save local notification:', e);
  }

  // 2. Attempt remote insert into Supabase notifications table
  try {
    const { data: inserted, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        body,
        type,
        data: data || {},
      })
      .select()
      .single();

    if (!error && inserted) {
      // Replace temporary local ID with database ID
      const list = await getLocalNotifications(userId);
      const updated = list.map((n) => (n.id === localNotif.id ? (inserted as AppNotification) : n));
      await saveLocalNotifications(userId, updated);
      return inserted as AppNotification;
    }
  } catch (err) {
    // If Supabase RLS rejects insert from third party, local notification is already preserved!
  }

  return localNotif;
}
