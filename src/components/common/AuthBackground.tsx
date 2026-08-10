import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';

const { width, height } = Dimensions.get('window');

interface AuthBackgroundProps {
  children?: React.ReactNode;
}

export default function AuthBackground({ children }: AuthBackgroundProps) {
  const { mode } = useTheme();
  const isLight = mode === 'light';

  // Ambient pulse animation
  const pulseAnim = useRef(new Animated.Value(0.85)).current;
  const driftAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subtle breathing pulse for glowing ambient light
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle vertical drift
    const drift = Animated.loop(
      Animated.sequence([
        Animated.timing(driftAnim, {
          toValue: 15,
          duration: 5000,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(driftAnim, {
          toValue: -15,
          duration: 5000,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    drift.start();

    return () => {
      pulse.stop();
      drift.stop();
    };
  }, []);

  const gradientColors = isLight
    ? (['#F8F7F4', '#EFF4FF', '#F4F2EC'] as const)
    : (['#070B14', '#0B1326', '#05080F'] as const);

  const topGlowColors = isLight
    ? (['rgba(0, 87, 255, 0.12)', 'rgba(0, 87, 255, 0.03)', 'transparent'] as const)
    : (['rgba(0, 87, 255, 0.35)', 'rgba(0, 87, 255, 0.08)', 'transparent'] as const);

  const bottomGlowColors = isLight
    ? (['rgba(0, 87, 255, 0.08)', 'rgba(0, 87, 255, 0.02)', 'transparent'] as const)
    : (['rgba(0, 87, 255, 0.22)', 'rgba(0, 87, 255, 0.04)', 'transparent'] as const);

  return (
    <View style={[styles.container, { backgroundColor: isLight ? '#F8F7F4' : '#070B14' }]}>
      {/* Base Deep Gradient */}
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Top Ambient Signal Blue Halo (Behind Logo area) */}
      <Animated.View
        style={[
          styles.glowOrbTop,
          {
            transform: [{ scale: pulseAnim }, { translateY: driftAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={topGlowColors as any}
          locations={[0, 0.5, 1]}
          style={styles.glowGradient}
        />
      </Animated.View>

      {/* Bottom Subtle Ambient Accent Glow */}
      <Animated.View
        style={[
          styles.glowOrbBottom,
          {
            transform: [
              { scale: pulseAnim.interpolate({ inputRange: [0.85, 1.15], outputRange: [1.1, 0.9] }) },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={bottomGlowColors as any}
          locations={[0, 0.5, 1]}
          style={styles.glowGradient}
        />
      </Animated.View>

      {/* Elegant Transit Route Arches & Geometric Ribbons */}
      <View style={styles.routeDecorContainer} pointerEvents="none">
        {/* Route Arch 1 */}
        <View
          style={[
            styles.routeArch1,
            { borderColor: isLight ? 'rgba(0, 87, 255, 0.12)' : 'rgba(0, 87, 255, 0.16)' },
          ]}
        />
        {/* Route Arch 2 */}
        <View
          style={[
            styles.routeArch2,
            { borderColor: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(248, 247, 244, 0.07)' },
          ]}
        />
        {/* Route Arch 3 */}
        <View
          style={[
            styles.routeArch3,
            { borderColor: isLight ? 'rgba(0, 87, 255, 0.08)' : 'rgba(0, 87, 255, 0.12)' },
          ]}
        />

        {/* Minimalist Glowing Commute Nodes */}
        <View
          style={[
            styles.node,
            styles.node1,
            { backgroundColor: isLight ? 'rgba(0, 87, 255, 0.10)' : 'rgba(0, 87, 255, 0.15)' },
          ]}
        >
          <View style={styles.nodeCore} />
        </View>
        <View
          style={[
            styles.node,
            styles.node2,
            { backgroundColor: isLight ? 'rgba(0, 87, 255, 0.10)' : 'rgba(0, 87, 255, 0.15)' },
          ]}
        >
          <View style={styles.nodeCore} />
        </View>
        <View
          style={[
            styles.node,
            styles.node3,
            { backgroundColor: isLight ? 'rgba(0, 87, 255, 0.10)' : 'rgba(0, 87, 255, 0.15)' },
          ]}
        >
          <View style={styles.nodeCore} />
        </View>
      </View>

      {/* Subtle Fine Grid Texture Overlay for Dark Mode */}
      {!isLight && <View style={styles.gridOverlay} pointerEvents="none" />}

      {/* Foreground Content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070B14',
    position: 'relative',
    overflow: 'hidden',
  },
  glowOrbTop: {
    position: 'absolute',
    top: -height * 0.08,
    alignSelf: 'center',
    width: width * 1.3,
    height: width * 1.3,
    borderRadius: (width * 1.3) / 2,
    opacity: 0.9,
  },
  glowOrbBottom: {
    position: 'absolute',
    bottom: -height * 0.15,
    right: -width * 0.25,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: (width * 1.2) / 2,
    opacity: 0.8,
  },
  glowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: (width * 1.3) / 2,
  },
  routeDecorContainer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  routeArch1: {
    position: 'absolute',
    top: height * 0.12,
    left: -width * 0.4,
    width: width * 1.8,
    height: height * 0.55,
    borderRadius: width * 0.9,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 87, 255, 0.16)',
    transform: [{ rotate: '-18deg' }],
  },
  routeArch2: {
    position: 'absolute',
    top: height * 0.22,
    left: -width * 0.25,
    width: width * 1.6,
    height: height * 0.6,
    borderRadius: width * 0.8,
    borderWidth: 1,
    borderColor: 'rgba(248, 247, 244, 0.07)',
    transform: [{ rotate: '-8deg' }],
  },
  routeArch3: {
    position: 'absolute',
    top: height * 0.4,
    right: -width * 0.4,
    width: width * 1.5,
    height: height * 0.5,
    borderRadius: width * 0.75,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 87, 255, 0.12)',
    transform: [{ rotate: '25deg' }],
  },
  node: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 87, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0057FF',
    shadowColor: '#0057FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  node1: {
    top: height * 0.24,
    left: width * 0.18,
  },
  node2: {
    top: height * 0.48,
    right: width * 0.15,
  },
  node3: {
    top: height * 0.65,
    left: width * 0.12,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
});
