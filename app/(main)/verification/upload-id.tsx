import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { uploadGovernmentId } from '@/services/storage';
import { updateProfile } from '@/services/profiles';
import DocumentCaptureModal from '@/components/verification/DocumentCaptureModal';

export default function UploadIdScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { profile, refreshProfile } = useAuth();

  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleCaptureSuccess = (base64: string) => {
    setImageBase64(base64);
  };

  const handleUpload = async () => {
    if (!imageBase64 || !profile) return;
    setUploading(true);
    try {
      const url = await uploadGovernmentId(profile.id, imageBase64);
      if (!url) throw new Error('Upload failed');
      await updateProfile(profile.id, { government_id_url: url, is_verified: false } as any);
      await refreshProfile();
      Alert.alert('Submitted!', 'Your ID has been submitted and is pending admin review.', [
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
            For security, please take a live photo of a valid government ID. Photos from your photo gallery cannot be accepted.
          </Text>
        </View>

        {imageBase64 ? (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
              style={[styles.preview, { borderColor: theme.colors.border }]}
              resizeMode="contain"
            />
            {uploading && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderRadius: 16 }]}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
            <Pressable onPress={() => setShowCaptureModal(true)} style={styles.retakeBtn}>
              <Ionicons name="camera-reverse" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.retakeBtnText}>Retake Photo</Text>
            </Pressable>
            <Pressable onPress={() => setImageBase64(null)} style={[styles.removeBtn, { backgroundColor: theme.colors.error }]}>
              <Ionicons name="close" size={18} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 20 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: `${theme.colors.primary}15`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="card-outline" size={40} color={theme.colors.primary} />
            </View>

            <Pressable
              style={[
                styles.liveCaptureCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.primary,
                },
              ]}
              onPress={() => setShowCaptureModal(true)}
            >
              <View style={[styles.uploadIconCircle, { backgroundColor: `${theme.colors.primary}15` }]}>
                <Ionicons name="camera" size={32} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.uploadOptionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
                  Scan Government ID
                </Text>
                <Text style={[styles.uploadOptionDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                  Live camera capture only • Guide & clarity check
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
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

      {/* Live Document Capture Modal */}
      <DocumentCaptureModal
        visible={showCaptureModal}
        onClose={() => setShowCaptureModal(false)}
        onCaptureSuccess={handleCaptureSuccess}
        documentTitle="Government ID"
        documentType="id"
      />
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
  retakeBtn: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retakeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  liveCaptureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  uploadIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  uploadOptionTitle: { fontSize: 15 },
  uploadOptionDesc: { fontSize: 12 },
  submitBtn: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  submitText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-SemiBold' },
});
