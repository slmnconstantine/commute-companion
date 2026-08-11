import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import AnimatedSegmentControl from '@/components/common/AnimatedSegmentControl';

export default function TermsPrivacyScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'Terms of Service' | 'Privacy Policy'>('Terms of Service');

  const handleEmailSupport = () => {
    Linking.openURL('mailto:slmnconstantino@gmail.com?subject=Terms%20and%20Privacy%20Inquiry');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
          Terms & Privacy
        </Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentWrap}>
        <AnimatedSegmentControl
          segments={['Terms of Service', 'Privacy Policy']}
          activeSegment={activeTab}
          onSegmentChange={(seg) => setActiveTab(seg as any)}
          primaryColor={theme.colors.primary}
          backgroundColor={theme.colors.inputBackground}
          activeTextColor="#fff"
          inactiveTextColor={theme.colors.textMuted}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lastUpdated, { color: theme.colors.textMuted }]}>
          Last Updated: August 2026
        </Text>

        {activeTab === 'Terms of Service' ? (
          /* ═══ TERMS OF SERVICE ═══ */
          <View style={styles.contentWrap}>
            <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text" size={20} color={theme.colors.primary} />
                <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>1. Acceptance of Terms</Text>
              </View>
              <Text style={[styles.bodyText, { color: theme.colors.text }]}>
                By accessing or using Commute Companion, you agree to be bound by these Terms of Service. If you do not agree to all terms and conditions, you may not access or use our ride-sharing platform.
              </Text>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="shield-checkmark" size={20} color={theme.colors.success} />
                <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>2. Eligibility & Verification</Text>
              </View>
              <Text style={[styles.bodyText, { color: theme.colors.text }]}>
                • Users must be at least 18 years of age.{'\n'}
                • Drivers must provide valid government-issued photo identification and registered vehicle documents before offering rides.{'\n'}
                • Commuters must provide verifiable contact and profile information to post ride requests.
              </Text>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="car" size={20} color={theme.colors.primary} />
                <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>3. Carpooling & Code of Conduct</Text>
              </View>
              <Text style={[styles.bodyText, { color: theme.colors.text }]}>
                Commute Companion facilitates peer-to-peer carpooling. All participants agree to:{'\n'}
                • Arrive at designated pickup and drop-off points punctually.{'\n'}
                • Treat fellow passengers and drivers with mutual respect and courteous behavior.{'\n'}
                • Refrain from any discriminatory, unsafe, or unlawful activities during transit.
              </Text>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="card" size={20} color={theme.colors.accent} />
                <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>4. Fares & Platform Fees</Text>
              </View>
              <Text style={[styles.bodyText, { color: theme.colors.text }]}>
                • Fares are calculated transparently based on distance, estimated travel time, and fuel cost sharing.{'\n'}
                • A nominal platform commission is deducted to maintain real-time infrastructure, emergency SOS features, and mapping services.{'\n'}
                • Drivers are responsible for timely settlement of accumulated platform fee balances.
              </Text>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
                <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>5. Safety & SOS Protocols</Text>
              </View>
              <Text style={[styles.bodyText, { color: theme.colors.text }]}>
                The in-app Emergency SOS feature allows users to notify trusted emergency contacts and local authorities. Misuse or false triggers of the SOS system may result in immediate account termination.
              </Text>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle" size={20} color={theme.colors.info} />
                <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>6. Limitation of Liability</Text>
              </View>
              <Text style={[styles.bodyText, { color: theme.colors.text }]}>
                Commute Companion provides a technology platform connecting independent peer drivers and commuters. While we verify identification documents, we do not operate a commercial transit fleet and are not liable for vehicle mechanical delays or independent traffic conditions.
              </Text>
            </View>
          </View>
        ) : (
          /* ═══ PRIVACY POLICY ═══ */
          <View style={styles.contentWrap}>
            <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="finger-print" size={20} color={theme.colors.primary} />
                <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>1. Information We Collect</Text>
              </View>
              <Text style={[styles.bodyText, { color: theme.colors.text }]}>
                We collect information essential for carpool coordination:{'\n'}
                • Account Profile: Name, email address, username, phone number, and avatar.{'\n'}
                • Verification Data: Government ID photos and vehicle plate numbers (stored securely in private storage).{'\n'}
                • Geospatial Coordinates: Origin, destination, and live GPS location during active ongoing trips.
              </Text>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="location" size={20} color={theme.colors.success} />
                <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>2. How We Use Location Data</Text>
              </View>
              <Text style={[styles.bodyText, { color: theme.colors.text }]}>
                • Route Matching: Your commute origin and destination are hashed to discover matching rides.{'\n'}
                • Live Tracking: Coordinates are broadcast ephemerally via secure WebSockets ONLY when you actively initiate a trip or share your route in your route community.{'\n'}
                • We NEVER sell or share your location history with third-party advertisers.
              </Text>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="lock-closed" size={20} color={theme.colors.accent} />
                <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>3. Data Protection & Security</Text>
              </View>
              <Text style={[styles.bodyText, { color: theme.colors.text }]}>
                All data is encrypted in transit using TLS 1.3 and at rest in Supabase infrastructure with granular Row-Level Security (RLS) policies. Only authorized users involved in a confirmed ride can see specific route coordinates.
              </Text>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trash-bin" size={20} color={theme.colors.error} />
                <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>4. Your Rights & Data Deletion</Text>
              </View>
              <Text style={[styles.bodyText, { color: theme.colors.text }]}>
                You maintain full ownership of your personal data. You may request account deletion and removal of all verification records at any time by contacting our data protection coordinator.
              </Text>
            </View>
          </View>
        )}

        {/* Contact Data Protection Section */}
        <Pressable
          style={[styles.inquiryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={handleEmailSupport}
        >
          <Ionicons name="help-buoy-outline" size={24} color={theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.inquiryTitle, { color: theme.colors.text }]}>Questions or Concerns?</Text>
            <Text style={[styles.inquirySub, { color: theme.colors.textMuted }]}>
              Contact slmnconstantino@gmail.com for inquiries or terms requests.
            </Text>
          </View>
          <Ionicons name="open-outline" size={18} color={theme.colors.primary} />
        </Pressable>
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
  segmentWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  lastUpdated: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 4,
  },
  contentWrap: {
    gap: 14,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionHeading: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    flex: 1,
  },
  bodyText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  inquiryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  inquiryTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  inquirySub: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
});
