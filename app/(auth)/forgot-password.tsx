import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { resetPassword } from '@/services/auth';
import { isValidEmail } from '@/utils/validators';
import AuthBackground from '@/components/common/AuthBackground';

const COLORS = {
  primary: '#0057FF',
  error: '#EF4444',
  text: '#0F172A',
  textMuted: '#64748B',
  surface: '#FFFFFF',
  surfaceBorder: '#E8E6DF',
  background: '#F8F7F4',
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useTheme();
  const isLight = mode === 'light';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const buttonScale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }]
  }));

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

  const textColor = isLight ? '#0F172A' : '#FFFFFF';
  const textMutedColor = isLight ? '#64748B' : 'rgba(248, 247, 244, 0.7)';
  const inputBgColor = isLight ? '#F0EFEA' : 'rgba(0, 0, 0, 0.35)';
  const inputBorderColor = isLight ? '#E8E6DF' : 'rgba(255, 255, 255, 0.1)';

  return (
    <AuthBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar
          barStyle={isLight ? 'dark-content' : 'light-content'}
          translucent
          backgroundColor="transparent"
        />

        <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
          {/* Back Button */}
          <Pressable
            style={[styles.backButton, { marginTop: 8 }]}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            }}
          >
            <View
              style={[
                styles.backButtonBackground,
                {
                  backgroundColor: isLight ? '#FFFFFF' : 'rgba(0, 0, 0, 0.35)',
                  borderColor: isLight ? '#E8E6DF' : 'rgba(255, 255, 255, 0.08)',
                },
              ]}
            />
            <Ionicons name="arrow-back" size={22} color={textColor} />
          </Pressable>

          {sent ? (
            <View style={styles.sentContainer}>
              <View
                style={[
                  styles.glassCard,
                  {
                    backgroundColor: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
                    borderColor: isLight ? '#E8E6DF' : 'rgba(255, 255, 255, 0.1)',
                    shadowColor: isLight ? '#0057FF' : '#000',
                    shadowOpacity: isLight ? 0.06 : 0.3,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: isLight ? '#EBF2FF' : 'rgba(0, 87, 255, 0.15)',
                    },
                  ]}
                >
                  <Ionicons name="mail-open" size={44} color="#0057FF" />
                </View>
                <Text style={[styles.sentTitle, { color: textColor }]}>Check your email</Text>
                <Text style={[styles.sentSubtitle, { color: textMutedColor }]}>
                  We've sent password reset instructions to {'\n'}
                  <Text style={{ color: textColor, fontFamily: 'Inter-SemiBold' }}>{email}</Text>
                </Text>

                <Pressable
                  style={styles.button}
                  onPress={() => router.replace('/(auth)/sign-in')}
                >
                  <Text style={styles.buttonText}>Back to Sign In</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={[styles.title, { color: textColor }]}>Forgot password?</Text>
                <Text style={[styles.subtitle, { color: textMutedColor }]}>
                  Enter your email and we'll send you a link to reset your password.
                </Text>
              </View>

              <View
                style={[
                  styles.glassCard,
                  {
                    backgroundColor: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
                    borderColor: isLight ? '#E8E6DF' : 'rgba(255, 255, 255, 0.1)',
                    shadowColor: isLight ? '#0057FF' : '#000',
                    shadowOpacity: isLight ? 0.06 : 0.3,
                  },
                ]}
              >
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: textColor }]}>Email</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: inputBgColor,
                        borderColor: error ? '#EF4444' : inputBorderColor,
                      },
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={textMutedColor}
                      style={{ marginLeft: 12 }}
                    />
                    <TextInput
                      value={email}
                      onChangeText={(t) => {
                        setEmail(t);
                        setError('');
                      }}
                      placeholder="Enter your email"
                      placeholderTextColor={textMutedColor}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={[styles.textInput, { color: textColor }]}
                    />
                  </View>
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </View>

                <Animated.View style={[animatedButtonStyle, { marginTop: 8 }]}>
                  <Pressable
                    style={[styles.button, { opacity: loading ? 0.7 : 1 }]}
                    onPress={handleReset}
                    onPressIn={() => {
                      buttonScale.value = withTiming(0.97, {
                        duration: 100,
                        easing: Easing.out(Easing.cubic),
                      });
                    }}
                    onPressOut={() => {
                      buttonScale.value = withSpring(1, {
                        damping: 15,
                        stiffness: 300,
                        mass: 0.5,
                      });
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </Text>
                  </Pressable>
                </Animated.View>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
