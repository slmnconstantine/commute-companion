/**
 * VerificationBanner
 *
 * A prominent, colour-coded banner that communicates the user's
 * identity verification status at a glance:
 *
 *  • **Unverified** – amber, shield icon, prompts user to begin
 *  • **Pending**    – blue, hourglass icon, verification in review
 *  • **Verified**   – green, checkmark icon, account is verified
 *
 * Pressing the banner navigates the user to the verification screen.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { Profile } from '@/types/database';

type VerificationState = 'unverified' | 'pending' | 'verified';

interface VerificationBannerProps {
  /** The user's profile used to derive verification state */
  profile: Profile;
  /** Called when the banner is pressed */
  onPress?: () => void;
}

interface BannerConfig {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description: string;
  color: string;
  gradientColors: [string, string];
}

/** Convert a hex colour to rgba with given alpha */
function hexToRgba(hex: string, alpha: number): string {
  const sanitised = hex.replace('#', '');
  const r = parseInt(sanitised.substring(0, 2), 16);
  const g = parseInt(sanitised.substring(2, 4), 16);
  const b = parseInt(sanitised.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Derive the verification state from the profile:
 *  - verified_badge === true  → 'verified'
 *  - has government_id_url but not verified → 'pending'
 *  - otherwise → 'unverified'
 */
function getVerificationState(profile: Profile): VerificationState {
  if (profile.verified_badge || profile.is_verified) return 'verified';
  if (profile.government_id_url) return 'pending';
  return 'unverified';
}

export default function VerificationBanner({ profile, onPress }: VerificationBannerProps) {
  const { theme } = useTheme();

  const state = getVerificationState(profile);

  // Animation refs
  const dotPulse = useRef(new Animated.Value(0.5)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const iconShake = useRef(new Animated.Value(0)).current;
  const chevronBounce = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  /** Resolve state → banner configuration */
  const getConfig = (): BannerConfig => {
    switch (state) {
      case 'unverified':
        return {
          icon: 'shield-outline',
          label: 'Unverified Account',
          description: 'Complete verification to start sharing rides',
          color: theme.colors.warning,
          gradientColors: [hexToRgba(theme.colors.warning, 0.15), hexToRgba(theme.colors.warning, 0.03)],
        };
      case 'pending':
        return {
          icon: 'hourglass-outline',
          label: 'Verification In Progress',
          description: "We're reviewing your documents — hang tight!",
          color: theme.colors.info,
          gradientColors: [hexToRgba(theme.colors.info, 0.15), hexToRgba(theme.colors.info, 0.03)],
        };
      case 'verified':
        return {
          icon: 'shield-checkmark',
          label: 'Verified Account',
          description: 'Your identity has been confirmed',
          color: theme.colors.success,
          gradientColors: [hexToRgba(theme.colors.success, 0.15), hexToRgba(theme.colors.success, 0.03)],
        };
    }
  };

  const config = getConfig();

  // Animations
  useEffect(() => {
    // Pulsing status dot
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(dotPulse, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Chevron bounce hint
    const chevron = Animated.loop(
      Animated.sequence([
        Animated.timing(chevronBounce, {
          toValue: 6,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(chevronBounce, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
        Animated.delay(2000),
      ])
    );
    chevron.start();

    // State-specific animations
    if (state === 'pending') {
      // Rotating hourglass
      const rotate = Animated.loop(
        Animated.timing(iconRotate, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      );
      rotate.start();

      // Indeterminate progress bar
      const progress = Animated.loop(
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
          easing: Easing.inOut(Easing.cubic),
        })
      );
      progress.start();

      return () => {
        pulse.stop();
        chevron.stop();
        rotate.stop();
        progress.stop();
      };
    }

    if (state === 'unverified') {
      // Gentle shake
      const shake = Animated.loop(
        Animated.sequence([
          Animated.delay(3000),
          Animated.timing(iconShake, { toValue: 8, duration: 80, useNativeDriver: true }),
          Animated.timing(iconShake, { toValue: -8, duration: 80, useNativeDriver: true }),
          Animated.timing(iconShake, { toValue: 6, duration: 60, useNativeDriver: true }),
          Animated.timing(iconShake, { toValue: -6, duration: 60, useNativeDriver: true }),
          Animated.timing(iconShake, { toValue: 0, duration: 60, useNativeDriver: true }),
        ])
      );
      shake.start();

      return () => {
        pulse.stop();
        chevron.stop();
        shake.stop();
      };
    }

    return () => {
      pulse.stop();
      chevron.stop();
    };
  }, [state]);

  const rotateInterpolation = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0%', '70%', '0%'],
  });

  const progressLeft = progressAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0%', '15%', '100%'],
  });

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          borderColor: hexToRgba(config.color, 0.25),
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={onPress}
    >
      {/* Gradient background */}
      <LinearGradient
        colors={config.gradientColors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Left icon with animation */}
      <Animated.View
        style={[
          styles.iconContainer,
          { backgroundColor: hexToRgba(config.color, 0.12) },
          state === 'pending' && { transform: [{ rotate: rotateInterpolation }] },
          state === 'unverified' && { transform: [{ translateX: iconShake }] },
        ]}
      >
        <Ionicons name={config.icon} size={22} color={config.color} />
      </Animated.View>

      {/* Text content */}
      <View style={styles.textContent}>
        <View style={styles.labelRow}>
          <Text
            style={[
              styles.label,
              { color: config.color, fontFamily: 'Inter-SemiBold' },
            ]}
          >
            {config.label}
          </Text>
          {/* Pulsing status dot */}
          <Animated.View
            style={[
              styles.statusDot,
              {
                backgroundColor: config.color,
                opacity: dotPulse,
              },
            ]}
          />
        </View>
        <Text
          style={[
            styles.description,
            { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' },
          ]}
        >
          {config.description}
        </Text>
      </View>

      {/* Animated chevron */}
      <Animated.View style={{ transform: [{ translateX: chevronBounce }] }}>
        <Ionicons name="chevron-forward" size={18} color={config.color} />
      </Animated.View>

      {/* Indeterminate progress bar for pending */}
      {state === 'pending' && (
        <View style={[styles.progressTrack, { backgroundColor: hexToRgba(config.color, 0.08) }]}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: hexToRgba(config.color, 0.4),
                width: progressWidth,
                left: progressLeft,
              },
            ]}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    overflow: 'hidden',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: {
    flex: 1,
    gap: 3,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    letterSpacing: 0.1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    height: 3,
    borderRadius: 2,
  },
});
