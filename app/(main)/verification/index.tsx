import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from '@/services/profiles';
import { pickImage, takePhoto, uploadGovernmentId } from '@/services/storage';

export default function VerificationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { profile, refreshProfile } = useAuth();

  const [idImage, setIdImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePickImage = async () => {
    const base64 = await pickImage();
    if (base64) setIdImage(base64);
  };

  const handleTakePhoto = async () => {
    const base64 = await takePhoto();
    if (base64) setIdImage(base64);
  };

  const handleSubmit = async () => {
    if (!profile || !idImage) return;
    
    setSubmitting(true);
    try {
      const url = await uploadGovernmentId(profile.id, idImage);
      if (!url) throw new Error("Failed to upload ID image.");

      // For the demo, we instantly verify the user.
      // In a real app, this would set a pending status for manual review.
      const { error } = await updateProfile(profile.id, { 
        government_id_url: url,
        is_verified: true,
        verified_badge: true
      });
      
      if (error) throw error;
      
      await refreshProfile();
      Alert.alert('Verification Submitted', 'Your ID has been verified! You now have the verified badge on your profile.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit verification.');
    } finally {
      setSubmitting(false);
    }
  };

  const isVerified = profile?.is_verified && profile?.verified_badge;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>ID Verification</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={isVerified ? "shield-checkmark" : "shield-half"} 
            size={64} 
            color={isVerified ? theme.colors.success : theme.colors.primary} 
          />
        </View>

        <Text style={[styles.title, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
          {isVerified ? 'You are Verified!' : 'Verify Your Identity'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
          {isVerified 
            ? 'Your government ID has been securely verified. The verified badge is now displayed on your profile.' 
            : 'To ensure a safe commuting environment for everyone, we require all users to upload a valid Government ID.'}
        </Text>

        {!isVerified && (
          <View style={styles.uploadSection}>
            {idImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: `data:image/jpeg;base64,${idImage}` }} style={styles.imagePreview} />
                <Pressable style={styles.changeBtn} onPress={() => setIdImage(null)}>
                  <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.actionButtons}>
                <Pressable style={[styles.uploadBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={handleTakePhoto}>
                  <Ionicons name="camera-outline" size={24} color={theme.colors.primary} />
                  <Text style={[styles.uploadText, { color: theme.colors.text }]}>Take a Photo</Text>
                </Pressable>
                
                <Pressable style={[styles.uploadBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={handlePickImage}>
                  <Ionicons name="image-outline" size={24} color={theme.colors.primary} />
                  <Text style={[styles.uploadText, { color: theme.colors.text }]}>Choose from Gallery</Text>
                </Pressable>
              </View>
            )}

            <Pressable
              style={[
                styles.submitBtn, 
                { backgroundColor: idImage ? theme.colors.primary : theme.colors.border },
                submitting && { opacity: 0.7 }
              ]}
              onPress={handleSubmit}
              disabled={!idImage || submitting}
            >
              <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Submit Verification'}</Text>
            </Pressable>
          </View>
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
  content: { flex: 1, padding: 24, alignItems: 'center' },
  iconContainer: { marginBottom: 24, marginTop: 12 },
  title: { fontSize: 22, textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 40, paddingHorizontal: 16 },
  uploadSection: { width: '100%', alignItems: 'center' },
  actionButtons: { flexDirection: 'row', gap: 16, width: '100%', marginBottom: 32 },
  uploadBtn: { flex: 1, height: 100, borderWidth: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 12 },
  uploadText: { fontSize: 13, fontFamily: 'Inter-Medium' },
  imagePreviewContainer: { width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 32 },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  changeBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: '#fff', borderRadius: 12 },
  submitBtn: { width: '100%', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-SemiBold' },
});
