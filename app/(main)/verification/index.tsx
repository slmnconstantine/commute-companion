import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { updateProfile, updateVerification } from '@/services/profiles';
import { pickImage, takePhoto, uploadGovernmentId } from '@/services/storage';
import { addVehicle, getVehicles, deleteVehicle } from '@/services/vehicles';

export default function VerificationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { profile, refreshProfile } = useAuth();

  const [idImage, setIdImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isVerified = !!(profile?.is_verified && profile?.verified_badge);
  const isPending = !!(profile?.government_id_url && !profile?.is_verified);

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

      // Set is_verified to false so account status remains PENDING for admin review
      const { error } = await updateVerification(profile.id, false, url);
      if (error) throw error;
      
      await refreshProfile();
      Alert.alert(
        'Verification Submitted ⏳', 
        'Your ID image has been submitted successfully and is now pending admin review.', 
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit verification.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoOverride = async () => {
    if (!profile) return;
    
    if (isVerified || isPending) {
      // Just unverify / reset
      setSubmitting(true);
      try {
        const { error } = await updateVerification(profile.id, false);
        if (error) throw error;
        await updateProfile(profile.id, { government_id_url: null, verified_badge: false } as any);
        
        // Optionally clean up vehicles
        const existing = await getVehicles(profile.id);
        for (const v of existing) {
          await deleteVehicle(v.id);
        }
        
        await refreshProfile();
        Alert.alert('Demo Override Success', 'Your verification status has been reset.');
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Demo override failed.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // If not verified, ask for vehicle type
    Alert.alert(
      'Select Vehicle Type',
      'What type of vehicle do you drive?',
      [
        {
          text: 'Tricycle',
          onPress: () => processOverride('tricycle'),
        },
        {
          text: 'Private Vehicle (Car)',
          onPress: () => processOverride('private'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        }
      ]
    );
  };

  const processOverride = async (vehicleType: string) => {
    if (!profile) return;
    setSubmitting(true);
    try {
      // 1. Update verification state in profiles first
      const { error: verError } = await updateVerification(profile.id, true);
      if (verError) throw verError;

      // 2. Update role to driver so RLS checks pass for vehicle insertion
      await updateProfile(profile.id, { role: 'driver', is_verified: true, verified_badge: true } as any);

      // 3. Insert mock vehicle gracefully
      try {
        await addVehicle(
          profile.id,
          `DEMO-${Math.floor(100 + Math.random() * 900)}`,
          vehicleType,
          vehicleType === 'tricycle' ? 'Tricycle Model' : 'Sedan Model',
          vehicleType === 'tricycle' ? '3' : '4'
        );
      } catch (vErr) {
        console.warn('Note: Mock vehicle insertion skipped:', vErr);
      }

      await refreshProfile();
      Alert.alert(
        'Verification Success! 🎉',
        'Your profile is now verified! The verified badge is active and driver status is enabled.'
      );
    } catch (e: any) {
      Alert.alert('Verification Error', e.message || 'Demo override failed.');
    } finally {
      setSubmitting(false);
    }
  };

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
            name={isVerified ? "shield-checkmark" : isPending ? "time-outline" : "shield-half"} 
            size={64} 
            color={isVerified ? theme.colors.success : isPending ? theme.colors.warning : theme.colors.primary} 
          />
        </View>

        <Text style={[styles.title, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
          {isVerified ? 'You are Verified!' : isPending ? 'Verification Pending Review ⏳' : 'Verify Your Identity'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
          {isVerified 
            ? 'Your government ID has been securely verified. The verified badge is now displayed on your profile.' 
            : isPending
            ? 'Your government ID has been submitted and is currently pending review by our admin team. You will be notified once approved.'
            : 'To ensure a safe commuting environment for everyone, we require all users to upload a valid Government ID.'}
        </Text>

        {!isVerified && !isPending && (
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

        {isPending && (
          <View style={[styles.pendingCard, { backgroundColor: `${theme.colors.warning}15`, borderColor: `${theme.colors.warning}40` }]}>
            <Ionicons name="hourglass-outline" size={20} color={theme.colors.warning} />
            <Text style={[styles.pendingText, { color: theme.colors.text }]}>
              Submitted ID document is queued for admin review.
            </Text>
          </View>
        )}

        {/* Demo Override Button */}
        <Pressable
          style={[
            styles.overrideBtn,
            { 
              borderColor: theme.colors.accent, 
              borderWidth: 1.5,
              backgroundColor: `${theme.colors.accent}10`
            }
          ]}
          onPress={handleDemoOverride}
          disabled={submitting}
        >
          <Ionicons name="flash" size={18} color={theme.colors.accent} />
          <Text style={[styles.overrideText, { color: theme.colors.accent, fontFamily: 'Inter-SemiBold' }]}>
            {isVerified ? 'Demo: Reset Verification (Override) 🔄' : 'Demo: Instantly Verify Me (Override) ⚡'}
          </Text>
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
  overrideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 50,
    borderRadius: 16,
    marginTop: 24,
  },
  overrideText: {
    fontSize: 14,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
    marginBottom: 20,
  },
  pendingText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    lineHeight: 20,
  },
});
