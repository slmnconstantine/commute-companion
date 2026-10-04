import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';

const { width } = Dimensions.get('window');

export interface TourStep {
  id: string;
  badge: string;
  title: string;
  description: string;
  icon: any;
  iconColor: string;
  position: 'top' | 'bottom' | 'bottom-right';
  targetLabel: string;
  route: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'route',
    badge: 'Step 1 of 5 • Route Corridor',
    title: 'Pin Your Commute Route',
    description: 'Pin where you start and end your daily commute to automatically match with carpools and commuters traveling your way.',
    icon: 'navigate-circle',
    iconColor: '#0057FF',
    position: 'top',
    targetLabel: 'Top Search Bar',
    route: '/(main)/(tabs)',
  },
  {
    id: 'rides',
    badge: 'Step 2 of 5 • Carpools & Requests',
    title: 'Find & Request Rides',
    description: "Browse active carpools along your corridor, or post a 'Looking for a Ride' request for verified drivers to pick you up.",
    icon: 'car-sport',
    iconColor: '#22C55E',
    position: 'bottom',
    targetLabel: 'Rides Tab',
    route: '/(main)/(tabs)/rides',
  },
  {
    id: 'hub',
    badge: 'Step 3 of 5 • Community Hub',
    title: 'Live Traffic & Road Alerts',
    description: 'Stay ahead of delays! Chat and share real-time road conditions, traffic reports, and safety updates with peers on your route.',
    icon: 'chatbubbles',
    iconColor: '#0D9488',
    position: 'bottom',
    targetLabel: 'Hub Tab',
    route: '/(main)/(tabs)/community',
  },
  {
    id: 'voice',
    badge: 'Step 4 of 5 • Hands-Free AI',
    title: 'AI Voice Assistant',
    description: 'On the move? Tap the floating blue microphone anytime to search rides or check route conditions with natural speech.',
    icon: 'mic',
    iconColor: '#0057FF',
    position: 'bottom-right',
    targetLabel: 'Voice Assistant FAB',
    route: '/(main)/(tabs)',
  },
  {
    id: 'verification',
    badge: 'Step 5 of 5 • Safety & Trust',
    title: 'Verify for Full Access',
    description: 'Upload your government ID in your Profile to earn your verified badge and unlock posting ride requests.',
    icon: 'shield-checkmark',
    iconColor: '#F59E0B',
    position: 'bottom',
    targetLabel: 'Profile Tab',
    route: '/(main)/(tabs)/profile',
  },
];

interface FeatureTourTooltipProps {
  visible: boolean;
  onComplete: () => void;
  onSkip?: () => void;
}

