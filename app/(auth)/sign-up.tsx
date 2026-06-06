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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { isValidEmail, isValidPassword, isNotEmpty } from '@/utils/validators';

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { signUp } = useAuth();

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
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
            Create account
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            Fill in your details to get started as a commuter
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
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
            theme={theme}
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
            theme={theme}
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
            theme={theme}
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
            theme={theme}
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
            theme={theme}
          />
        </View>

        {/* Commuter role info */}
        <View style={[styles.roleInfo, { backgroundColor: `${theme.colors.primary}10`, borderColor: `${theme.colors.primary}30` }]}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <Text style={[styles.roleInfoText, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            You'll start as a <Text style={{ fontFamily: 'Inter-SemiBold', color: theme.colors.primary }}>Commuter</Text>. You can upgrade to a Driver anytime from your profile.
          </Text>
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]}
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
          <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
            Already have an account?{' '}
          </Text>
          <Pressable onPress={() => router.replace('/(auth)/sign-in')}>
            <Text style={[styles.footerLink, { color: theme.colors.primary }]}>Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  theme,
}: any) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.error : theme.colors.border,
          },
        ]}
      >
        <Ionicons name={icon} size={20} color={theme.colors.textMuted} style={{ marginLeft: 12 }} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          style={[styles.textInput, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]}
        />
        {rightIcon && (
          <Pressable onPress={onRightIconPress} style={{ padding: 12 }}>
            <Ionicons name={rightIcon} size={20} color={theme.colors.textMuted} />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { marginTop: 24, marginBottom: 32 },
  title: { fontSize: 32, letterSpacing: -0.5, lineHeight: 40 },
  subtitle: { fontSize: 16, marginTop: 8, lineHeight: 24 },
  form: { gap: 16 },
  inputGroup: { gap: 6 },
  label: { fontSize: 14, marginLeft: 4 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  textInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginLeft: 4,
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  roleInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  actionContainer: { marginTop: 24 },
  actionButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
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
    paddingTop: 24,
  },
  footerText: { fontSize: 14, fontFamily: 'Inter-Regular' },
  footerLink: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
});
