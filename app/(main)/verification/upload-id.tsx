import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { pickImage, takePhoto, uploadGovernmentId } from '@/services/storage';
import { updateProfile } from '@/services/profiles';

export default function UploadIdScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { profile, refreshProfile } = useAuth();

  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handlePickImage = async () => {
    const base64 = await pickImage();
    if (base64) setImageBase64(base64);
  };

  const handleTakePhoto = async () => {
    const base64 = await takePhoto();
    if (base64) setImageBase64(base64);
  };

  const handleUpload = async () => {
    if (!imageBase64 || !profile) return;
    setUploading(true);
    try {
      const url = await uploadGovernmentId(profile.id, imageBase64);
      if (!url) throw new Error('Upload failed');
      await updateProfile(profile.id, { government_id_url: url });
      await refreshProfile();
      Alert.alert('Submitted!', 'Your ID has been submitted for verification.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Upload Government ID</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: `${theme.colors.info}10`, borderColor: `${theme.colors.info}30` }]}>
          <Ionicons name="information-circle" size={22} color={theme.colors.info} />
          <Text style={[styles.infoText, { color: theme.colors.info, fontFamily: 'Inter-Regular' }]}>
            Upload a clear photo of a valid government-issued ID to verify your identity.
          </Text>
        </View>

        {imageBase64 ? (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
              style={[styles.preview, { borderColor: theme.colors.border }]}
              resizeMode="contain"
            />
            <Pressable onPress={() => setImageBase64(null)} style={[styles.removeBtn, { backgroundColor: theme.colors.error }]}>
              <Ionicons name="close" size={18} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.uploadOptions}>
            <Pressable style={[styles.uploadOption, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={handleTakePhoto}>
              <View style={[styles.uploadIconCircle, { backgroundColor: `${theme.colors.primary}15` }]}>
                <Ionicons name="camera" size={32} color={theme.colors.primary} />
              </View>
              <Text style={[styles.uploadOptionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Take Photo</Text>
              <Text style={[styles.uploadOptionDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>Use your camera</Text>
            </Pressable>

            <Pressable style={[styles.uploadOption, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={handlePickImage}>
              <View style={[styles.uploadIconCircle, { backgroundColor: `${theme.colors.accent}15` }]}>
                <Ionicons name="images" size={32} color={theme.colors.accent} />
              </View>
              <Text style={[styles.uploadOptionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>From Gallery</Text>
              <Text style={[styles.uploadOptionDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>Choose a photo</Text>
            </Pressable>
          </View>
        )}

        {imageBase64 && (
          <Pressable
            style={[styles.submitBtn, { backgroundColor: theme.colors.primary, opacity: uploading ? 0.7 : 1 }]}
            onPress={handleUpload}
            disabled={uploading}
          >
            <Ionicons name="shield-checkmark" size={22} color="#fff" />
            <Text style={styles.submitText}>{uploading ? 'Uploading...' : 'Submit for Verification'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17 },
  content: { flex: 1, padding: 24, gap: 24 },
  infoCard: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20 },
  previewContainer: { alignItems: 'center', position: 'relative' },
  preview: { width: '100%', height: 250, borderRadius: 16, borderWidth: 1 },
  removeBtn: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  uploadOptions: { flexDirection: 'row', gap: 16 },
  uploadOption: { flex: 1, borderRadius: 16, borderWidth: 1.5, padding: 24, alignItems: 'center', gap: 12, borderStyle: 'dashed' },
  uploadIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  uploadOptionTitle: { fontSize: 15 },
  uploadOptionDesc: { fontSize: 12 },
  submitBtn: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  submitText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-SemiBold' },
});
