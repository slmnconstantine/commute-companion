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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { isValidEmail } from '@/utils/validators';

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { signIn } = useAuth();

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
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
            Welcome back
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            Sign in to continue your journey
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>
              Email or Username
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: errors.identifier ? theme.colors.error : theme.colors.border,
                },
              ]}
            >
              <Ionicons name="person-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
              <View style={styles.inputWrapper}>
                <TextInputField
                  value={identifier}
                  onChangeText={(text: string) => {
                    setIdentifier(text);
                    if (errors.identifier) setErrors((e) => ({ ...e, identifier: undefined }));
                  }}
                  placeholder="Enter your email or username"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="none"
                  textColor={theme.colors.text}
                />
              </View>
            </View>
            {errors.identifier && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>{errors.identifier}</Text>
            )}
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>
              Password
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: errors.password ? theme.colors.error : theme.colors.border,
                },
              ]}
            >
              <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
              <View style={styles.inputWrapper}>
                <TextInputField
                  value={password}
                  onChangeText={(text: string) => {
                    setPassword(text);
                    if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor={theme.colors.textMuted}
                  secureTextEntry={!showPassword}
                  textColor={theme.colors.text}
                />
              </View>
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.colors.textMuted}
                />
              </Pressable>
            </View>
            {errors.password && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>{errors.password}</Text>
            )}
          </View>

          {/* Forgot Password */}
          <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={[styles.forgotText, { color: theme.colors.primary }]}>
              Forgot Password?
            </Text>
          </Pressable>

          {/* Sign In Button */}
          <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: 8 }}>
            <Pressable
              style={[
                styles.signInButton,
                { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 },
              ]}
              onPress={handleSignIn}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              disabled={loading}
            >
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
          <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
            Don't have an account?{' '}
          </Text>
          <Pressable onPress={() => router.replace('/(auth)/sign-up')}>
            <Text style={[styles.footerLink, { color: theme.colors.primary }]}>Sign Up</Text>
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
      style={[styles.textInput, { color: textColor, fontFamily: 'Inter-Regular' }]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginTop: 32,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    lineHeight: 24,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 4,
  },
  inputIcon: {
    marginLeft: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  textInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginLeft: 4,
  },
  forgotText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'right',
  },
  signInButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
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
    paddingTop: 24,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  footerLink: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
});
