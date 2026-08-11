import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Pressable,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';
import { useTheme } from '@/context/ThemeContext';
import AuthBackground from '@/components/common/AuthBackground';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isLight = true;

  // Entrance Animations
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 900,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 900,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    router.push('/(auth)/sign-up');
  };

  const handleSignIn = () => {
    router.push('/(auth)/sign-in');
  };

  return (
    <AuthBackground>
      <StatusBar
        barStyle={isLight ? 'dark-content' : 'light-content'}
        translucent
        backgroundColor="transparent"
      />

      {/* Animated Content Wrapper */}
      <Animated.ScrollView
        contentContainerStyle={[
          styles.contentWrapper,
          {
            paddingTop: insets.top + 40,
            paddingBottom: Math.max(insets.bottom, 20) + 30,
          },
        ]}
        style={{
          flex: 1,
          opacity: contentOpacity,
          transform: [{ translateY: contentTranslateY }],
        }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header / Logo */}
        <View style={styles.header}>
          <Animated.View
            style={[
              styles.logoHalo,
              isLight ? styles.logoHaloLight : styles.logoHaloDark,
              { transform: [{ scale: logoScale }] },
            ]}
          >
            <View style={[styles.logoCard, isLight ? styles.logoCardLight : styles.logoCardDark]}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </Animated.View>
          <Text style={[styles.appName, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
            {APP_NAME}
          </Text>
          <Text style={[styles.tagline, { color: isLight ? '#475569' : 'rgba(248, 247, 244, 0.7)' }]}>
            {APP_TAGLINE}
          </Text>
        </View>

        <View style={styles.spacer} />

        {/* Feature List (Card) */}
        <View style={[styles.glassCard, isLight ? styles.cardLight : styles.cardDark]}>
          <FeatureItem
            icon="location"
            title="Smart Route Matching"
            subtitle="Find the best routes along your commute instantly."
            isLight={isLight}
          />
          <View style={[styles.divider, { backgroundColor: isLight ? '#F0EFEA' : 'rgba(255, 255, 255, 0.06)' }]} />
          <FeatureItem
            icon="people"
            title="Community Carpooling"
            subtitle="Connect with peers and save on daily travel costs."
            isLight={isLight}
          />
          <View style={[styles.divider, { backgroundColor: isLight ? '#F0EFEA' : 'rgba(255, 255, 255, 0.06)' }]} />
          <FeatureItem
            icon="shield-checkmark"
            title="Verified Drivers"
            subtitle="Secure, trusted platform with identity verification."
            isLight={isLight}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <PressableButton
            title="Get Started"
            onPress={handleGetStarted}
            variant="primary"
            isLight={isLight}
          />
          <PressableButton
            title="I already have an account"
            onPress={handleSignIn}
            variant="secondary"
            isLight={isLight}
          />
        </View>
      </Animated.ScrollView>
    </AuthBackground>
  );
}

// ─── Subcomponents ───

function FeatureItem({
  icon,
  title,
  subtitle,
  isLight,
}: {
  icon: string;
  title: string;
  subtitle: string;
  isLight: boolean;
}) {
  return (
    <View style={styles.featureItem}>
      <View
        style={[
          styles.featureIconWrapper,
          {
            backgroundColor: isLight ? '#EBF2FF' : 'rgba(0, 87, 255, 0.15)',
            borderColor: isLight ? 'rgba(0, 87, 255, 0.18)' : 'rgba(0, 87, 255, 0.25)',
          },
        ]}
      >
        <Ionicons name={icon as any} size={20} color="#0057FF" />
      </View>
      <View style={styles.featureTextContainer}>
        <Text style={[styles.featureTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
          {title}
        </Text>
        <Text style={[styles.featureSubtitle, { color: isLight ? '#64748B' : 'rgba(248, 247, 244, 0.7)' }]}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function PressableButton({
  title,
  onPress,
  variant,
  isLight,
}: {
  title: string;
  onPress: () => void;
  variant: 'primary' | 'secondary';
  isLight: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  const isPrimary = variant === 'primary';

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '100%', marginBottom: 12 }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={[
          styles.buttonBase,
          isPrimary
            ? styles.buttonPrimary
            : isLight
            ? styles.buttonSecondaryLight
            : styles.buttonSecondaryDark,
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            isPrimary
              ? styles.buttonTextPrimary
              : isLight
              ? styles.buttonTextSecondaryLight
              : styles.buttonTextSecondaryDark,
          ]}
        >
          {title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  contentWrapper: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 10,
  },
  logoHalo: {
    padding: 8,
    borderRadius: 34,
    borderWidth: 1,
    marginBottom: 20,
  },
  logoHaloLight: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0, 87, 255, 0.15)',
    shadowColor: '#0057FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  logoHaloDark: {
    backgroundColor: 'rgba(0, 87, 255, 0.12)',
    borderColor: 'rgba(0, 87, 255, 0.25)',
    shadowColor: '#0057FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  logoCard: {
    width: 80,
    height: 80,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCardLight: {
    backgroundColor: '#FFFFFF',
  },
  logoCardDark: {
    backgroundColor: '#F8F7F4',
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  spacer: {
    flex: 1,
    minHeight: 20,
  },
  glassCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E6DF',
    shadowColor: '#0057FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  cardDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  featureSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  buttonContainer: {
    width: '100%',
  },
  buttonBase: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#0057FF',
    shadowColor: '#0057FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  buttonSecondaryLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D0D7E5',
    shadowColor: '#0057FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  buttonSecondaryDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  buttonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
  },
  buttonTextSecondaryLight: {
    color: '#0057FF',
  },
  buttonTextSecondaryDark: {
    color: '#FFFFFF',
  },
});


