import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map, Camera, type CameraRef } from '@maplibre/maplibre-react-native';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

const { width, height } = Dimensions.get('window');

// Premium Dark Theme Colors
const COLORS = {
  primary: '#0D9488',
  primaryGlow: 'rgba(13, 148, 136, 0.4)',
  surface: 'rgba(20, 20, 20, 0.65)',
  surfaceBorder: 'rgba(255, 255, 255, 0.12)',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.7)',
  background: '#000000',
};

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraRef>(null);

  // Entrance Animations
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    // Reveal content smoothly
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 1000,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 1000,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Smooth entrance happens above. Map is static for stability.
  }, []);

  const handleGetStarted = () => {
    router.push('/(auth)/sign-up');
  };

  const handleSignIn = () => {
    router.push('/(auth)/sign-in');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* MapLibre Animated Background */}
      <View style={StyleSheet.absoluteFill}>
        <Map
          style={styles.map}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json"
          logo={false}
          attribution={false}
          compass={false}
          dragPan={false}
          touchZoom={false}
          doubleTapZoom={false}
          doubleTapHoldZoom={false}
          touchPitch={false}
          touchRotate={false}
        >
          <Camera
            ref={cameraRef}
            initialViewState={{
              center: [123.891, 10.315], // Cebu City
              zoom: 13,
              pitch: 65,
              bearing: 0,
            }}
          />
        </Map>
        
        {/* Deep Gradient Overlay to ensure text readability */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
      </View>

      {/* Animated Content Wrapper */}
      <Animated.ScrollView 
        contentContainerStyle={[
          styles.contentWrapper, 
          { 
            paddingTop: insets.top + 60,
            paddingBottom: Math.max(insets.bottom, 20) + 40,
          }
        ]}
        style={{
          flex: 1,
          opacity: contentOpacity,
          transform: [{ translateY: contentTranslateY }]
        }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header / Logo */}
        <View style={styles.header}>
          <View style={styles.logoGlassWrapper}>
            <View style={styles.logoGlass}>
              <Ionicons name="car-sport" size={42} color={COLORS.primary} />
            </View>
          </View>
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.tagline}>{APP_TAGLINE}</Text>
        </View>

        <View style={styles.spacer} />

        {/* Feature List (Glassmorphism Card) */}
        <View style={styles.glassCard}>
          <FeatureItem icon="location" title="Smart Route Matching" subtitle="Find the best routes along your commute instantly." />
          <View style={styles.divider} />
          <FeatureItem icon="people" title="Community Carpooling" subtitle="Connect with peers and save on daily travel costs." />
          <View style={styles.divider} />
          <FeatureItem icon="shield-checkmark" title="Verified Drivers" subtitle="Secure, trusted platform with identity verification." />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <PressableButton 
            title="Get Started" 
            onPress={handleGetStarted} 
            variant="primary" 
          />
          <PressableButton 
            title="I already have an account" 
            onPress={handleSignIn} 
            variant="glass" 
          />
        </View>
      </Animated.ScrollView>
    </View>
  );
}

// ─── Subcomponents ───

function FeatureItem({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconWrapper}>
        <Ionicons name={icon as any} size={22} color={COLORS.primary} />
      </View>
      <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function PressableButton({ title, onPress, variant }: { title: string; onPress: () => void; variant: 'primary' | 'glass' }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  const isPrimary = variant === 'primary';

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '100%', marginBottom: 16 }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={[
          styles.buttonBase,
          isPrimary ? styles.buttonPrimary : styles.buttonGlass,
        ]}
      >
        {/* Glow effect for primary button */}
        {isPrimary && (
          <View style={[StyleSheet.absoluteFill, styles.buttonPrimaryGlow]} />
        )}
        
        {/* Blur background for glass button */}
        {!isPrimary && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
        )}

        <Text style={[styles.buttonText, isPrimary ? styles.buttonTextPrimary : styles.buttonTextGlass]}>
          {title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  map: {
    flex: 1,
  },
  contentWrapper: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoGlassWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 24,
  },
  logoGlass: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  appName: {
    fontSize: 34,
    fontFamily: 'Inter-Bold',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  spacer: {
    flex: 1,
  },
  glassCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: COLORS.textMuted,
  },
  buttonContainer: {
    width: '100%',
  },
  buttonBase: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonPrimaryGlow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  buttonGlass: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    zIndex: 1,
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
  },
  buttonTextGlass: {
    color: '#FFFFFF',
  },
});
