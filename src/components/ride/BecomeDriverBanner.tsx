import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';

export default function BecomeDriverBanner({
  theme,
  onPress,
}: {
  theme: ReturnType<typeof useTheme>['theme'];
  onPress: () => void;
}) {
  const carDrift = useRef(new Animated.Value(0)).current;
  const shimmerPos = useRef(new Animated.Value(-1)).current;
  const sparkleOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Car drift animation — gentle left-right
    const drift = Animated.loop(
      Animated.sequence([
        Animated.timing(carDrift, {
          toValue: 8,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(carDrift, {
          toValue: -8,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    drift.start();

    // Shimmer sweep on CTA button
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.delay(3000),
        Animated.timing(shimmerPos, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic),
        }),
        Animated.timing(shimmerPos, {
          toValue: -1,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();

    // Sparkle pulse
    const sparkle = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleOpacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    sparkle.start();

    return () => {
      drift.stop();
      shimmer.stop();
      sparkle.stop();
    };
  }, []);

  const gradientColors = theme.colors.gradientPrimary;

  const shimmerTranslate = shimmerPos.interpolate({
    inputRange: [-1, 1],
    outputRange: [-200, 200],
  });

  return (
    <Pressable
      style={({ pressed }) => [
        styles.driverBanner,
        {
          shadowColor: theme.colors.primary,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={onPress}
    >
      {/* Gradient card background */}
      <LinearGradient
        colors={[`${theme.colors.primary}10`, theme.colors.surface, `${theme.colors.primary}08`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle border glow */}
      <View style={[StyleSheet.absoluteFill, styles.borderGlow, { borderColor: `${theme.colors.primary}20` }]} />

      {/* Sparkle badge */}
      <Animated.View style={[styles.sparkleBadge, { opacity: sparkleOpacity }]}>
        <View style={[styles.sparkleBg, { backgroundColor: `${theme.colors.accent}20` }]}>
          <Ionicons name="sparkles" size={14} color={theme.colors.accent} />
        </View>
      </Animated.View>

      {/* Animated icon */}
      <Animated.View
        style={[
          styles.bannerIconContainer,
          {
            backgroundColor: `${theme.colors.primary}12`,
            transform: [{ translateX: carDrift }],
          },
        ]}
      >
        <View style={[styles.iconGlow, { backgroundColor: `${theme.colors.primary}08` }]} />
        <Ionicons name="car-sport" size={36} color={theme.colors.primary} />
      </Animated.View>

      <Text style={[styles.bannerTitle, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
        Want to offer rides?
      </Text>
      <Text style={[styles.bannerDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
        Become a driver to start posting rides and earn by sharing your commute with others.
      </Text>

      {/* Gradient CTA button with shimmer */}
      <View style={styles.btnWrapper}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bannerButton}
        >
          <Ionicons name="arrow-forward" size={18} color="#fff" />
          <Text style={[styles.bannerButtonText, { fontFamily: 'Inter-SemiBold' }]}>Become a Driver</Text>

          {/* Shimmer sweep */}
          <Animated.View
            style={[
              styles.shimmer,
              {
                transform: [{ translateX: shimmerTranslate }],
              },
            ]}
          />
        </LinearGradient>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  driverBanner: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 22,
    marginTop: 20,
    gap: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
    overflow: 'hidden',
  },
  borderGlow: {
    borderRadius: 22,
    borderWidth: 1,
  },
  sparkleBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 2,
  },
  sparkleBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconGlow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
  },
  bannerTitle: {
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  bannerDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  btnWrapper: {
    marginTop: 4,
    borderRadius: 14,
    overflow: 'hidden',
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    overflow: 'hidden',
  },
  bannerButtonText: {
    color: '#fff',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    transform: [{ skewX: '-20deg' }],
  },
});
