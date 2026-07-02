import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from '@/services/profiles';
import { pickImage, uploadAvatar } from '@/services/storage';
import Avatar from '@/components/common/Avatar';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { profile, user, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [saving, setSaving] = useState(false);

  const userEmail = user?.email || '—';

  const handleSave = async () => {
    if (!profile) return;
    if (!fullName.trim()) {
      Alert.alert('Validation', 'Full name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      const updates: Record<string, any> = { full_name: fullName.trim() };
      if (username.trim() && username.trim() !== profile.username) {
        updates.username = username.trim().toLowerCase();
      }
      const { error } = await updateProfile(profile.id, updates);
      if (error) throw error;
      await refreshProfile();
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeAvatar = async () => {
    if (!profile) return;
    const base64 = await pickImage();
    if (!base64) return;
    setSaving(true);
    try {
      const url = await uploadAvatar(profile.id, base64);
      if (url) {
        await updateProfile(profile.id, { avatar_url: url });
        await refreshProfile();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Edit Profile</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>Manage your personal information</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.avatarSection} onPress={handleChangeAvatar}>
          <Avatar uri={profile?.avatar_url} name={profile?.full_name || ''} size="xl" />
          <View style={[styles.cameraBtn, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
          <Text style={[styles.changePhotoText, { color: theme.colors.primary, fontFamily: 'Inter-Medium' }]}>
            Change Photo
          </Text>
        </Pressable>

        {/* Personal Info Section */}
        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-SemiBold' }]}>
          PERSONAL INFO
        </Text>
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>Full Name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text, fontFamily: 'Inter-Regular' }]}
              placeholderTextColor={theme.colors.textMuted}
              placeholder="Enter your full name"
            />
          </View>
          <View style={[styles.fieldDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>Username</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text, fontFamily: 'Inter-Regular' }]}
              placeholderTextColor={theme.colors.textMuted}
              placeholder="Choose a username"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Contact Section */}
        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-SemiBold' }]}>
          CONTACT
        </Text>
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>Email</Text>
            <View style={[styles.readonlyField, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
              <Ionicons name="mail-outline" size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
              <Text style={{ color: theme.colors.text, fontFamily: 'Inter-Regular', fontSize: 15, flex: 1 }} numberOfLines={1}>
                {userEmail}
              </Text>
              <View style={[styles.lockedBadge, { backgroundColor: `${theme.colors.textMuted}15` }]}>
                <Ionicons name="lock-closed" size={10} color={theme.colors.textMuted} />
              </View>
            </View>
          </View>
          <View style={[styles.fieldDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>Role</Text>
            <View style={[styles.readonlyField, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
              <Ionicons name={profile?.role === 'driver' ? 'car-outline' : 'person-outline'} size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
              <Text style={{ color: theme.colors.text, fontFamily: 'Inter-Regular', fontSize: 15, textTransform: 'capitalize' }}>
                {profile?.role || '—'}
              </Text>
              <View style={[styles.lockedBadge, { backgroundColor: `${theme.colors.textMuted}15` }]}>
                <Ionicons name="lock-closed" size={10} color={theme.colors.textMuted} />
              </View>
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: theme.colors.primary,
              opacity: saving ? 0.7 : pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17 },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  scrollContent: { padding: 24, paddingBottom: 60 },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  cameraBtn: { position: 'absolute', bottom: 20, right: '35%', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  changePhotoText: { fontSize: 13, marginTop: 8 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  field: { paddingHorizontal: 16, paddingVertical: 14 },
  fieldDivider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  label: { fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  readonlyField: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-SemiBold' },
});
