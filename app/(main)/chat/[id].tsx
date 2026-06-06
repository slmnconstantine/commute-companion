import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { MessageWithSender } from '@/types/database';
import { getMessages, sendMessage } from '@/services/messages';
import { supabase } from '@/lib/supabase';
import { formatMessageTime } from '@/utils/dateFormatter';
import Avatar from '@/components/common/Avatar';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { profile } = useAuth();

  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`chat:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_room_id=eq.${id}` },
        async (payload) => {
          // Fetch the full message with sender
          const { data } = await supabase
            .from('messages')
            .select('*, sender:profiles!sender_id(*)')
            .eq('id', payload.new.id)
            .single();
          if (data) {
            setMessages((prev) => [...prev, data as MessageWithSender]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const loadMessages = async () => {
    if (!id) return;
    try {
      const data = await getMessages(id);
      setMessages(data);
    } catch (e) {
      console.error('Failed to load messages:', e);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !profile || !id) return;
    setSending(true);
    try {
      await sendMessage(id, profile.id, newMessage.trim());
      setNewMessage('');
    } catch (e) {
      console.error('Failed to send message:', e);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: MessageWithSender }) => {
    const isOwn = item.sender_id === profile?.id;
    return (
      <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
        {!isOwn && (
          <Avatar uri={item.sender?.avatar_url} name={item.sender?.full_name || ''} size="sm" />
        )}
        <View style={[
          styles.bubble,
          isOwn ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
          item.is_alert && { backgroundColor: `${theme.colors.accent}20`, borderColor: theme.colors.accent, borderWidth: 1 },
        ]}>
          {!isOwn && (
            <Text style={[styles.senderName, { color: theme.colors.primary, fontFamily: 'Inter-SemiBold' }]}>
              {item.sender?.full_name}
            </Text>
          )}
          {item.is_alert && (
            <View style={styles.alertRow}>
              <Ionicons name="warning" size={14} color={theme.colors.accent} />
              <Text style={[styles.alertLabel, { color: theme.colors.accent, fontFamily: 'Inter-SemiBold' }]}>Alert</Text>
            </View>
          )}
          <Text style={[styles.messageText, { color: isOwn ? '#fff' : theme.colors.text, fontFamily: 'Inter-Regular' }]}>
            {item.content}
          </Text>
          <Text style={[styles.timeText, { color: isOwn ? 'rgba(255,255,255,0.7)' : theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            {formatMessageTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Chat</Text>
        <View style={styles.headerBtn} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <View style={[styles.inputBar, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 8, borderTopColor: theme.colors.border }]}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.textInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text, fontFamily: 'Inter-Regular' }]}
          multiline
        />
        <Pressable
          style={[styles.sendBtn, { backgroundColor: theme.colors.primary, opacity: !newMessage.trim() || sending ? 0.5 : 1 }]}
          onPress={handleSend}
          disabled={!newMessage.trim() || sending}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17 },
  messagesList: { padding: 16, gap: 12 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '80%' },
  messageRowOwn: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  bubble: { borderRadius: 18, padding: 12, paddingHorizontal: 16, maxWidth: '100%' },
  senderName: { fontSize: 12, marginBottom: 4 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  alertLabel: { fontSize: 11 },
  messageText: { fontSize: 15, lineHeight: 22 },
  timeText: { fontSize: 11, marginTop: 4, alignSelf: 'flex-end' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, gap: 10 },
  textInput: { flex: 1, borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
