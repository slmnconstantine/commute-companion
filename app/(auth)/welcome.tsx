import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  // Animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(40)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered entrance animations
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(buttonsTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(buttonsOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Continuous pulse animation for the logo ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#0F766E', '#0D9488', '#14B8A6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Decorative circles */}
        <View style={[styles.decorCircle, styles.circle1]} />
        <View style={[styles.decorCircle, styles.circle2]} />
        <View style={[styles.decorCircle, styles.circle3]} />

        {/* Logo Section */}
        <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
          <View style={styles.logoContainer}>
            <Animated.View
              style={[
                styles.logoRing,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: logoOpacity,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.logoCircle,
                {
                  transform: [{ scale: logoScale }],
                  opacity: logoOpacity,
                },
              ]}
            >
              <Ionicons name="car-sport" size={48} color="#0D9488" />
            </Animated.View>
          </View>

          {/* App Name */}
          <Animated.Text
            style={[
              styles.appName,
              {
                transform: [{ translateY: titleTranslateY }],
                opacity: titleOpacity,
              },
            ]}
          >
            {APP_NAME}
          </Animated.Text>

          {/* Tagline */}
          <Animated.Text
            style={[
              styles.tagline,
              {
                transform: [{ translateY: taglineTranslateY }],
                opacity: taglineOpacity,
              },
            ]}
          >
            {APP_TAGLINE}
          </Animated.Text>

          {/* Features */}
          <Animated.View
            style={[
              styles.features,
              {
                transform: [{ translateY: taglineTranslateY }],
                opacity: taglineOpacity,
              },
            ]}
          >
            <FeatureItem icon="location" text="Smart Route Matching" />
            <FeatureItem icon="people" text="Community Carpooling" />
            <FeatureItem icon="shield-checkmark" text="Verified Drivers" />
          </Animated.View>
        </View>

        {/* Buttons */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              paddingBottom: insets.bottom + 40,
              transform: [{ translateY: buttonsTranslateY }],
              opacity: buttonsOpacity,
            },
          ]}
        >
          <Animated.View>
            <PressableButton
              title="Get Started"
              onPress={() => router.push('/(auth)/sign-up')}
              variant="filled"
            />
          </Animated.View>
          <View style={styles.buttonGap} />
          <PressableButton
            title="I already have an account"
            onPress={() => router.push('/(auth)/sign-in')}
            variant="outline"
          />
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon as any} size={18} color="#0D9488" />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function PressableButton({
  title,
  onPress,
  variant,
}: {
  title: string;
  onPress: () => void;
  variant: 'filled' | 'outline';
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <View
        style={[
          styles.button,
          variant === 'filled' ? styles.buttonFilled : styles.buttonOutline,
        ]}
        onTouchStart={onPressIn}
        onTouchEnd={() => {
          onPressOut();
          onPress();
        }}
      >
        <Text
          style={[
            styles.buttonText,
            variant === 'filled' ? styles.buttonTextFilled : styles.buttonTextOutline,
          ]}
        >
          {title}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  circle1: {
    width: 300,
    height: 300,
    top: -80,
    right: -80,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: 120,
    left: -60,
  },
  circle3: {
    width: 150,
    height: 150,
    top: height * 0.4,
    right: -30,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  logoRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  appName: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 8,
  },
  features: {
    marginTop: 40,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  buttonContainer: {
    paddingHorizontal: 24,
  },
  buttonGap: {
    height: 12,
  },
  button: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFilled: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonOutline: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  buttonTextFilled: {
    color: '#0D9488',
  },
  buttonTextOutline: {
    color: '#FFFFFF',
  },
});
