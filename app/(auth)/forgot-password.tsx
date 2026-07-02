import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map, Camera, type CameraRef } from '@maplibre/maplibre-react-native';
import { resetPassword } from '@/services/auth';
import { isValidEmail } from '@/utils/validators';

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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraRef>(null);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const buttonScale = useRef(new Animated.Value(1)).current;

  const handleReset = async () => {
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: resetError } = await resetPassword(email.trim());
      if (resetError) {
        Alert.alert('Error', resetError.message);
      } else {
        setSent(true);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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

      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        {/* Back Button */}
        <Pressable 
          style={[styles.backButton, { marginTop: 8 }]} 
          onPress={() => router.back()}
        >
          <View style={styles.backButtonBackground} />
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </Pressable>

        {sent ? (
          <View style={styles.sentContainer}>
            <View style={styles.glassCard}>
              <View style={styles.iconCircle}>
                <Ionicons name="mail-open" size={44} color={COLORS.primary} />
              </View>
              <Text style={styles.sentTitle}>Check your email</Text>
              <Text style={styles.sentSubtitle}>
                We've sent password reset instructions to {'\n'}
                <Text style={{ color: COLORS.text, fontFamily: 'Inter-SemiBold' }}>{email}</Text>
              </Text>
              
              <Pressable
                style={styles.button}
                onPress={() => router.replace('/(auth)/sign-in')}
              >
                <View style={[StyleSheet.absoluteFill, styles.buttonPrimaryGlow]} />
                <Text style={styles.buttonText}>Back to Sign In</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Forgot password?</Text>
              <Text style={styles.subtitle}>
                Enter your email and we'll send you a link to reset your password.
              </Text>
            </View>

            <View style={styles.glassCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.inputContainer, {
                  borderColor: error ? COLORS.error : COLORS.surfaceBorder,
                }]}>
                  <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={{ marginLeft: 12 }} />
                  <TextInput
                    value={email}
                    onChangeText={(t) => { setEmail(t); setError(''); }}
                    placeholder="Enter your email"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={[styles.textInput, { color: COLORS.text }]}
                  />
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>

              <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: 8 }}>
                <Pressable
                  style={[styles.button, { opacity: loading ? 0.7 : 1 }]}
                  onPress={handleReset}
                  onPressIn={() => Animated.spring(buttonScale, { toValue: 0.97, useNativeDriver: true }).start()}
                  onPressOut={() => Animated.spring(buttonScale, { toValue: 1, friction: 5, useNativeDriver: true }).start()}
                  disabled={loading}
                >
                  <View style={[StyleSheet.absoluteFill, styles.buttonPrimaryGlow]} />
                  <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
                </Pressable>
              </Animated.View>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
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
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  backButtonBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
  },
  header: {
    marginTop: 24,
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    letterSpacing: -0.5,
    lineHeight: 40,
    color: COLORS.text,
    fontFamily: 'Inter-Bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    lineHeight: 24,
    color: COLORS.textMuted,
    fontFamily: 'Inter-Regular',
  },
  glassCard: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    marginLeft: 4,
    color: COLORS.text,
    fontFamily: 'Inter-Medium',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  textInput: {
    flex: 1,
    height: 54,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginLeft: 4,
    color: COLORS.error,
    marginTop: 4,
  },
  button: {
    height: 56,
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
  sentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 60,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  sentTitle: {
    fontSize: 24,
    color: COLORS.text,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  sentSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textMuted,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
});
