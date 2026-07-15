import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface NotificationPopupProps {
  centerPopupNotification: {
    title: string;
    body: string;
    tripId?: string;
  } | null;
  popupScaleAnim: Animated.Value;
  handleDismissPopup: () => void;
}

export default function NotificationPopup({ centerPopupNotification, popupScaleAnim, handleDismissPopup }: NotificationPopupProps) {
  const { theme, mode } = useTheme();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.4)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (centerPopupNotification) {
      // Haptic on popup
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Fade in overlay
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Glow pulse loop
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, {
            toValue: 0.8,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(glowPulse, {
            toValue: 0.4,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      glow.start();

      // Check/icon bounce-in
      Animated.spring(checkScale, {
        toValue: 1,
        delay: 200,
        tension: 120,
        friction: 6,
        useNativeDriver: true,
      }).start();

      return () => {
        glow.stop();
        fadeAnim.setValue(0);
        checkScale.setValue(0);
      };
    }
  }, [centerPopupNotification]);

  if (!centerPopupNotification) return null;

  const gradientColors = theme.colors.gradientPrimary;

  return (
    <Animated.View style={[styles.popupOverlay, { opacity: fadeAnim }]}>
      {/* Dim overlay without blur */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: mode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' }]} />

      <Animated.View
        style={[
          styles.popupCardWrapper,
          {
            transform: [{ scale: popupScaleAnim }],
          },
        ]}
      >
        {/* Gradient border glow */}
        <LinearGradient
          colors={[gradientColors[0], theme.colors.info, gradientColors[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        >
          {/* Inner card */}
          <View style={[styles.popupCard, { backgroundColor: theme.colors.surface }]}>


            {/* Animated icon ring */}
            <View style={styles.iconRingContainer}>
              <Animated.View style={[styles.glowRing, { backgroundColor: `${theme.colors.primary}15`, opacity: glowPulse }]} />
              <Animated.View style={[styles.glowRingOuter, { borderColor: `${theme.colors.primary}20`, opacity: glowPulse }]} />
              <Animated.View
                style={[
                  styles.popupIconContainer,
                  {
                    backgroundColor: `${theme.colors.primary}18`,
                    transform: [{ scale: checkScale }],
                  },
                ]}
              >
                <Ionicons name="car-sport-outline" size={32} color={theme.colors.primary} />
              </Animated.View>
            </View>

            {/* Title */}
            <Text
              style={[
                styles.popupTitle,
                { color: theme.colors.text, fontFamily: 'Inter-Bold' },
              ]}
            >
              {centerPopupNotification.title}
            </Text>

            {/* Subtitle */}
            <Text
              style={[
                styles.popupBody,
                { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' },
              ]}
            >
              {centerPopupNotification.body}
            </Text>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: `${theme.colors.border}` }]} />

            {/* Action buttons */}
            <View style={styles.popupBtnRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.popupBtn,
                  styles.dismissBtn,
                  {
                    borderColor: `${theme.colors.border}`,
                    opacity: pressed ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
                onPress={handleDismissPopup}
              >
                <Text
                  style={[
                    styles.popupBtnText,
                    { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' },
                  ]}
                >
                  Dismiss
                </Text>
              </Pressable>

              {centerPopupNotification.tripId && (
                <Pressable
                  style={({ pressed }) => [
                    styles.popupBtn,
                    { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                  ]}
                  onPress={() => {
                    router.push(`/(main)/ride/${centerPopupNotification.tripId}`);
                    handleDismissPopup();
                  }}
                >
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientBtn}
                  >
                    <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginRight: 4 }} />
                    <Text
                      style={[
                        styles.popupBtnText,
                        { color: '#fff', fontFamily: 'Inter-SemiBold' },
                      ]}
                    >
                      Check Details
                    </Text>
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  popupOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    padding: 24,
  },
  popupCardWrapper: {
    width: '100%',
    maxWidth: 340,
  },
  gradientBorder: {
    borderRadius: 24,
    padding: 1.5,
  },
  popupCard: {
    borderRadius: 23,
    padding: 28,
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconRingContainer: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  glowRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  glowRingOuter: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  popupIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupTitle: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  popupBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 20,
  },
  popupBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  popupBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  dismissBtn: {
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
  },
  popupBtnText: {
    fontSize: 14,
    letterSpacing: 0.1,
  },
});