export default function FeatureTourTooltip({
  visible,
  onComplete,
  onSkip,
}: FeatureTourTooltipProps) {
  const { theme, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isDark = mode === 'dark';

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Animations
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const step = TOUR_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  useEffect(() => {
    if (visible) {
      // Navigate to the initial step screen when tour opens
      router.push(TOUR_STEPS[0].route as any);

      // Card entrance animation
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous subtle pulse on beacon
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      return () => pulseLoop.stop();
    } else {
      cardOpacity.setValue(0);
      cardScale.setValue(0.9);
      setCurrentStepIndex(0);
    }
  }, [visible]);

  const handleNext = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}

    if (isLastStep) {
      // Return to Home tab on tour completion
      router.push('/(main)/(tabs)' as any);
      onComplete();
    } else {
      const nextIndex = currentStepIndex + 1;
      const nextStep = TOUR_STEPS[nextIndex];

      // Route the user to the respective screen for this step
      router.push(nextStep.route as any);

      // Card transition animation
      Animated.sequence([
        Animated.timing(cardOpacity, {
          toValue: 0.5,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      setCurrentStepIndex(nextIndex);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      try {
        if (Platform.OS !== 'web') {
          Haptics.selectionAsync();
        }
      } catch {}

      const prevIndex = currentStepIndex - 1;
      const prevStep = TOUR_STEPS[prevIndex];

      // Route back to the respective screen
      router.push(prevStep.route as any);
      setCurrentStepIndex(prevIndex);
    }
  };

  const handleSkip = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    } catch {}

    // Return to Home tab on skip
    router.push('/(main)/(tabs)' as any);

    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  if (!visible) return null;

  // Positioning based on step target
  const getCardPositionStyle = () => {
    if (step.position === 'top') {
      return {
        top: Platform.OS === 'android' ? insets.top + 72 : insets.top + 76,
        left: 20,
        right: 20,
      };
    }
    if (step.position === 'bottom-right') {
      return {
        bottom: 155,
        left: 20,
        right: 20,
      };
    }
    // 'bottom' position (above bottom tab bar)
    return {
      bottom: Platform.OS === 'ios' ? insets.bottom + 85 : 95,
      left: 20,
      right: 20,
    };
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        {/* Semi-transparent Dimming Mask */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleNext} />

        {/* Dynamic Target Pointer / Beacon */}
        {step.position === 'top' && (
          <View style={[styles.topPointerWrap, { top: insets.top + 16 }]}>
            <Animated.View
              style={[
                styles.targetBeacon,
                {
                  borderColor: step.iconColor,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            <View style={[styles.targetDot, { backgroundColor: step.iconColor }]} />
          </View>
        )}

        {step.position === 'bottom-right' && (
          <View style={[styles.fabPointerWrap, { bottom: 90, right: 24 }]}>
            <Animated.View
              style={[
                styles.targetBeacon,
                {
                  borderColor: step.iconColor,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            <View style={[styles.targetDot, { backgroundColor: step.iconColor }]} />
          </View>
        )}

        {step.position === 'bottom' && (
          <View style={[styles.bottomPointerWrap, { bottom: 20 }]}>
            <Animated.View
              style={[
                styles.targetBeacon,
                {
                  borderColor: step.iconColor,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            <View style={[styles.targetDot, { backgroundColor: step.iconColor }]} />
          </View>
        )}

        {/* Floating Tooltip Card */}
        <Animated.View
          style={[
            styles.tooltipCard,
            getCardPositionStyle(),
            {
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 87, 255, 0.15)',
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: `${step.iconColor}15` },
                ]}
              >
                <Ionicons name={step.icon} size={18} color={step.iconColor} />
              </View>
              <Text
                style={[
                  styles.badgeText,
                  { color: step.iconColor, fontFamily: 'Inter-SemiBold' },
                ]}
              >
                {step.badge}
              </Text>
            </View>

            <Pressable hitSlop={12} onPress={handleSkip} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: theme.colors.textMuted }]}>
                Skip
              </Text>
            </Pressable>
          </View>

          {/* Card Body */}
          <Text
            style={[
              styles.cardTitle,
              { color: theme.colors.text, fontFamily: 'Outfit-Bold' },
            ]}
          >
            {step.title}
          </Text>

          <Text
            style={[
              styles.cardDescription,
              { color: isDark ? '#94A3B8' : '#64748B', fontFamily: 'Inter-Regular' },
            ]}
          >
            {step.description}
          </Text>

          {/* Card Footer (Progress dots & Navigation buttons) */}
          <View style={styles.cardFooter}>
            {/* Progress Dots */}
            <View style={styles.dotsRow}>
              {TOUR_STEPS.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor:
                        idx === currentStepIndex
                          ? theme.colors.primary
                          : isDark
                          ? 'rgba(255, 255, 255, 0.2)'
                          : '#E2E8F0',
                      width: idx === currentStepIndex ? 18 : 6,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              {currentStepIndex > 0 && (
                <Pressable
                  onPress={handlePrev}
                  style={[
                    styles.prevBtn,
                    {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0',
                    },
                  ]}
                >
                  <Text style={[styles.prevBtnText, { color: theme.colors.textMuted }]}>
                    Back
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={handleNext}
                style={[
                  styles.nextBtn,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text style={styles.nextBtnText}>
                  {isLastStep ? 'Get Started' : 'Next'}
                </Text>
                {!isLastStep && (
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                )}
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    zIndex: 99999,
  },
  topPointerWrap: {
    position: 'absolute',
    left: '50%',
    marginLeft: -16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100000,
  },
  bottomPointerWrap: {
    position: 'absolute',
    left: '50%',
    marginLeft: -16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100000,
  },
  fabPointerWrap: {
    position: 'absolute',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100000,
  },
  targetBeacon: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  targetDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tooltipCard: {
    position: 'absolute',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
    zIndex: 100001,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  skipBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  cardTitle: {
    fontSize: 19,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  progressDot: {
    height: 6,
    borderRadius: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prevBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  prevBtnText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: '#0057FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontFamily: 'Inter-SemiBold',
  },
});
