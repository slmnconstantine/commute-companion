import React from 'react';
import { Animated, View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

interface NotificationBannerProps {
  activeNotification: {
    title: string;
    body: string;
    data?: any;
  } | null;
  slideAnim: Animated.Value;
  handleDismiss: () => void;
}

export default function NotificationBanner({ activeNotification, slideAnim, handleDismiss }: NotificationBannerProps) {
  const { theme } = useTheme();
  const router = useRouter();

  if (!activeNotification) return null;

  const handleBannerPress = () => {
    const { data } = activeNotification;
    if (data) {
      if (data.type === 'chat' && data.chatRoomId) {
        router.push(`/(main)/chat/${data.chatRoomId}`);
      } else if (data.tripId) {
        router.push(`/(main)/ride/${data.tripId}`);
      }
    }
    handleDismiss();
  };

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <Pressable onPress={handleBannerPress}>
        <View style={styles.bannerRow}>
          <View style={[styles.iconBox, { backgroundColor: `${theme.colors.primary}15` }]}>
            <Ionicons
              name={
                activeNotification.data?.type === 'chat'
                  ? 'chatbubbles'
                  : activeNotification.data?.type === 'ride_matched'
                  ? 'car-sport'
                  : 'notifications'
              }
              size={20}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.textContainer}>
            <Text
              style={[
                theme.typography.body,
                { color: theme.colors.text, fontFamily: 'Inter-SemiBold' },
              ]}
              numberOfLines={1}
            >
              {activeNotification.title}
            </Text>
            <Text
              style={[
                theme.typography.small,
                { color: theme.colors.textMuted },
              ]}
              numberOfLines={2}
            >
              {activeNotification.body}
            </Text>
          </View>
        </View>
      </Pressable>
      <View style={[styles.btnRow, { borderTopColor: theme.colors.border }]}>
        <Pressable
          style={[styles.bannerBtn, { backgroundColor: `${theme.colors.textMuted}15` }]}
          onPress={handleDismiss}
        >
          <Text style={[styles.bannerBtnText, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>
            Dismiss
          </Text>
        </Pressable>
        {activeNotification.data?.chatRoomId && (
          <Pressable
            style={[styles.bannerBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              router.push(`/(main)/chat/${activeNotification.data.chatRoomId}`);
              handleDismiss();
            }}
          >
            <Text style={[styles.bannerBtnText, { color: theme.colors.white, fontFamily: 'Inter-SemiBold' }]}>
              Open Chat
            </Text>
          </Pressable>
        )}
        {activeNotification.data?.tripId && !activeNotification.data?.chatRoomId && (
          <Pressable
            style={[styles.bannerBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              router.push(`/(main)/ride/${activeNotification.data.tripId}`);
              handleDismiss();
            }}
          >
            <Text style={[styles.bannerBtnText, { color: theme.colors.white, fontFamily: 'Inter-SemiBold' }]}>
              View Details
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  bannerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  bannerBtnText: {
    fontSize: 12,
  },
});
