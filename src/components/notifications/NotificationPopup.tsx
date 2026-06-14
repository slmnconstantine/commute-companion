import React from 'react';
import { Animated, View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

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
  const { theme } = useTheme();
  const router = useRouter();

  if (!centerPopupNotification) return null;

  return (
    <View style={styles.popupOverlay}>
      <Animated.View
        style={[
          styles.popupCard,
          {
            transform: [{ scale: popupScaleAnim }],
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            shadowColor: theme.colors.shadow,
          },
        ]}
      >
        <View style={[styles.popupIconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
          <Ionicons name="car-sport-outline" size={32} color={theme.colors.primary} />
        </View>
        <Text
          style={[
            theme.typography.heading,
            styles.popupTitle,
            { color: theme.colors.text, fontFamily: 'Inter-SemiBold' },
          ]}
        >
          {centerPopupNotification.title}
        </Text>
        <Text
          style={[
            theme.typography.body,
            styles.popupBody,
            { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' },
          ]}
        >
          {centerPopupNotification.body}
        </Text>
        <View style={styles.popupBtnRow}>
          <Pressable
            style={[styles.popupBtn, { backgroundColor: `${theme.colors.textMuted}15` }]}
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
              style={[styles.popupBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => {
                router.push(`/(main)/ride/${centerPopupNotification.tripId}`);
                handleDismissPopup();
              }}
            >
              <Text
                style={[
                  styles.popupBtnText,
                  { color: theme.colors.white, fontFamily: 'Inter-SemiBold' },
                ]}
              >
                Check Details
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  popupOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    padding: 24,
  },
  popupCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  popupIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  popupTitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
  popupBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  popupBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  popupBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupBtnText: {
    fontSize: 14,
  },
});
