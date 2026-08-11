import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

const CATEGORIES = [
  { id: 'Map & GPS', label: 'Map & GPS', icon: 'map-outline' },
  { id: 'Rides & Booking', label: 'Rides & Booking', icon: 'car-sport-outline' },
  { id: 'Payments', label: 'Payments', icon: 'qr-code-outline' },
  { id: 'AI Voice', label: 'AI Voice', icon: 'mic-outline' },
  { id: 'UI & Visuals', label: 'UI & Visuals', icon: 'color-palette-outline' },
  { id: 'Other', label: 'Other', icon: 'help-circle-outline' },
];

const SEVERITIES = [
  { id: 'Low', label: 'Low', color: '#3B82F6' },
  { id: 'Medium', label: 'Medium', color: '#F59E0B' },
  { id: 'High', label: 'High', color: '#EF4444' },
  { id: 'Critical', label: 'Critical', color: '#DC2626' },
];

const RECIPIENT_EMAIL = 'slmnconstantino@gmail.com';

export default function ReportBugScreen() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const router = useRouter();

  const [category, setCategory] = useState('Map & GPS');
  const [severity, setSeverity] = useState('Medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a short summary of the issue.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Description Required', 'Please provide steps or details about what went wrong.');
      return;
    }

    setIsSubmitting(true);

    const emailSubject = encodeURIComponent(`[Commute Companion Bug Report] [${severity}] ${category}: ${title.trim()}`);
    const emailBody = encodeURIComponent(
      `Bug Report Summary\n` +
      `==================\n` +
      `Title: ${title.trim()}\n` +
      `Category: ${category}\n` +
      `Severity: ${severity}\n\n` +
      `Detailed Description / Steps to Reproduce:\n` +
      `${description.trim()}\n\n` +
      `Diagnostics & Environment Info:\n` +
      `-------------------------------\n` +
      `App: Commute Companion v1.0.0\n` +
      `User Name: ${profile?.full_name || 'N/A'}\n` +
      `User ID: ${profile?.id || 'N/A'}\n` +
      `Role: ${profile?.role || 'commuter'}\n` +
      `OS Platform: ${Platform.OS} (v${Platform.Version})\n` +
      `Report Date: ${new Date().toLocaleString()}\n`
    );

    const mailtoUrl = `mailto:${RECIPIENT_EMAIL}?subject=${emailSubject}&body=${emailBody}`;

    try {
      const supported = await Linking.canOpenURL(mailtoUrl);
      if (supported) {
        await Linking.openURL(mailtoUrl);
        Alert.alert(
          'Email Client Opened',
          `Your bug report has been prepared for ${RECIPIENT_EMAIL}. Please tap Send in your email app to complete.`,
          [
            {
              text: 'Done',
              onPress: () => {
                setTitle('');
                setDescription('');
                router.back();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'No Email App Detected',
          `Please send your report directly to ${RECIPIENT_EMAIL}.\n\nSubject: [${category}] ${title}\n\n${description}`,
          [{ text: 'OK' }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not launch email app.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
            Report a Bug
          </Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Card */}
          <View style={[styles.infoBanner, { backgroundColor: `${theme.colors.primary}12`, borderColor: `${theme.colors.primary}30` }]}>
            <Ionicons name="bug-outline" size={24} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: theme.colors.text }]}>Found a glitch?</Text>
              <Text style={[styles.infoDesc, { color: theme.colors.textMuted }]}>
                Your feedback helps us make Commute Companion better. Reports are emailed directly to {RECIPIENT_EMAIL}.
              </Text>
            </View>
          </View>

          {/* Category Selector */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Category</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={15}
                      color={isSelected ? '#fff' : theme.colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? '#fff' : theme.colors.text, fontFamily: isSelected ? 'Inter-SemiBold' : 'Inter-Regular' },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Severity Selector */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Severity</Text>
            <View style={styles.severityRow}>
              {SEVERITIES.map((sev) => {
                const isSelected = severity === sev.id;
                return (
                  <Pressable
                    key={sev.id}
                    style={[
                      styles.severityBtn,
                      {
                        backgroundColor: isSelected ? `${sev.color}20` : theme.colors.surface,
                        borderColor: isSelected ? sev.color : theme.colors.border,
                      },
                    ]}
                    onPress={() => setSeverity(sev.id)}
                  >
                    <View style={[styles.severityDot, { backgroundColor: sev.color }]} />
                    <Text
                      style={[
                        styles.severityText,
                        {
                          color: isSelected ? sev.color : theme.colors.textMuted,
                          fontFamily: isSelected ? 'Inter-SemiBold' : 'Inter-Regular',
                        },
                      ]}
                    >
                      {sev.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Title Input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Issue Summary</Text>
            <View style={[styles.inputBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <TextInput
                style={[styles.inputField, { color: theme.colors.text }]}
                placeholder="e.g. Map route line disappears after rotating"
                placeholderTextColor={theme.colors.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={80}
              />
            </View>
          </View>

          {/* Description Multiline Input */}
          <View style={styles.fieldGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Steps to Reproduce & Details</Text>
              <Text style={[styles.charCount, { color: theme.colors.textMuted }]}>{description.length}/500</Text>
            </View>
            <View style={[styles.textAreaBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <TextInput
                style={[styles.textArea, { color: theme.colors.text }]}
                placeholder="1. What were you doing? 2. What went wrong? 3. What did you expect to happen?"
                placeholderTextColor={theme.colors.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
                maxLength={500}
              />
            </View>
          </View>

          {/* Auto Device Diagnostics Preview */}
          <View style={[styles.diagCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Ionicons name="information-circle-outline" size={16} color={theme.colors.textMuted} />
              <Text style={[styles.diagTitle, { color: theme.colors.textMuted }]}>Auto-Included Environment Info</Text>
            </View>
            <Text style={[styles.diagText, { color: theme.colors.textMuted }]}>
              • Device: {Platform.OS} {String(Platform.Version)} | Commute Companion v1.0.0{'\n'}
              • Account: {profile?.full_name || 'Guest'} ({profile?.role || 'commuter'})
            </Text>
          </View>

          {/* Submit Button */}
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              {
                backgroundColor: theme.colors.primary,
                opacity: pressed || isSubmitting ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Ionicons name="paper-plane-outline" size={20} color="#fff" />
            <Text style={styles.submitBtnText}>
              {isSubmitting ? 'Opening Mail Client...' : 'Send Bug Report'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
    gap: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  infoDesc: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
    marginTop: 2,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  chipText: {
    fontSize: 13,
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 13,
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
  },
  inputField: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  textAreaBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
  },
  textArea: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  diagCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  diagTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  diagText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
    shadowColor: '#0057FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});
