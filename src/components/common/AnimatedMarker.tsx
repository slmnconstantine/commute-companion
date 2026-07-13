/**
 * AnimatedMarker — Premium animated map markers
 *
 * Supports four marker variants:
 * - origin: Green pulsing dot with "Pickup" label chip
 * - destination: Red/amber pin with "Drop-off" label chip
 * - driver: Themed dot with pulsing ring for live tracking
 * - user: Blue pulsing location indicator
 *
 * All variants include a bounce-in entrance animation.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type MarkerVariant = 'origin' | 'destination' | 'driver' | 'user';

interface AnimatedMarkerProps {
  variant: MarkerVariant;
  label?: string;
  color?: string;
  /** For driver marker: whether the signal is stale */
  isStale?: boolean;
  /** Primary theme color fallback */
  primaryColor?: string;
}

export default function AnimatedMarker({
  variant,
  label,
  color,
  isStale = false,
  primaryColor = '#10B981',
}: AnimatedMarkerProps) {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Bounce-in on mount
  useEffect(() => {
    Animated.spring(bounceAnim, {
      toValue: 1,
      friction: 4,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, []);

  // Pulsing animation for origin, user, and driver markers
  useEffect(() => {
    if (variant === 'origin' || variant === 'user' || variant === 'driver') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.6,
            duration: 1500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [variant]);

  const bounceStyle = {
    transform: [
      {
        scale: bounceAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 1],
        }),
      },
    ],
    opacity: bounceAnim,
  };

  if (variant === 'origin') {
    const markerColor = color || '#22C55E';
    return (
      <Animated.View style={[styles.markerContainer, bounceStyle]}>
        {/* Pulse ring */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              backgroundColor: markerColor,
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.6],
                outputRange: [0.25, 0],
              }),
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        {/* Core dot */}
        <View style={[styles.originDot, { backgroundColor: markerColor }]}>
          <View style={styles.originDotInner} />
        </View>
        {/* Label chip */}
        {label !== undefined && (
          <View style={[styles.labelChip, { backgroundColor: markerColor }]}>
            <Text style={styles.labelText}>{label || 'Pickup'}</Text>
          </View>
        )}
      </Animated.View>
    );
  }

  if (variant === 'destination') {
    const markerColor = color || '#EF4444';
    return (
      <Animated.View style={[styles.markerContainer, bounceStyle]}>
        {/* Pin icon */}
        <View style={[styles.destPin, { backgroundColor: markerColor }]}>
          <Ionicons name="flag" size={16} color="#fff" />
        </View>
        {/* Pin tail */}
        <View style={[styles.destPinTail, { borderTopColor: markerColor }]} />
        {/* Label chip */}
        {label !== undefined && (
          <View style={[styles.labelChip, { backgroundColor: markerColor, marginTop: 2 }]}>
            <Text style={styles.labelText}>{label || 'Drop-off'}</Text>
          </View>
        )}
      </Animated.View>
    );
  }

  if (variant === 'driver') {
    const dotColor = isStale ? '#9CA3AF' : (color || primaryColor);
    return (
      <Animated.View style={[styles.driverContainer, bounceStyle, { opacity: isStale ? 0.5 : 1 }]}>
        {/* Pulse ring */}
        {!isStale && (
          <Animated.View
            style={[
              styles.driverPulseRing,
              {
                backgroundColor: dotColor,
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.6],
                  outputRange: [0.3, 0],
                }),
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        )}
        {/* Core dot */}
        <View style={[styles.driverDot, { backgroundColor: dotColor }]}>
          <Ionicons name="car" size={12} color="#fff" />
        </View>
      </Animated.View>
    );
  }

  // variant === 'user'
  const userColor = color || primaryColor;
  return (
    <Animated.View style={[styles.userContainer, bounceStyle]}>
      {/* Outer pulse ring */}
      <Animated.View
        style={[
          styles.userPulseRing,
          {
            backgroundColor: userColor,
            opacity: pulseAnim.interpolate({
              inputRange: [1, 1.6],
              outputRange: [0.2, 0],
            }),
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      {/* Inner ring */}
      <View style={[styles.userOuterDot, { borderColor: `${userColor}40` }]}>
        <View style={[styles.userInnerDot, { backgroundColor: userColor }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  /* ── Origin marker ──────────────────────── */
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  originDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  originDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  labelChip: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  labelText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.3,
  },

  /* ── Destination marker ─────────────────── */
  destPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  destPinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },

  /* ── Driver marker ──────────────────────── */
  driverContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverPulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  driverDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  /* ── User location marker ───────────────── */
  userContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPulseRing: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  userOuterDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  userInnerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
