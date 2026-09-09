import React, { useState } from 'react';
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
import { updatePassword } from '@/services/auth';
import AuthBackground from '@/components/common/AuthBackground';

const COLORS = {
  primary: '#0057FF',
  error: '#EF4444',
  success: '#10B981',
  text: '#0F172A',
  textMuted: '#64748B',
  surface: '#FFFFFF',
  surfaceBorder: '#E8E6DF',
  background: '#F8F7F4',
};

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isLight = true;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const buttonScale = useSharedValue(1);
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleUpdatePassword = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { error: updateError } = await updatePassword(password);
      if (updateError) {
        Alert.alert('Error', updateError.message);
      } else {
        setSuccess(true);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update password');
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
            onPress={() => router.replace('/(auth)/sign-in')}
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

          {success ? (
            <View style={styles.sentContainer}>
              <View
                style={[
                  styles.glassCard,
                  {
                    backgroundColor: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
                    borderColor: isLight ? '#E8E6DF' : 'rgba(255, 255, 255, 0.1)',
                    shadowColor: '#10B981',
                    shadowOpacity: 0.08,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={44} color="#10B981" />
                </View>
                <Text style={[styles.sentTitle, { color: textColor }]}>Password Reset!</Text>
                <Text style={[styles.sentSubtitle, { color: textMutedColor }]}>
                  Your password has been successfully updated. You can now sign in with your new password.
                </Text>

                <Pressable
                  style={styles.button}
                  onPress={() => router.replace('/(auth)/sign-in')}
                >
                  <Text style={styles.buttonText}>Proceed to Sign In</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={[styles.title, { color: textColor }]}>Set new password</Text>
                <Text style={[styles.subtitle, { color: textMutedColor }]}>
                  Choose a secure password with at least 8 characters.
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
                {/* New Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: textColor }]}>New Password</Text>
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
                      name="lock-closed-outline"
                      size={20}
                      color={textMutedColor}
                      style={{ marginLeft: 12 }}
                    />
                    <TextInput
                      value={password}
                      onChangeText={(t) => {
                        setPassword(t);
                        setError('');
                      }}
                      placeholder="Enter new password"
                      placeholderTextColor={textMutedColor}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      style={[styles.textInput, { color: textColor }]}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={{ paddingHorizontal: 12 }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={textMutedColor}
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: textColor }]}>Confirm Password</Text>
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
                      name="shield-checkmark-outline"
                      size={20}
                      color={textMutedColor}
                      style={{ marginLeft: 12 }}
                    />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={(t) => {
                        setConfirmPassword(t);
                        setError('');
                      }}
                      placeholder="Confirm new password"
                      placeholderTextColor={textMutedColor}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      style={[styles.textInput, { color: textColor }]}
                    />
                    <Pressable
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ paddingHorizontal: 12 }}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={textMutedColor}
                      />
                    </Pressable>
                  </View>
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </View>

                {/* Password Criteria */}
                <View style={styles.tipsContainer}>
                  <Text
                    style={[
                      styles.tipItem,
                      { color: password.length >= 8 ? '#10B981' : textMutedColor },
                    ]}
                  >
                    <Ionicons
                      name={password.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'}
                      size={12}
                    />{' '}
                    Min. 8 characters
                  </Text>
                  <Text
                    style={[
                      styles.tipItem,
                      { color: /[A-Z]/.test(password) ? '#10B981' : textMutedColor },
                    ]}
                  >
                    <Ionicons
                      name={/[A-Z]/.test(password) ? 'checkmark-circle' : 'ellipse-outline'}
                      size={12}
                    />{' '}
                    At least one uppercase letter
                  </Text>
                  <Text
                    style={[
                      styles.tipItem,
                      { color: /[0-9]/.test(password) ? '#10B981' : textMutedColor },
                    ]}
                  >
                    <Ionicons
                      name={/[0-9]/.test(password) ? 'checkmark-circle' : 'ellipse-outline'}
                      size={12}
                    />{' '}
                    At least one number
                  </Text>
                </View>

                <Animated.View style={[animatedButtonStyle, { marginTop: 12 }]}>
                  <Pressable
                    style={[styles.button, { opacity: loading ? 0.7 : 1 }]}
                    onPress={handleUpdatePassword}
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
                      {loading ? 'Updating...' : 'Update Password'}
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
    marginBottom: 24,
  },
  backButtonBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 1,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  glassCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  textInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    fontSize: 15,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  tipsContainer: {
    gap: 4,
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 12,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#0057FF',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0057FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sentTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  sentSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
});
