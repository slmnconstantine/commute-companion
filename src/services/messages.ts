import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Message, MessageWithSender } from '@/types/database';
import { sendPushNotification } from './pushNotifications';
import { LIVE_FACE_PREFIX } from './liveFaceVerification';

const CHAT_CACHE_KEY_PREFIX = '@chat_cache_msgs_';
const memoryMessageCache: Record<string, MessageWithSender[]> = {};

/** Synchronously retrieve cached messages from in-memory cache */
export function getMemoryCachedMessages(chatRoomId: string): MessageWithSender[] | null {
  return memoryMessageCache[chatRoomId] || null;
}

/** Retrieve cached messages from memory or AsyncStorage */
export async function getCachedMessages(chatRoomId: string): Promise<MessageWithSender[]> {
  if (memoryMessageCache[chatRoomId]?.length) {
    return memoryMessageCache[chatRoomId];
  }
  try {
    const raw = await AsyncStorage.getItem(`${CHAT_CACHE_KEY_PREFIX}${chatRoomId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryMessageCache[chatRoomId] = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read messages from cache:', e);
  }
  return [];
}

/** Persist messages to memory and AsyncStorage */
export async function saveCachedMessages(chatRoomId: string, messages: MessageWithSender[]): Promise<void> {
  const cleanMsgs = messages.filter(m => !m.content?.startsWith(LIVE_FACE_PREFIX));
  memoryMessageCache[chatRoomId] = cleanMsgs;
  try {
    await AsyncStorage.setItem(
      `${CHAT_CACHE_KEY_PREFIX}${chatRoomId}`,
      JSON.stringify(cleanMsgs.slice(-100))
    );
  } catch (e) {
    console.warn('Failed to save messages to cache:', e);
  }
}

/** Send a message */
export async function sendMessage(
  chatRoomId: string,
  senderId: string,
  content: string,
  isAlert: boolean = false
): Promise<{ data: Message | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ chat_room_id: chatRoomId, sender_id: senderId, content, is_alert: isAlert })
    .select('*, sender:profiles!messages_sender_id_fkey(full_name)')
    .single();

  if (data && !error) {
    // Notify other members of the chat asynchronously in background so sending returns instantly
    (async () => {
      try {
        const { data: membersData } = await supabase
          .from('chat_members')
          .select('user_id')
          .eq('chat_room_id', chatRoomId);
          
        if (membersData && membersData.length > 0) {
          const userIds = membersData.map(m => m.user_id).filter(id => id !== senderId);
          
          if (userIds.length > 0) {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, push_token')
              .in('id', userIds);
              
            if (profilesData) {
              const senderName = (data.sender as any)?.full_name || 'Someone';
              const notificationTitle = isAlert ? `Alert from ${senderName}` : `New message from ${senderName}`;
              
              profilesData.forEach((user: any) => {
                sendPushNotification(user.push_token, notificationTitle, content, { type: 'chat', chatRoomId }, user.id);
              });
            }
          }
        }
      } catch (err) {
        console.warn('Background push notification error:', err);
      }
    })();
  }

  return { data: data as Message | null, error: error as Error | null };
}

/** Get messages for a chat room (excludes massive live face verification payloads at database level for sub-100ms load times) */
export async function getMessages(
  chatRoomId: string,
  limit: number = 50,
  offset: number = 0
): Promise<MessageWithSender[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(`*, sender:profiles!messages_sender_id_fkey(*)`)
    .eq('chat_room_id', chatRoomId)
    .not('content', 'like', `${LIVE_FACE_PREFIX}%`)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  const msgs = (data || []) as MessageWithSender[];
  if (msgs.length > 0 && offset === 0) {
    saveCachedMessages(chatRoomId, msgs).catch(() => {});
  }
  return msgs;
}
