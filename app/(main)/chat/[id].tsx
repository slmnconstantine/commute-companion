import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Pressable, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { MessageWithSender } from '@/types/database';
import { getMessages, sendMessage, getMemoryCachedMessages, getCachedMessages, saveCachedMessages } from '@/services/messages';
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
import { LIVE_FACE_PREFIX } from '@/services/liveFaceVerification';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const { profile } = useAuth();

  // Instant synchronous memory cache hydration (0ms delay if opened before)
  const [actualChatRoomId, setActualChatRoomId] = useState<string>(id || '');
  const [messages, setMessages] = useState<MessageWithSender[]>(() => {
    return (id ? getMemoryCachedMessages(id) : null) || [];
  });
  const [initialLoading, setInitialLoading] = useState<boolean>(() => {
    const cached = id ? getMemoryCachedMessages(id) : null;
    return !cached || cached.length === 0;
  });

  const [chatRoomData, setChatRoomData] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const sendScale = useRef(new Animated.Value(1)).current;
  const channelRef = useRef<any>(null);
  const profilesCacheRef = useRef<Record<string, any>>({});

  // Preload current user profile into sender cache
  useEffect(() => {
    if (profile?.id) {
      profilesCacheRef.current[profile.id] = profile;
    }
  }, [profile]);

  // Fast disk cache hydration & tripId to chatRoomId fallback resolution
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    // Fast-hydrate from disk cache if memory was empty
    getCachedMessages(id).then((cached) => {
      if (isMounted && cached.length > 0) {
        setMessages((prev) => (prev.length === 0 ? cached : prev));
        setInitialLoading(false);
      }
    });

    // Check if id was a trip_id instead of a chat_room_id
    getChatRoomWithTrip(id).then((room) => {
      if (isMounted && room?.id) {
        if (room.id !== id) {
          setActualChatRoomId(room.id);
          // Check cache for the resolved room id as well
          getCachedMessages(room.id).then((roomCached) => {
            if (isMounted && roomCached.length > 0) {
              setMessages((prev) => (prev.length === 0 ? roomCached : prev));
              setInitialLoading(false);
            }
          });
        }
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    const targetRoomId = actualChatRoomId || id;
    if (!targetRoomId) return;

    loadMessages(targetRoomId);
    loadRoomDetails(targetRoomId);

    // Clean up any stale channel before subscribing to prevent "cannot add callbacks after subscribe()"
    const existingChat = supabase.getChannels().find((c) => c.topic === `realtime:chat:${targetRoomId}`);
    if (existingChat) {
      supabase.removeChannel(existingChat);
      try {
        (supabase.realtime as any)._remove?.(existingChat);
      } catch {}
    }

    // High-performance Realtime: Broadcast (sub-50ms) + Postgres Changes (fallback)
    const channel = supabase
      .channel(`chat:${targetRoomId}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on(
        'broadcast',
        { event: 'new_message' },
        (event) => {
          const incomingMsg = event.payload as MessageWithSender;
          if (incomingMsg && incomingMsg.id && !incomingMsg.content?.startsWith(LIVE_FACE_PREFIX)) {
            if (incomingMsg.sender_id && incomingMsg.sender) {
              profilesCacheRef.current[incomingMsg.sender_id] = incomingMsg.sender;
            }
            setMessages((prev) => {
              if (
                prev.some(
                  (m) =>
                    m.id === incomingMsg.id ||
                    (m.sender_id === incomingMsg.sender_id &&
                      m.content === incomingMsg.content &&
                      Math.abs(new Date(m.created_at).getTime() - new Date(incomingMsg.created_at).getTime()) < 3000)
                )
              ) {
                return prev;
              }
              const updated = [...prev, incomingMsg];
              saveCachedMessages(targetRoomId, updated).catch(() => {});
              return updated;
            });
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 30);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_room_id=eq.${targetRoomId}` },
        async (payload) => {
          const newMsg = payload.new as any;
          if (!newMsg || newMsg.content?.startsWith(LIVE_FACE_PREFIX)) return;

          setMessages((prev) => {
            // If message already rendered (via broadcast or optimistic temp), update ID seamlessly
            const tempMatch = prev.find(
              (m) => m.id.startsWith('temp_') && m.sender_id === newMsg.sender_id && m.content === newMsg.content
            );
            if (tempMatch) {
              const updated = prev.map((m) =>
                m.id === tempMatch.id ? ({ ...m, id: newMsg.id, created_at: newMsg.created_at } as MessageWithSender) : m
              );
              saveCachedMessages(targetRoomId, updated).catch(() => {});
              return updated;
            }

            if (prev.some((m) => m.id === newMsg.id)) {
              return prev;
            }

            // Immediately display with cached sender profile (0ms delay)
            const cachedSender =
              profilesCacheRef.current[newMsg.sender_id] ||
              (newMsg.sender_id === profile?.id ? profile : { id: newMsg.sender_id, full_name: 'Member' });

            const updated = [...prev, { ...newMsg, sender: cachedSender } as MessageWithSender];
            saveCachedMessages(targetRoomId, updated).catch(() => {});
            return updated;
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 30);

          // If sender profile is unknown, fetch in background without delaying display
          if (!profilesCacheRef.current[newMsg.sender_id] && newMsg.sender_id !== profile?.id) {
            supabase
              .from('profiles')
              .select('*')
              .eq('id', newMsg.sender_id)
              .single()
              .then(({ data }) => {
                if (data) {
                  profilesCacheRef.current[newMsg.sender_id] = data;
                  setMessages((prev) => {
                    const updated = prev.map((m) =>
                      m.sender_id === newMsg.sender_id && (!m.sender || m.sender.full_name === 'Member')
                        ? { ...m, sender: data }
                        : m
                    );
                    saveCachedMessages(targetRoomId, updated).catch(() => {});
                    return updated;
                  });
                }
              });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      try {
        (supabase.realtime as any)._remove?.(channel);
      } catch {}
      channelRef.current = null;
    };
  }, [actualChatRoomId, id, profile?.id]);

  const loadRoomDetails = async (roomIdToUse: string) => {
    if (!roomIdToUse) return;
    try {
      const room = await getChatRoomWithTrip(roomIdToUse);
      setChatRoomData(room);
    } catch (e) {
      console.error('Failed to load room details:', e);
    }
  };

  const loadMessages = async (roomIdToUse: string) => {
    if (!roomIdToUse) return;
    try {
      const msgs = await getMessages(roomIdToUse);
      msgs.forEach((m) => {
        if (m.sender_id && m.sender) {
          profilesCacheRef.current[m.sender_id] = m.sender;
        }
      });
      const filtered = msgs.filter((m) => !m.content?.startsWith(LIVE_FACE_PREFIX));
      setMessages(filtered);
      saveCachedMessages(roomIdToUse, filtered).catch(() => {});
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 50);
    } catch (e) {
      console.error('Failed to load messages:', e);
    } finally {
      setInitialLoading(false);
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
    const targetRoomId = actualChatRoomId || id;
    if (!newMessage.trim() || !targetRoomId || !profile) return;
    const content = newMessage.trim();

    // 1. Immediately clear input so user can type next message right away
    setNewMessage('');

    // Micro-animation for send button
    Animated.sequence([
      Animated.timing(sendScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(sendScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    // 2. Optimistic UI: Display message instantly (0ms delay)
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const optimisticMsg: MessageWithSender = {
      id: tempId,
      chat_room_id: targetRoomId,
      sender_id: profile.id,
      content,
      is_alert: false,
      created_at: new Date().toISOString(),
      sender: profile,
    };

    setMessages((prev) => {
      const updated = [...prev, optimisticMsg];
      saveCachedMessages(targetRoomId, updated).catch(() => {});
      return updated;
    });
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 30);

    // 3. Ultra-fast Broadcast to peers over WebSocket (<50ms delivery)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'new_message',
      payload: optimisticMsg,
    });

    // 4. Persist to database in background
    try {
      const { data: sent, error } = await sendMessage(targetRoomId, profile.id, content);
      if (sent && !error) {
        setMessages((prev) => {
          const updated = prev.map((m) => (m.id === tempId ? ({ ...sent, sender: profile } as MessageWithSender) : m));
          saveCachedMessages(targetRoomId, updated).catch(() => {});
          return updated;
        });
      } else if (error) {
        // Rollback optimistic message if error occurred
        setMessages((prev) => {
          const updated = prev.filter((m) => m.id !== tempId);
          saveCachedMessages(targetRoomId, updated).catch(() => {});
          return updated;
        });
        setNewMessage(content);
      }
    } catch (e) {
      console.error('Failed to send message:', e);
      setMessages((prev) => {
        const updated = prev.filter((m) => m.id !== tempId);
        saveCachedMessages(targetRoomId, updated).catch(() => {});
        return updated;
      });
      setNewMessage(content);
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

  const renderEmptyOrLoading = () => {
    if (initialLoading && messages.length === 0) {
      return (
        <View style={styles.skeletonContainer}>
          <View style={[styles.skeletonBubble, styles.skeletonBubbleLeft, { backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: theme.colors.border }]} />
          <View style={[styles.skeletonBubble, styles.skeletonBubbleRight, { backgroundColor: `${theme.colors.primary}20` }]} />
          <View style={[styles.skeletonBubble, styles.skeletonBubbleLeft, { backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: theme.colors.border, width: '60%' }]} />
        </View>
      );
    }
    return renderEmptyChat();
  };

  const headerSubtitle = useMemo(() => {
    if (initialLoading && messages.length === 0) {
      return 'Connecting...';
    }
    return `${messages.length} message${messages.length !== 1 ? 's' : ''}`;
  }, [initialLoading, messages.length]);

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Chat</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]} numberOfLines={1}>
            {headerSubtitle}
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
        ListEmptyComponent={renderEmptyOrLoading}
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
              style={[styles.sendBtn, { backgroundColor: theme.colors.primary, opacity: !newMessage.trim() ? 0.5 : 1 }]}
              onPress={handleSend}
              disabled={!newMessage.trim()}
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

  /* Skeleton Loading */
  skeletonContainer: {
    padding: 16,
    gap: 16,
  },
  skeletonBubble: {
    height: 48,
    borderRadius: 18,
  },
  skeletonBubbleLeft: {
    width: '72%',
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  skeletonBubbleRight: {
    width: '58%',
    alignSelf: 'flex-end',
  },

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
