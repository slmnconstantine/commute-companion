import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export default function VerificationIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { profile } = useAuth();

  const steps = [
    {
      title: 'Email Verified',
      description: 'Your email has been verified',
      icon: 'mail',
      completed: true, // If they're logged in, email is verified
    },
    {
      title: 'Government ID',
      description: profile?.government_id_url
        ? profile?.is_verified
          ? 'Your ID has been verified'
          : 'Verification in progress'
        : 'Upload a valid government ID',
      icon: 'id-card',
      completed: profile?.is_verified || false,
      pending: !!profile?.government_id_url && !profile?.is_verified,
      action: !profile?.government_id_url ? () => router.push('/(main)/verification/upload-id') : undefined,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Verification</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.content}>
        <View style={[styles.badge, { backgroundColor: profile?.is_verified ? `${theme.colors.success}15` : `${theme.colors.accent}15` }]}>
          <Ionicons
            name={profile?.is_verified ? 'shield-checkmark' : 'shield-half'}
            size={48}
            color={profile?.is_verified ? theme.colors.success : theme.colors.accent}
          />
          <Text style={[styles.badgeTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
            {profile?.is_verified ? 'Fully Verified' : 'Verification Needed'}
          </Text>
          <Text style={[styles.badgeDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            {profile?.is_verified
              ? 'Your account is fully verified. You have access to all features.'
              : 'Complete the steps below to verify your identity and unlock all features.'}
          </Text>
        </View>

        {steps.map((step, i) => (
          <Pressable
            key={i}
            style={[styles.stepCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={step.action}
            disabled={!step.action}
          >
            <View style={[styles.stepIcon, {
              backgroundColor: step.completed ? `${theme.colors.success}15` : step.pending ? `${theme.colors.info}15` : `${theme.colors.textMuted}10`,
            }]}>
              <Ionicons
                name={step.completed ? 'checkmark-circle' : step.pending ? 'time' : (step.icon as any)}
                size={28}
                color={step.completed ? theme.colors.success : step.pending ? theme.colors.info : theme.colors.textMuted}
              />
            </View>
            <View style={styles.stepInfo}>
              <Text style={[styles.stepTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>{step.title}</Text>
              <Text style={[styles.stepDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>{step.description}</Text>
            </View>
            {step.action && <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17 },
  content: { flex: 1, padding: 24, gap: 16 },
  badge: { alignItems: 'center', padding: 32, borderRadius: 20, gap: 12, marginBottom: 8 },
  badgeTitle: { fontSize: 20 },
  badgeDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  stepCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 16, borderWidth: 1 },
  stepIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepInfo: { flex: 1, gap: 2 },
  stepTitle: { fontSize: 16 },
  stepDesc: { fontSize: 13 },
});
