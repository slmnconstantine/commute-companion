import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Pressable, KeyboardAvoidingView, Platform, Animated } from 'react-native';
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

// ── Date Separator Utility ────────────────────────────────────────────────────

function getMessageDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  return date.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

function shouldShowDateSeparator(messages: MessageWithSender[], index: number): boolean {
  if (index === 0) return true;
  const current = new Date(messages[index].created_at);
  const previous = new Date(messages[index - 1].created_at);
  return current.toDateString() !== previous.toDateString();
}

import { getChatRoomWithTrip } from '@/services/chatRooms';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const { profile } = useAuth();

  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [chatRoomData, setChatRoomData] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const sendScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!id) return;
    loadMessages();
    loadRoomDetails();

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
            setMessages((prev) => {
              if (prev.find(m => m.id === data.id)) return prev;
              return [...prev, data as MessageWithSender];
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const loadRoomDetails = async () => {
    if (!id) return;
    try {
      const room = await getChatRoomWithTrip(id);
      setChatRoomData(room);
    } catch (e) {
      console.error('Failed to load room details:', e);
    }
  };

  const loadMessages = async () => {
    if (!id) return;
    try {
      const msgs = await getMessages(id);
      setMessages(msgs);
    } catch (e) {
      console.error('Failed to load messages:', e);
    }
  };

  const isTripCompleted = chatRoomData?.trip?.status === 'completed';

  const completionRefTime = useMemo(() => {
    if (!chatRoomData?.trip) return 0;
    // Prefer completion alert message timestamp for accurate post-ride 24h calculation
    const completionAlert = messages.find(m => m.is_alert && m.content.includes('Ride Completed'));
    if (completionAlert) {
      return new Date(completionAlert.created_at).getTime();
    }
    const timeStr = chatRoomData.created_at || chatRoomData.trip.departure_time;
    return new Date(timeStr).getTime();
  }, [chatRoomData, messages]);

  const isChatExpired = useMemo(() => {
    if (!isTripCompleted || !completionRefTime) return false;
    return (Date.now() - completionRefTime) > (24 * 60 * 60 * 1000);
  }, [isTripCompleted, completionRefTime]);

  const hoursRemaining = useMemo(() => {
    if (!isTripCompleted || !completionRefTime || isChatExpired) return 0;
    const diffMs = (24 * 60 * 60 * 1000) - (Date.now() - completionRefTime);
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
  }, [isTripCompleted, completionRefTime, isChatExpired]);

  const handleSend = async () => {
    if (!newMessage.trim() || !id || !profile) return;
    const content = newMessage.trim();

    Animated.sequence([
      Animated.timing(sendScale, { toValue: 0.85, duration: 100, useNativeDriver: true }),
      Animated.spring(sendScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    setSending(true);
    try {
      const { data: sent, error } = await sendMessage(id, profile.id, content);
      if (sent && !error) {
        setMessages((prev) => {
          if (prev.find(m => m.id === sent.id)) return prev;
          return [...prev, { ...sent, sender: profile } as MessageWithSender];
        });
      }
      setNewMessage('');
    } catch (e) {
      console.error('Failed to send message:', e);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item, index }: { item: MessageWithSender; index: number }) => {
    const isOwn = item.sender_id === profile?.id;
    const isAlert = Boolean(item.is_alert);
    const showDate = shouldShowDateSeparator(messages, index);

    // Resolve bubble background and text colors
    const bubbleBg = isAlert
      ? (mode === 'dark' ? 'rgba(245, 158, 11, 0.18)' : '#FEF3C7')
      : isOwn
      ? theme.colors.primary
      : theme.colors.surface;

    const bubbleBorder = isAlert
      ? (mode === 'dark' ? 'rgba(245, 158, 11, 0.5)' : '#FCD34D')
      : isOwn
      ? 'transparent'
      : theme.colors.border;

    const textColor = isAlert
      ? (mode === 'dark' ? '#FEF3C7' : '#92400E')
      : isOwn
      ? '#FFFFFF'
      : theme.colors.text;

    const timeColor = isAlert
      ? (mode === 'dark' ? 'rgba(254, 243, 199, 0.7)' : '#B45309')
      : isOwn
      ? 'rgba(255, 255, 255, 0.75)'
      : theme.colors.textMuted;

    return (
      <>
        {showDate && (
          <View style={styles.dateSeparator}>
            <View style={[styles.dateLine, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.dateLabel, { color: theme.colors.textMuted, backgroundColor: theme.colors.background, fontFamily: 'Inter-Medium' }]}>
              {getMessageDateLabel(item.created_at)}
            </Text>
            <View style={[styles.dateLine, { backgroundColor: theme.colors.border }]} />
          </View>
        )}
        <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
          {!isOwn && (
            <Avatar uri={item.sender?.avatar_url} name={item.sender?.full_name || ''} size="sm" />
          )}
          <View
            style={[
              styles.bubble,
              {
                backgroundColor: bubbleBg,
                borderColor: bubbleBorder,
                borderWidth: isOwn && !isAlert ? 0 : 1,
              },
            ]}
          >
            {!isOwn && !isAlert && (
              <Text style={[styles.senderName, { color: theme.colors.primary, fontFamily: 'Inter-SemiBold' }]}>
                {item.sender?.full_name}
              </Text>
            )}
            {isAlert && (
              <View style={styles.alertRow}>
                <Ionicons name="warning" size={14} color="#D97706" />
                <Text style={[styles.alertLabel, { color: '#D97706', fontFamily: 'Inter-SemiBold' }]}>Alert</Text>
              </View>
            )}
            <Text style={[styles.messageText, { color: textColor, fontFamily: isAlert ? 'Inter-Medium' : 'Inter-Regular' }]}>
              {item.content}
            </Text>
            <Text style={[styles.timeText, { color: timeColor, fontFamily: 'Inter-Regular' }]}>
              {formatMessageTime(item.created_at)}
            </Text>
          </View>
        </View>
      </>
    );
  };

  const renderEmptyChat = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, { backgroundColor: `${theme.colors.primary}12` }]}>
        <Ionicons name="chatbubbles-outline" size={48} color={`${theme.colors.primary}60`} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
        No messages yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
        Start the conversation! Send a message{'\n'}to coordinate your trip.
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Chat</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]} numberOfLines={1}>
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      {/* 24-Hour Grace Period Banner for Completed Rides */}
      {isTripCompleted && (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: isChatExpired ? `${theme.colors.textMuted}15` : `${theme.colors.primary}18`,
              borderColor: isChatExpired ? theme.colors.border : `${theme.colors.primary}40`,
            },
          ]}
        >
          <Ionicons
            name={isChatExpired ? 'lock-closed' : 'time-outline'}
            size={16}
            color={isChatExpired ? theme.colors.textMuted : theme.colors.primary}
          />
          <Text
            style={[
              styles.bannerText,
              {
                color: isChatExpired ? theme.colors.textMuted : theme.colors.text,
                fontFamily: 'Inter-Medium',
              },
            ]}
          >
            {isChatExpired
              ? 'This group chat closed 24 hours after ride completion.'
              : `Ride Completed — Chat open for ${hoursRemaining}h more for lost items & concerns.`}
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.messagesList, messages.length === 0 && { flex: 1 }]}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={renderEmptyChat}
      />

      {isChatExpired ? (
        <View style={[styles.disabledInputBar, { backgroundColor: theme.colors.surface, paddingBottom: Math.max(insets.bottom, 12), borderTopColor: theme.colors.border }]}>
          <Ionicons name="lock-closed-outline" size={18} color={theme.colors.textMuted} />
          <Text style={[{ color: theme.colors.textMuted, fontFamily: 'Inter-Medium', fontSize: 13 }]}>
            Chat is closed (24h post-ride window expired)
          </Text>
        </View>
      ) : (
        <View style={[styles.inputBar, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 8, borderTopColor: theme.colors.border }]}>
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.textInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text, fontFamily: 'Inter-Regular' }]}
            multiline
          />
          <Animated.View style={{ transform: [{ scale: sendScale }] }}>
            <Pressable
              style={[styles.sendBtn, { backgroundColor: theme.colors.primary, opacity: !newMessage.trim() || sending ? 0.5 : 1 }]}
              onPress={handleSend}
              disabled={!newMessage.trim() || sending}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </Pressable>
          </Animated.View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17 },
  headerSubtitle: { fontSize: 11, marginTop: 1 },
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
  disabledInputBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 14, borderTopWidth: 1, gap: 8 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  bannerText: { fontSize: 12, flex: 1, lineHeight: 16 },
  textInput: { flex: 1, borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  /* Date separators */
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    gap: 12,
  },
  dateLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dateLabel: {
    fontSize: 11,
    paddingHorizontal: 8,
  },

  /* Empty state */
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
