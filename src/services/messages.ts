import { supabase } from '@/lib/supabase';
import { Message, MessageWithSender } from '@/types/database';

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
    .select()
    .single();
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
