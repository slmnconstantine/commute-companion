import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withDelay, Easing } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

export default function NotFoundScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  // Animations
  const bounceAnim = useSharedValue(0);
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);

  useEffect(() => {
    // Icon float animation (loops)
    bounceAnim.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Content fade-in + slide-up
    fadeAnim.value = withDelay(200, withTiming(1, { duration: 600 }));
    slideAnim.value = withDelay(200, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounceAnim.value }]
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }]
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Floating compass icon */}
      <Animated.View style={[styles.iconWrapper, iconStyle]}>
        <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}12` }]}>
          <Ionicons name="compass-outline" size={64} color={theme.colors.primary} />
        </View>
      </Animated.View>

      {/* Text content with entrance animation */}
      <Animated.View
        style={[
          styles.textContent,
          contentStyle,
        ]}
      >
        <Text style={[styles.errorCode, { color: theme.colors.textMuted, fontFamily: 'Inter-Bold' }]}>
          404
        </Text>
        <Text style={[styles.title, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
          Page Not Found
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
          Looks like you've taken a wrong turn.{'\n'}Let's get you back on track.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: theme.colors.primary,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
          onPress={() => router.replace('/')}
        >
          <Ionicons name="home-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Go Home</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.backLink,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={16} color={theme.colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={[styles.backLinkText, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>
            Go Back
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconWrapper: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: {
    alignItems: 'center',
  },
  errorCode: {
    fontSize: 48,
    letterSpacing: -2,
    marginBottom: 4,
    opacity: 0.15,
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    height: 52,
    borderRadius: 16,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 8,
  },
  backLinkText: {
    fontSize: 14,
  },
});
