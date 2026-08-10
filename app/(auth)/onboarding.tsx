import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Welcome to Commute Companion',
    description: 'The smartest way to share rides, reduce traffic, and save money on your daily commute.',
    icon: 'car-sport',
    badge: 'Carpool Ecosystem',
    tag1: '👥 2+ Companion',
    tag2: '🌿 Save ₱150/day',
  },
  {
    id: '2',
    title: 'Find Your Perfect Ride',
    description: 'Set your regular commute route and we will match you with drivers going the same way.',
    icon: 'navigate',
    badge: 'Smart Route Matching',
    tag1: '⚡ Instant Match',
    tag2: '📍 Door-to-Door',
  },
  {
    id: '3',
    title: 'Safe & Verified Community',
    description: 'All users are verified with government IDs to ensure a secure environment for everyone.',
    icon: 'shield-checkmark',
    badge: 'ID Verified Safety',
    tag1: '🛡️ Govt ID Checked',
    tag2: '⭐ 5.0 Rated Peers',
  },
];

function OnboardingHeroGraphic({
  icon,
  badge,
  tag1,
  tag2,
}: {
  icon: string;
  badge: string;
  tag1: string;
  tag2: string;
}) {
  const { mode } = useTheme();
  const isLight = mode === 'light';

  // Smooth floating animations
  const floatMain = useSharedValue(0);
  const floatSat1 = useSharedValue(0);
  const floatSat2 = useSharedValue(0);
  const pulseRing1 = useSharedValue(1);
  const pulseRing2 = useSharedValue(1);

  React.useEffect(() => {
    // Center icon gentle floating
    floatMain.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Satellite 1 floating (counter-phase)
    floatSat1.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1900, easing: Easing.inOut(Easing.cubic) }),
        withTiming(6, { duration: 1900, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      true
    );

    // Satellite 2 floating
    floatSat2.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(-6, { duration: 2400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Concentric pulse waves
    pulseRing1.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 2600, easing: Easing.out(Easing.ease) }),
        withTiming(0.95, { duration: 2600, easing: Easing.in(Easing.ease) })
      ),
      -1,
      true
    );

    pulseRing2.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 3200, easing: Easing.out(Easing.ease) }),
        withTiming(0.9, { duration: 3200, easing: Easing.in(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const mainStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatMain.value }],
  }));

  const sat1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: floatSat1.value }],
  }));

  const sat2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: floatSat2.value }],
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: pulseRing1.value }],
    opacity: isLight ? 0.45 : 0.25,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: pulseRing2.value }],
    opacity: isLight ? 0.25 : 0.15,
  }));

  return (
    <View style={heroStyles.wrapper}>
      {/* Outer Ambient Glow Ring 2 */}
      <Animated.View
        style={[
          heroStyles.outerGlowRing,
          {
            backgroundColor: isLight ? 'rgba(0, 87, 255, 0.08)' : 'rgba(0, 87, 255, 0.18)',
            borderColor: isLight ? 'rgba(0, 87, 255, 0.12)' : 'rgba(0, 87, 255, 0.25)',
          },
          ring2Style,
        ]}
      />

      {/* Middle Concentric Ring 1 */}
      <Animated.View
        style={[
          heroStyles.middleGlowRing,
          {
            backgroundColor: isLight ? 'rgba(0, 87, 255, 0.12)' : 'rgba(0, 87, 255, 0.28)',
            borderColor: isLight ? 'rgba(0, 87, 255, 0.18)' : 'rgba(0, 87, 255, 0.35)',
          },
          ring1Style,
        ]}
      />

      {/* Floating Satellite Badge 1 (Top-Right) */}
      <Animated.View style={[heroStyles.satellite1, sat1Style]}>
        <View
          style={[
            heroStyles.satelliteCard,
            {
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.85)',
              borderColor: isLight ? 'rgba(0, 87, 255, 0.15)' : 'rgba(255, 255, 255, 0.15)',
              shadowColor: '#0057FF',
            },
          ]}
        >
          <Text
            style={[
              heroStyles.satelliteText,
              { color: isLight ? '#0F172A' : '#FFFFFF', fontFamily: 'Inter-SemiBold' },
            ]}
          >
            {tag1}
          </Text>
        </View>
      </Animated.View>

      {/* Floating Satellite Badge 2 (Bottom-Left) */}
      <Animated.View style={[heroStyles.satellite2, sat2Style]}>
        <View
          style={[
            heroStyles.satelliteCard,
            {
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.85)',
              borderColor: isLight ? 'rgba(0, 87, 255, 0.15)' : 'rgba(255, 255, 255, 0.15)',
              shadowColor: '#0057FF',
            },
          ]}
        >
          <Text
            style={[
              heroStyles.satelliteText,
              { color: isLight ? '#0F172A' : '#FFFFFF', fontFamily: 'Inter-SemiBold' },
            ]}
          >
            {tag2}
          </Text>
        </View>
      </Animated.View>

      {/* Central Hero 3D Card */}
      <Animated.View style={[heroStyles.centerHeroContainer, mainStyle]}>
        <LinearGradient
          colors={['#0057FF', '#2B7FFF', '#0040C1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={heroStyles.heroIconBox}
        >
          {/* Specular Light Rim */}
          <View style={heroStyles.specularRim} />

          {/* Main Icon */}
          <Ionicons name={icon as any} size={54} color="#FFFFFF" />

          {/* Subtle Inner Glow */}
          <View style={heroStyles.innerGlow} />
        </LinearGradient>

        {/* Feature Category Pill */}
        <View
          style={[
            heroStyles.bottomFeaturePill,
            {
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.9)',
              borderColor: isLight ? 'rgba(0, 87, 255, 0.2)' : 'rgba(0, 87, 255, 0.4)',
              shadowColor: '#0057FF',
            },
          ]}
        >
          <Ionicons name="sparkles" size={12} color="#0057FF" />
          <Text style={[heroStyles.bottomFeatureText, { color: '#0057FF' }]}>
            {badge}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 290,
    height: 290,
    position: 'relative',
  },
  outerGlowRing: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1.5,
  },
  middleGlowRing: {
    position: 'absolute',
    width: 195,
    height: 195,
    borderRadius: 97.5,
    borderWidth: 1.5,
  },
  satellite1: {
    position: 'absolute',
    top: 15,
    right: 2,
    zIndex: 10,
  },
  satellite2: {
    position: 'absolute',
    bottom: 25,
    left: -2,
    zIndex: 10,
  },
  satelliteCard: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  satelliteText: {
    fontSize: 12,
    letterSpacing: -0.1,
  },
  centerHeroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  heroIconBox: {
    width: 124,
    height: 124,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0057FF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  specularRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  innerGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  bottomFeaturePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: -16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 6,
  },
  bottomFeatureText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.2,
  },
});

