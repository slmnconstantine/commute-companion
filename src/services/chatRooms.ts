import { supabase } from '@/lib/supabase';
import { ChatRoom, MessageWithSender } from '@/types/database';

/** Get chat room for a trip (without creating) */
export async function getChatRoom(tripId: string, type: string = 'group'): Promise<ChatRoom | null> {
  const { data } = await supabase
    .from('chat_rooms')
    .select('*')
    .eq('trip_id', tripId)
    .eq('type', type)
    .single();
  return data as ChatRoom | null;
}

/** Get or create chat room for a trip */
export async function getOrCreateChatRoom(tripId: string, type: string = 'group'): Promise<ChatRoom | null> {
  // Try to get existing
  const { data: existing, error: selectError } = await supabase
    .from('chat_rooms')
    .select('*')
    .eq('trip_id', tripId)
    .eq('type', type)
    .single();
    
  if (existing) return existing as ChatRoom;

  // Create new
  const { data, error } = await supabase
    .from('chat_rooms')
    .insert({ trip_id: tripId, type })
    .select()
    .single();
    
  if (error) {
    throw new Error(`DB Error: ${error.message} (Code: ${error.code})`);
  }
  return data as ChatRoom;
}

/** Join a chat room */
export async function joinChatRoom(chatRoomId: string, userId: string): Promise<void> {
  await supabase.from('chat_members').upsert({ chat_room_id: chatRoomId, user_id: userId });
}

/** Get user's chat rooms */
export async function getUserChatRooms(userId: string): Promise<ChatRoom[]> {
  const { data, error } = await supabase
    .from('chat_members')
    .select(`chat_room:chat_rooms(*)`)
    .eq('user_id', userId);
  if (error) throw error;
  return (data?.map((d: any) => d.chat_room) || []) as ChatRoom[];
}
