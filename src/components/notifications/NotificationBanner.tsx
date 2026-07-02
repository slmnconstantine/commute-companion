import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, Pressable, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
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
  const { theme, mode } = useTheme();
  const router = useRouter();
  const iconPulse = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Swipe-to-dismiss PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture upward swipes
        return gestureState.dy < -10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -40) {
          handleDismiss();
        }
      },
    })
  ).current;

  // Pulsing icon animation
  useEffect(() => {
    if (activeNotification) {
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Icon pulse loop
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(iconPulse, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(iconPulse, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => {
        pulse.stop();
        fadeAnim.setValue(0);
      };
    }
  }, [activeNotification]);

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

  const getIconConfig = () => {
    const type = activeNotification.data?.type;
    switch (type) {
      case 'chat':
        return { name: 'chatbubbles' as const, color: theme.colors.info };
      case 'ride_matched':
        return { name: 'car-sport' as const, color: theme.colors.success };
      case 'trip_update':
        return { name: 'navigate' as const, color: theme.colors.primary };
      case 'booking':
      case 'booking_update':
        return { name: 'ticket' as const, color: theme.colors.accent };
      case 'hub_post':
        return { name: 'people' as const, color: theme.colors.info };
      default:
        return { name: 'notifications' as const, color: theme.colors.primary };
    }
  };

  const iconConfig = getIconConfig();
  const gradientColors = theme.colors.gradientPrimary;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.bannerContainer,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
          shadowColor: iconConfig.color,
        },
      ]}
    >
      {/* Glassmorphic background */}
      <BlurView
        intensity={mode === 'dark' ? 40 : 60}
        tint={mode === 'dark' ? 'dark' : 'light'}
        style={styles.blurBackground}
      />

      {/* Glass overlay for the card surface */}
      <View style={[styles.glassOverlay, { backgroundColor: theme.colors.glassBackground, borderColor: `${theme.colors.border}` }]} />

      {/* Gradient accent stripe on the left */}
      <LinearGradient
        colors={[iconConfig.color, `${iconConfig.color}60`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.accentStripe}
      />

      {/* Content */}
      <View style={styles.contentWrapper}>
        <Pressable onPress={handleBannerPress} style={styles.mainContent}>
          {/* Animated Icon */}
          <Animated.View
            style={[
              styles.iconBox,
              {
                backgroundColor: `${iconConfig.color}18`,
                transform: [{ scale: iconPulse }],
              },
            ]}
          >
            <View style={[styles.iconGlow, { backgroundColor: `${iconConfig.color}10` }]} />
            <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
          </Animated.View>

          {/* Text content */}
          <View style={styles.textContainer}>
            <Text
              style={[
                styles.title,
                { color: theme.colors.text, fontFamily: 'Inter-SemiBold' },
              ]}
              numberOfLines={1}
            >
              {activeNotification.title}
            </Text>
            <Text
              style={[
                styles.body,
                { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' },
              ]}
              numberOfLines={2}
            >
              {activeNotification.body}
            </Text>
          </View>
        </Pressable>

        {/* Pill action buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [
              styles.pillBtn,
              styles.pillDismiss,
              { backgroundColor: `${theme.colors.textMuted}12`, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={handleDismiss}
          >
            <Ionicons name="close" size={14} color={theme.colors.textMuted} />
            <Text style={[styles.pillText, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>
              Dismiss
            </Text>
          </Pressable>

          {activeNotification.data?.chatRoomId && (
            <Pressable
              style={({ pressed }) => [
                styles.pillBtn,
                styles.pillAction,
                { opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => {
                router.push(`/(main)/chat/${activeNotification.data.chatRoomId}`);
                handleDismiss();
              }}
            >
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.pillGradient}
              >
                <Ionicons name="chatbubble" size={12} color="#fff" />
                <Text style={[styles.pillText, { color: '#fff', fontFamily: 'Inter-SemiBold' }]}>
                  Open Chat
                </Text>
              </LinearGradient>
            </Pressable>
          )}

          {activeNotification.data?.tripId && !activeNotification.data?.chatRoomId && (
            <Pressable
              style={({ pressed }) => [
                styles.pillBtn,
                styles.pillAction,
                { opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => {
                router.push(`/(main)/ride/${activeNotification.data.tripId}`);
                handleDismiss();
              }}
            >
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.pillGradient}
              >
                <Ionicons name="eye" size={12} color="#fff" />
                <Text style={[styles.pillText, { color: '#fff', fontFamily: 'Inter-SemiBold' }]}>
                  View Details
                </Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </View>

      {/* Swipe hint indicator */}
      <View style={[styles.swipeHint, { backgroundColor: `${theme.colors.textMuted}30` }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  blurBackground: {
    ...StyleSheet.absoluteFill,
    borderRadius: 20,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 20,
    borderWidth: 1,
  },
  accentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  contentWrapper: {
    padding: 14,
    paddingLeft: 18,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconGlow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 14,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    letterSpacing: 0.1,
  },
  body: {
    fontSize: 12,
    lineHeight: 17,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  pillBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  pillDismiss: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pillAction: {
    // gradient fills the pill
  },
  pillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  swipeHint: {
    width: 32,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 6,
    marginTop: -2,
  },
});
