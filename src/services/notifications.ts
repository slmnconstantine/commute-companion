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

export async function getUserNotifications(userId: string): Promise<AppNotification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as AppNotification[];
  } catch (err) {
    handleServiceError('Failed to load notifications', err);
    return [];
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  } catch (err) {
    console.error('Failed to mark all notifications as read:', err);
  }
}

export async function deleteNotification(id: string): Promise<void> {
  try {
    await supabase.from('notifications').delete().eq('id', id);
  } catch (err) {
    console.error('Failed to delete notification:', err);
  }
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  try {
    await supabase.from('notifications').delete().eq('user_id', userId);
  } catch (err) {
    console.error('Failed to clear notifications:', err);
  }
}

export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: string,
  data?: any
): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      body,
      type,
      data: data || {},
    });
  } catch (err) {
    console.error('Failed to create in-app notification:', err);
  }
}
