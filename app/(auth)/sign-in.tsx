import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Animated,
  Alert,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map, Camera, type CameraRef } from '@maplibre/maplibre-react-native';
import { useAuth } from '@/context/AuthContext';
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
};

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const cameraRef = useRef<CameraRef>(null);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  const buttonScale = useRef(new Animated.Value(1)).current;

  const validate = () => {
    const newErrors: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) {
      newErrors.identifier = 'Email or Username is required';
    } else if (identifier.includes('@') && !isValidEmail(identifier)) {
      newErrors.identifier = 'Enter a valid email';
    }
    
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await signIn(identifier.trim(), password);
      if (error) {
        Alert.alert('Sign In Failed', error.message || 'Invalid credentials.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const onPressIn = () => {
    Animated.spring(buttonScale, { toValue: 0.97, useNativeDriver: true }).start();
  };

  const onPressOut = () => {
    Animated.spring(buttonScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
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

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <Pressable 
          style={[styles.backButton, { marginTop: 8 }]} 
          onPress={() => router.back()}
        >
          <View style={styles.backButtonBackground} />
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue your journey</Text>
        </View>

        {/* Form Container (Glassmorphic) */}
        <View style={styles.glassCard}>
          {/* Identifier Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email or Username</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  borderColor: errors.identifier ? COLORS.error : COLORS.surfaceBorder,
                },
              ]}
            >
              <Ionicons name="person-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
              <View style={styles.inputWrapper}>
                <TextInputField
                  value={identifier}
                  onChangeText={(text: string) => {
                    setIdentifier(text);
                    if (errors.identifier) setErrors((e) => ({ ...e, identifier: undefined }));
                  }}
                  placeholder="Enter your email or username"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  textColor={COLORS.text}
                />
              </View>
            </View>
            {errors.identifier && (
              <Text style={styles.errorText}>{errors.identifier}</Text>
            )}
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  borderColor: errors.password ? COLORS.error : COLORS.surfaceBorder,
                },
              ]}
            >
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
              <View style={styles.inputWrapper}>
                <TextInputField
                  value={password}
                  onChangeText={(text: string) => {
                    setPassword(text);
                    if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  textColor={COLORS.text}
                  autoCapitalize="none"
                />
              </View>
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textMuted}
                />
              </Pressable>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          {/* Forgot Password */}
          <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </Pressable>

          {/* Sign In Button */}
          <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: 8 }}>
            <Pressable
              style={[
                styles.signInButton,
                { opacity: loading ? 0.7 : 1 },
              ]}
              onPress={handleSignIn}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              disabled={loading}
            >
              <View style={[StyleSheet.absoluteFill, styles.buttonPrimaryGlow]} />
              {loading ? (
                <View style={styles.loadingDots}>
                  <View style={[styles.dot, { backgroundColor: '#fff' }]} />
                  <View style={[styles.dot, { backgroundColor: '#fff', opacity: 0.7 }]} />
                  <View style={[styles.dot, { backgroundColor: '#fff', opacity: 0.4 }]} />
                </View>
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </Pressable>
          </Animated.View>
        </View>

        {/* Sign Up Link */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.footerText}>
            Don't have an account?{' '}
          </Text>
          <Pressable onPress={() => router.replace('/(auth)/sign-up')}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Simple text input component to avoid import issues */
function TextInputField({
  value,
  onChangeText,
  placeholder,
  placeholderTextColor,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  textColor,
}: any) {
  const { TextInput } = require('react-native');
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      secureTextEntry={secureTextEntry}
      style={[styles.textInput, { color: textColor }]}
    />
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
  scrollContent: {
    flexGrow: 1,
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
    paddingHorizontal: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  inputIcon: {
    marginLeft: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  textInput: {
    flex: 1,
    height: 54,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
  },
  eyeButton: {
    padding: 12,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginLeft: 4,
    color: COLORS.error,
  },
  forgotText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'right',
    color: COLORS.primary,
  },
  signInButton: {
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
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 32,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: COLORS.textMuted,
  },
  footerLink: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.primary,
  },
});
