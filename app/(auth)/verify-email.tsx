import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Alert,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map, Camera, type CameraRef } from '@maplibre/maplibre-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

// Premium Dark Theme Colors
const COLORS = {
  primary: '#0D9488',
  primaryGlow: 'rgba(13, 148, 136, 0.4)',
  surface: 'rgba(0, 0, 0, 0.45)',
  surfaceBorder: 'rgba(255, 255, 255, 0.1)',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  background: '#000000',
  error: '#EF4444',
  success: '#10B981',
};

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraRef>(null);
  const { session, signOut } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const primaryButtonScale = useRef(new Animated.Value(1)).current;
  const skipButtonScale = useRef(new Animated.Value(1)).current;

  const handleCheckVerification = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      if (data?.session?.user?.email_confirmed_at) {
        Alert.alert('Success', 'Email verified successfully!', [
          { text: 'Continue', onPress: () => router.replace('/(main)/(tabs)') }
        ]);
      } else {
        Alert.alert('Not Verified', 'Your email has not been verified yet. Please check your inbox.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!session?.user?.email) return;
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: session.user.email,
      });
      if (error) throw error;
      Alert.alert('Sent', 'A new verification link has been sent to your email.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resend verification.');
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('@skipped_verification', 'true');
    // Once skipped, we can push to main tabs
    router.replace('/(main)/(tabs)');
  };
  
  const handleSignOut = async () => {
    await signOut();
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
        
        {/* Deep Gradient Overlay */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
      </View>

      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
        
        <View style={styles.sentContainer}>
          <View style={styles.glassCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-unread" size={44} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>
              We sent a verification link to {'\n'}
              <Text style={{ color: COLORS.text, fontFamily: 'Inter-SemiBold' }}>{session?.user?.email || 'your email'}</Text>
            </Text>
            
            {/* Primary Action */}
            <Animated.View style={{ transform: [{ scale: primaryButtonScale }], marginTop: 16 }}>
              <Pressable
                accessibilityLabel="I have verified my email"
                accessibilityRole="button"
                style={[styles.button, { opacity: loading ? 0.7 : 1 }]}
                onPress={handleCheckVerification}
                onPressIn={() => Animated.spring(primaryButtonScale, { toValue: 0.97, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(primaryButtonScale, { toValue: 1, friction: 5, useNativeDriver: true }).start()}
                disabled={loading}
              >
                <View style={[StyleSheet.absoluteFill, styles.buttonPrimaryGlow]} />
                <Text style={styles.buttonText}>{loading ? 'Checking...' : "I've Verified My Email"}</Text>
              </Pressable>
            </Animated.View>

            {/* Skip Action (Soft Gate) */}
            <Animated.View style={{ transform: [{ scale: skipButtonScale }], marginTop: 12 }}>
              <Pressable
                accessibilityLabel="Skip email verification for now"
                accessibilityRole="button"
                style={styles.buttonGlass}
                onPress={handleSkip}
                onPressIn={() => Animated.spring(skipButtonScale, { toValue: 0.97, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(skipButtonScale, { toValue: 1, friction: 5, useNativeDriver: true }).start()}
              >
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
                <Text style={styles.buttonTextGlass}>Skip for now</Text>
              </Pressable>
            </Animated.View>

            {/* Resend Action */}
            <Pressable 
              onPress={handleResend} 
              style={styles.resendButton}
              accessibilityLabel="Resend verification email link"
              accessibilityRole="button"
            >
              <Text style={styles.resendText}>Didn't receive it? Resend Link</Text>
            </Pressable>
          </View>
        </View>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <Pressable 
            onPress={handleSignOut}
            accessibilityLabel="Sign out of your account"
            accessibilityRole="button"
          >
            <Text style={styles.footerLink}>Sign out</Text>
          </Pressable>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  map: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  sentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  glassCard: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    color: COLORS.text,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textMuted,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    height: 56,
    width: '100%',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.primary,
  },
  buttonPrimaryGlow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  buttonGlass: {
    height: 56,
    width: '100%',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  buttonTextGlass: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  resendButton: {
    marginTop: 20,
    padding: 8,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerLink: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
});
