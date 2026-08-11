import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import AppLogo from '@/components/common/AppLogo';
import GlassCard from '@/components/common/GlassCard';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

export default function AboutScreen() {
  const { theme, mode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isLight = mode === 'light';

  const FEATURES = [
    {
      icon: 'navigate-circle-outline' as const,
      title: 'Smart Route Matching',
      desc: 'Connects commuters and verified drivers along identical daily transit corridors.',
      color: theme.colors.primary,
    },
    {
      icon: 'shield-checkmark-outline' as const,
      title: 'Verified Peer Community',
      desc: 'Government ID verification ensures accountability, security, and peace of mind.',
      color: theme.colors.success,
    },
    {
      icon: 'radio-outline' as const,
      title: 'Real-Time Location Tracking',
      desc: 'Low-latency live WebSocket location broadcasting for transparent arrivals and departures.',
      color: theme.colors.info,
    },
    {
      icon: 'mic-circle-outline' as const,
      title: 'Hands-Free AI Assistant',
      desc: 'Voice commands for drivers and riders to search rides, check route updates, and navigate safely.',
      color: theme.colors.accent,
    },
    {
      icon: 'qr-code-outline' as const,
      title: 'Seamless QR Ph Payments',
      desc: 'Fast, secure cashless settlements and transparent platform micro-commissions.',
      color: '#8B5CF6',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
          About
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* App Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.logoWrap}>
            <AppLogo size={76} variant="full" />
          </View>
          <Text style={[styles.appName, { color: theme.colors.text }]}>{APP_NAME}</Text>
          <Text style={[styles.appTagline, { color: theme.colors.textMuted }]}>{APP_TAGLINE}</Text>
          <View style={[styles.versionBadge, { backgroundColor: theme.colors.primarySubtle }]}>
            <Text style={[styles.versionText, { color: theme.colors.primary }]}>Version 1.0.0 (Release)</Text>
          </View>
        </View>

        {/* Mission Statement */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Our Mission</Text>
          <GlassCard style={[styles.missionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.missionBody, { color: theme.colors.text }]}>
              Commute Companion was built to revolutionize daily transportation across Philippine urban hubs. By empowering everyday vehicle owners to share vacant seats with verified commuters traveling the same route, we reduce traffic congestion, lower commute expenses, and foster a connected, trust-driven transit network.
            </Text>
          </GlassCard>
        </View>

        {/* Key Features Grid */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Key Highlights</Text>
          <View style={styles.featuresList}>
            {FEATURES.map((item, idx) => (
              <View
                key={idx}
                style={[
                  styles.featureCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
                ]}
              >
                <View style={[styles.featureIconWrap, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={[styles.featureTitle, { color: theme.colors.text }]}>{item.title}</Text>
                  <Text style={[styles.featureDesc, { color: theme.colors.textMuted }]}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
            Made with ❤️ for Filipino commuters
          </Text>
          <Text style={[styles.copyrightText, { color: theme.colors.textMuted }]}>
            © 2026 Commute Companion. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 24,
  },
  heroCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  logoWrap: {
    marginBottom: 6,
  },
  appName: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  versionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
    marginTop: 4,
  },
  versionText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  missionCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  missionBody: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  featuresList: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  featureDesc: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 19,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  copyrightText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
  },
});