import BouncyPressable from '@/components/common/BouncyPressable';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      router.replace('/(auth)/welcome');
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderItem = ({ item }: { item: typeof SLIDES[0] }) => {
    const isLight = mode === 'light';
    const topGradientColors = isLight
      ? ['#EFF4FF', '#F8F7F4']
      : ['#0B1326', '#070B14'];

    return (
      <View style={{ width, flex: 1 }}>
        <LinearGradient
          colors={topGradientColors as any}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.imageContainer}
        >
          <OnboardingHeroGraphic
            icon={item.icon}
            badge={item.badge}
            tag1={item.tag1}
            tag2={item.tag2}
          />
        </LinearGradient>
        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
            {item.title}
          </Text>
          <Text style={[styles.description, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            {item.description}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={{ flex: 1 }}
      />

      <View style={styles.bottomContainer}>
        <View style={styles.paginationRow}>
          {SLIDES.map((_, index) => (
            <View
              key={index.toString()}
              style={[
                styles.dot,
                { backgroundColor: index === currentIndex ? theme.colors.primary : theme.colors.border },
                index === currentIndex && { width: 24 }
              ]}
            />
          ))}
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}>
          <BouncyPressable
            style={[styles.nextBtn, { backgroundColor: theme.colors.primary }]}
            hapticType="medium"
            onPress={handleNext}
          >
            <Text style={[styles.nextBtnText, { fontFamily: 'Inter-SemiBold' }]}>
              {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
          </BouncyPressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  imageContainer: {
    height: '55%',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
  },
  paginationRow: {
    flexDirection: 'row',
    marginBottom: 40,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    width: '100%',
    paddingHorizontal: 24,
  },
  nextBtn: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0057FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 17,
  },
});
