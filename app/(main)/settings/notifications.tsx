import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationContext';

export default function NotificationsSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { showInAppNotification } = useNotifications();

  const {
    pushEnabled,
    rideAlerts,
    chatAlerts,
    soundEnabled,
    emailAlerts,
    setPushEnabled,
    setRideAlerts,
    setChatAlerts,
    setSoundEnabled,
    setEmailAlerts,
  } = useNotifications();

  const handleTestNotification = () => {
    // Fire a local test notification to showcase the slide-down banner
    showInAppNotification(
      'Ride Offer Found! 🚗',
      'Driver "Jane Doe" is heading to Quezon City and matches your route.',
      { type: 'ride_matched', tripId: 'test-trip-id' }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Notifications</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Description */}
        <Text style={[styles.sectionDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
          Manage how and when you want to receive alerts for ride bookings, messages, and updates.
        </Text>

        {/* Section 1: Main Toggle */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.settingItem}>
            <View style={styles.settingText}>
              <Text style={[styles.settingLabel, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>Allow Push Notifications</Text>
              <Text style={[styles.settingSub, { color: theme.colors.textMuted }]}>Receive real-time alerts on your device</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Section 2: Detailed Alert Settings */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>ALERT PREFERENCES</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.settingItem, styles.borderBottom, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.settingText}>
              <Text style={[styles.settingLabel, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>Ride & Booking Matches</Text>
              <Text style={[styles.settingSub, { color: theme.colors.textMuted }]}>Alert when a match is found or request status changes</Text>
            </View>
            <Switch
              value={rideAlerts}
              onValueChange={setRideAlerts}
              disabled={!pushEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.settingItem, styles.borderBottom, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.settingText}>
              <Text style={[styles.settingLabel, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>Chat Messages</Text>
              <Text style={[styles.settingSub, { color: theme.colors.textMuted }]}>Alert when you receive a message in trip chatrooms</Text>
            </View>
            <Switch
              value={chatAlerts}
              onValueChange={setChatAlerts}
              disabled={!pushEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.settingItem, styles.borderBottom, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.settingText}>
              <Text style={[styles.settingLabel, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>Notification Sounds</Text>
              <Text style={[styles.settingSub, { color: theme.colors.textMuted }]}>Play a sound for incoming notifications</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              disabled={!pushEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingText}>
              <Text style={[styles.settingLabel, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>Email Digests</Text>
              <Text style={[styles.settingSub, { color: theme.colors.textMuted }]}>Receive weekly trip history summaries via email</Text>
            </View>
            <Switch
              value={emailAlerts}
              onValueChange={setEmailAlerts}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Section 3: Interactive Demo */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>TEST NOTIFICATIONS</Text>
        <Pressable
          style={({ pressed }) => [
            styles.testBtn,
            {
              backgroundColor: theme.colors.primary,
              opacity: pressed ? 0.9 : 1,
            }
          ]}
          onPress={handleTestNotification}
        >
          <Ionicons name="sparkles" size={20} color="#fff" />
          <Text style={styles.testBtnText}>Trigger In-App Test Banner</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17 },
  scrollContent: { padding: 20, gap: 16 },
  sectionDesc: { fontSize: 14, lineHeight: 20, marginBottom: 8, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 12, letterSpacing: 1, marginTop: 12, marginBottom: 4, paddingHorizontal: 4 },
  card: { borderRadius: 16, borderWidth: 1.5, overflow: 'hidden' },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  borderBottom: { borderBottomWidth: 1 },
  settingText: { flex: 1, paddingRight: 16, gap: 2 },
  settingLabel: { fontSize: 15 },
  settingSub: { fontSize: 12 },
  testBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: 16, gap: 10, marginTop: 4, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  testBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter-SemiBold' },
});
