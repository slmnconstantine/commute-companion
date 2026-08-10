import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';

interface DriverUnderReviewCardProps {
  theme: ReturnType<typeof useTheme>['theme'];
  onViewStatus?: () => void;
}

export default function DriverUnderReviewCard({
  theme,
  onViewStatus,
}: DriverUnderReviewCardProps) {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.colors.surface,
          borderColor: 'rgba(245, 158, 11, 0.25)',
          shadowColor: '#F59E0B',
        },
      ]}
    >
      {/* Background soft amber tint gradient */}
      <LinearGradient
        colors={['rgba(245, 158, 11, 0.08)', 'rgba(245, 158, 11, 0.02)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Top Hourglass Badge */}
      <Animated.View style={[styles.iconContainer, animatedPulseStyle]}>
        <View style={styles.iconCircle}>
          <Ionicons name="hourglass-outline" size={32} color="#F59E0B" />
        </View>
      </Animated.View>

      {/* Status Pill */}
      <View style={styles.statusPill}>
        <View style={styles.statusDot} />
        <Text style={styles.statusPillText}>Application Under Review</Text>
      </View>

      {/* Title & Description */}
      <Text style={[styles.title, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
        Driver Verification in Progress
      </Text>
      <Text style={[styles.description, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
        Your driver credentials and documents have been submitted and are currently being reviewed by our safety team.
      </Text>

      {/* Checklist / Timeline */}
      <View
        style={[
          styles.checklistCard,
          {
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.checklistItem}>
          <Ionicons name="checkmark-circle" size={18} color={theme.colors.success || '#10B981'} />
          <Text style={[styles.checklistText, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>
            Documents & Vehicle Submitted
          </Text>
        </View>

        <View style={styles.checkDivider} />

        <View style={styles.checklistItem}>
          <Ionicons name="time" size={18} color="#F59E0B" />
          <Text style={[styles.checklistText, { color: '#F59E0B', fontFamily: 'Inter-Medium' }]}>
            Identity Review (in progress)
          </Text>
        </View>

        <View style={styles.checkDivider} />

        <View style={styles.checklistItem}>
          <Ionicons name="lock-closed-outline" size={18} color={theme.colors.textMuted} />
          <Text style={[styles.checklistText, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            Ride Creation (unlocked upon approval)
          </Text>
        </View>
      </View>

      {/* CTA Button */}
      {onViewStatus && (
        <Pressable
          style={({ pressed }) => [
            styles.statusBtn,
            {
              backgroundColor: theme.colors.primary,
              opacity: pressed ? 0.88 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
          onPress={onViewStatus}
        >
          <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
          <Text style={[styles.statusBtnText, { fontFamily: 'Inter-SemiBold' }]}>
            View Verification Status
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
    elevation: 4,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  iconContainer: {
    marginBottom: 12,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  statusPillText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  checklistCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  checkDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginVertical: 4,
    marginLeft: 28,
  },
  checklistText: {
    fontSize: 13,
    flex: 1,
  },
  statusBtn: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0057FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  statusBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
});
