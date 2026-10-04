import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationContext';

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

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

  const handleTestBanner = () => {
    showInAppNotification(
      'New Ride Request 🚗',
      'A commuter requested to join your route to Makati Central.',
      { type: 'booking', bookingId: 'test-booking' }
    );
  };

  const handleTestOsNotification = async () => {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Commute Companion Alert 🔔',
          body: 'This is an OS-level notification appearing in your device status bar.',
          sound: soundEnabled,
        },
        trigger: null,
      });
    } catch (e: any) {
      console.warn('Failed to schedule test OS notification:', e);
    }
  };

  const handleTestMatchPopup = () => {
    showInAppNotification(
      'Ride Offer Found! 🌟',
      'Driver "Jane Doe" is heading your way and matches 95% of your route.',
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
        
        <View style={styles.testBtnGroup}>
          <Pressable
            style={({ pressed }) => [
              styles.testBtn,
              {
                backgroundColor: theme.colors.primary,
                opacity: pressed ? 0.9 : 1,
              }
            ]}
            onPress={handleTestBanner}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
            <Text style={styles.testBtnText}>Test Sliding Top Banner</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.testBtn,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.primary,
                borderWidth: 1.5,
                opacity: pressed ? 0.9 : 1,
              }
            ]}
            onPress={handleTestOsNotification}
          >
            <Ionicons name="notifications" size={18} color={theme.colors.primary} />
            <Text style={[styles.testBtnText, { color: theme.colors.primary }]}>Test OS Status Bar Alert</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.testBtn,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: 1,
                opacity: pressed ? 0.9 : 1,
              }
            ]}
            onPress={handleTestMatchPopup}
          >
            <Ionicons name="sparkles" size={18} color={theme.colors.text} />
            <Text style={[styles.testBtnText, { color: theme.colors.text }]}>Test Center Match Modal</Text>
          </Pressable>
        </View>
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
  testBtnGroup: { gap: 12, marginTop: 4 },
  testBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 16, gap: 10, shadowColor: '#0057FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  testBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter-SemiBold' },
});
