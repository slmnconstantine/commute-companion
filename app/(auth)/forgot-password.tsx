import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Animated, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { resetPassword } from '@/services/auth';
import { isValidEmail } from '@/utils/validators';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

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
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>

        {sent ? (
          <View style={styles.sentContainer}>
            <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.success}20` }]}>
              <Ionicons name="mail-open" size={48} color={theme.colors.success} />
            </View>
            <Text style={[styles.title, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
              Check your email
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
              We've sent password reset instructions to {email}
            </Text>
            <Pressable
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.replace('/(auth)/sign-in')}
            >
              <Text style={styles.buttonText}>Back to Sign In</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
                Forgot password?
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                Enter your email and we'll send you a link to reset your password.
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={[styles.label, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>Email</Text>
              <View style={[styles.inputContainer, {
                backgroundColor: theme.colors.surface,
                borderColor: error ? theme.colors.error : theme.colors.border,
              }]}>
                <Ionicons name="mail-outline" size={20} color={theme.colors.textMuted} style={{ marginLeft: 12 }} />
                <TextInput
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(''); }}
                  placeholder="Enter your email"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.textInput, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]}
                />
              </View>
              {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}

              <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: 16 }}>
                <Pressable
                  style={[styles.button, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]}
                  onPress={handleReset}
                  onPressIn={() => Animated.spring(buttonScale, { toValue: 0.97, useNativeDriver: true }).start()}
                  onPressOut={() => Animated.spring(buttonScale, { toValue: 1, friction: 5, useNativeDriver: true }).start()}
                  disabled={loading}
                >
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
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  backButton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  header: { marginTop: 32, marginBottom: 32 },
  title: { fontSize: 32, letterSpacing: -0.5, lineHeight: 40 },
  subtitle: { fontSize: 16, marginTop: 8, lineHeight: 24 },
  form: { gap: 6 },
  label: { fontSize: 14, marginLeft: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 14, borderWidth: 1.5 },
  textInput: { flex: 1, height: 52, paddingHorizontal: 12, fontSize: 16 },
  errorText: { fontSize: 12, fontFamily: 'Inter-Regular', marginLeft: 4, marginTop: 4 },
  button: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Inter-SemiBold' },
  sentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
});
