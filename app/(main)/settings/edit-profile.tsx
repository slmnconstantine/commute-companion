import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert } from 'react-native';
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
  const { profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await updateProfile(profile.id, { full_name: fullName.trim() });
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Edit Profile</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.content}>
        <Pressable style={styles.avatarSection} onPress={handleChangeAvatar}>
          <Avatar uri={profile?.avatar_url} name={profile?.full_name || ''} size="xl" />
          <View style={[styles.cameraBtn, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </Pressable>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>Full Name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text, fontFamily: 'Inter-Regular' }]}
            />
          </View>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>Email</Text>
            <View style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, justifyContent: 'center' }]}>
              <Text style={{ color: theme.colors.textMuted, fontFamily: 'Inter-Regular', fontSize: 15 }}>
                {profile?.id ? 'email@example.com' : '—'}
              </Text>
            </View>
          </View>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>Role</Text>
            <View style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, justifyContent: 'center' }]}>
              <Text style={{ color: theme.colors.textMuted, fontFamily: 'Inter-Regular', fontSize: 15, textTransform: 'capitalize' }}>
                {profile?.role || '—'}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          style={[styles.saveBtn, { backgroundColor: theme.colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17 },
  content: { flex: 1, padding: 24 },
  avatarSection: { alignItems: 'center', marginBottom: 32, position: 'relative' },
  cameraBtn: { position: 'absolute', bottom: 0, right: '35%', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 14, marginLeft: 4 },
  input: { height: 52, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, fontSize: 15 },
  saveBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 32, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-SemiBold' },
});
