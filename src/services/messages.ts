import { supabase } from '@/lib/supabase';
import { Message, MessageWithSender } from '@/types/database';
import { sendPushNotification } from './pushNotifications';

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
    // Notify other members of the chat
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
          const notificationTitle = isAlert ? `🚨 Alert from ${senderName}` : `New message from ${senderName}`;
          
          profilesData.forEach((user: any) => {
            if (user.push_token) {
              sendPushNotification(user.push_token, notificationTitle, content, { type: 'chat', chatRoomId }, user.id);
            }
          });
        }
      }
    }
  }

  return { data: data as Message | null, error: error as Error | null };
}

/** Get messages for a chat room */
export async function getMessages(
  chatRoomId: string,
  limit: number = 50,
  offset: number = 0
): Promise<MessageWithSender[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(`*, sender:profiles!messages_sender_id_fkey(*)`)
    .eq('chat_room_id', chatRoomId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data || []) as MessageWithSender[];
}
