import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { isValidEmail, isValidPassword, isNotEmpty } from '@/utils/validators';
import AuthBackground from '@/components/common/AuthBackground';

// Signal Blue Palette
const COLORS = {
  primary: '#0057FF',
  primaryGlow: 'rgba(0, 87, 255, 0.45)',
  surface: 'rgba(15, 23, 42, 0.65)',
  surfaceBorder: 'rgba(255, 255, 255, 0.1)',
  text: '#FFFFFF',
  textMuted: 'rgba(248, 247, 244, 0.7)',
  background: '#070B14',
  error: '#EF4444',
};

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const isLight = true;

  const [loading, setLoading] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const buttonScale = useRef(new Animated.Value(1)).current;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!isNotEmpty(fullName)) newErrors.fullName = 'Full name is required';
    
    if (!isNotEmpty(username)) {
      newErrors.username = 'Username is required';
    } else if (username.includes(' ') || !/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Only letters, numbers, and underscores';
    } else if (username.length < 3) {
      newErrors.username = 'Minimum 3 characters';
    }

    if (!isValidEmail(email)) newErrors.email = 'Enter a valid email';
    const passwordCheck = isValidPassword(password);
    if (!passwordCheck.valid) newErrors.password = passwordCheck.message;
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // All users default to 'commuter' role
      const { error } = await signUp(email.trim(), password, username.trim(), fullName.trim(), 'commuter');
      if (error) {
        Alert.alert('Registration Failed', error.message || 'Could not create account.');
      } else {
        Alert.alert(
          'Account Created!',
          'Please check your email to verify your account, then sign in.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/sign-in') }]
        );
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
        <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} translucent backgroundColor="transparent" />

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
          <View style={[
              styles.backButtonBackground,
              {
                backgroundColor: isLight ? '#FFFFFF' : 'rgba(0, 0, 0, 0.35)',
                borderColor: isLight ? '#E8E6DF' : 'rgba(255, 255, 255, 0.08)',
              },
            ]} />
          <Ionicons name="arrow-back" size={22} color={textColor} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>Create account</Text>
          <Text style={[styles.subtitle, { color: textMutedColor }]}>Fill in your details to get started as a commuter</Text>
        </View>

        {/* Form Container */}
        <View style={[
              styles.glassCard,
              {
                backgroundColor: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
                borderColor: isLight ? '#E8E6DF' : 'rgba(255, 255, 255, 0.1)',
                shadowColor: isLight ? '#0057FF' : '#000',
                shadowOpacity: isLight ? 0.06 : 0.3,
              },
            ]}>
          <InputField
            label="Full Name"
            value={fullName}
            onChangeText={(t: string) => {
              setFullName(t);
              setErrors((e) => ({ ...e, fullName: '' }));
            }}
            placeholder="Juan Dela Cruz"
            icon="person-outline"
            error={errors.fullName}
            isLight={isLight}
          />
          <InputField
            label="Username"
            value={username}
            onChangeText={(t: string) => {
              setUsername(t);
              setErrors((e) => ({ ...e, username: '' }));
            }}
            placeholder="juandc"
            icon="at-outline"
            autoCapitalize="none"
            error={errors.username}
            isLight={isLight}
          />
          <InputField
            label="Email"
            value={email}
            onChangeText={(t: string) => {
              setEmail(t);
              setErrors((e) => ({ ...e, email: '' }));
            }}
            placeholder="juan@email.com"
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            isLight={isLight}
          />
          <InputField
            label="Password"
            value={password}
            onChangeText={(t: string) => {
              setPassword(t);
              setErrors((e) => ({ ...e, password: '' }));
            }}
            placeholder="Min. 8 characters"
            icon="lock-closed-outline"
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword(!showPassword)}
            error={errors.password}
            isLight={isLight}
          />
          <InputField
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(t: string) => {
              setConfirmPassword(t);
              setErrors((e) => ({ ...e, confirmPassword: '' }));
            }}
            placeholder="Re-enter password"
            icon="lock-closed-outline"
            secureTextEntry={!showPassword}
            error={errors.confirmPassword}
            isLight={isLight}
          />

          {/* Action Button */}
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Pressable
              style={[styles.actionButton, { opacity: loading ? 0.7 : 1 }]}
              onPress={handleSignUp}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              disabled={loading}
            >
              <Text style={styles.actionButtonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* Sign In Link */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={[styles.footerText, { color: textMutedColor }]}>
            Already have an account?{' '}
          </Text>
          <Pressable onPress={() => router.replace('/(auth)/sign-in')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </AuthBackground>
  );
}

/** Reusable input field */
function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  rightIcon,
  onRightIconPress,
  error,
  isLight,
}: any) {
  const textColor = isLight ? '#0F172A' : '#FFFFFF';
  const textMutedColor = isLight ? '#64748B' : 'rgba(248, 247, 244, 0.7)';
  const inputBgColor = isLight ? '#F0EFEA' : 'rgba(0, 0, 0, 0.35)';
  const inputBorderColor = isLight ? '#E8E6DF' : 'rgba(255, 255, 255, 0.1)';

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: textColor }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: inputBgColor,
            borderColor: error ? '#EF4444' : inputBorderColor,
          },
        ]}
      >
        <Ionicons name={icon} size={20} color={textMutedColor} style={{ marginLeft: 12 }} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={textMutedColor}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          style={[styles.textInput, { color: textColor }]}
        />
        {rightIcon && (
          <Pressable onPress={onRightIconPress} style={{ padding: 12 }}>
            <Ionicons name={rightIcon} size={20} color={textMutedColor} />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
    </View>
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
    gap: 16,
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
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderColor: 'rgba(13, 148, 136, 0.2)',
  },
  roleInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textMuted,
    fontFamily: 'Inter-Regular',
  },
  actionContainer: {
    marginTop: 12,
  },
  actionButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
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
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
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
