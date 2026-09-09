import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { BIOMETRIC_CONSENT, verifyFacePreRide } from '@/services/biometricVerification';

interface FaceScanModalProps {
  visible: boolean;
  onClose: () => void;
  onVerifiedSuccess: () => void;
  tripId: string;
  userId: string;
  userName: string;
  role: 'driver' | 'commuter';
}

export default function FaceScanModal({
  visible,
  onClose,
  onVerifiedSuccess,
  tripId,
  userId,
  userName,
  role,
}: FaceScanModalProps) {
  const { theme } = useTheme();
  const [step, setStep] = useState<'consent' | 'capturing' | 'analyzing' | 'success'>('consent');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  const resetModal = () => {
    setStep('consent');
    setCapturedUri(null);
    setConfidence(null);
    onClose();
  };

  const handleLaunchCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Camera access is required to take a pre-ride face verification scan.'
        );
        return;
      }

      setStep('capturing');
      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets[0]?.base64) {
        setStep('consent');
        return;
      }

      const asset = result.assets[0];
      setCapturedUri(asset.uri);
      setStep('analyzing');

      const verification = await verifyFacePreRide(userId, tripId, asset.base64 || '');

      if (verification.success) {
        setConfidence(verification.confidenceScore);
        setStep('success');
        onVerifiedSuccess();
      } else {
        Alert.alert('Verification Unsuccessful', verification.message, [
          { text: 'Try Again', onPress: () => setStep('consent') },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Face verification failed.');
      setStep('consent');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={resetModal}>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="shield-checkmark" size={22} color={theme.colors.primary} />
              <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
                Pre-Ride Verification
              </Text>
            </View>
            <Pressable onPress={resetModal} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {step === 'consent' && (
              <View style={styles.contentWrap}>
                <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}15` }]}>
                  <Ionicons name="scan-outline" size={44} color={theme.colors.primary} />
                </View>

                <Text style={[styles.stepTitle, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
                  Verify Your Identity
                </Text>
                <Text style={[styles.stepDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                  {BIOMETRIC_CONSENT.purpose}
                </Text>

                {/* Privacy & Retention Badge */}
                <View style={[styles.privacyBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                  <Ionicons name="lock-closed" size={18} color={theme.colors.success} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.privacyTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
                      Ephemeral & Private
                    </Text>
                    <Text style={[styles.privacyText, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                      {BIOMETRIC_CONSENT.retentionPolicy}
                    </Text>
                    <Text style={[styles.privacyLaw, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                      {BIOMETRIC_CONSENT.dataProtectionNotice}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={handleLaunchCamera}
                >
                  <Ionicons name="camera-outline" size={20} color="#fff" />
                  <Text style={styles.primaryBtnText}>Start Face Scan</Text>
                </Pressable>
              </View>
            )}

            {step === 'analyzing' && (
              <View style={styles.contentWrap}>
                {capturedUri && (
                  <View style={[styles.previewWrap, { borderColor: theme.colors.primary }]}>
                    <Image source={{ uri: capturedUri }} style={styles.previewImage} />
                    <View style={styles.scanLineOverlay} />
                  </View>
                )}
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 16 }} />
                <Text style={[styles.stepTitle, { color: theme.colors.text, fontFamily: 'Inter-Bold', marginTop: 12 }]}>
                  Analyzing Liveness & Face Match...
                </Text>
                <Text style={[styles.stepDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                  Comparing face landmarks with registered account portrait...
                </Text>
              </View>
            )}

            {step === 'success' && (
              <View style={styles.contentWrap}>
                <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.success}15` }]}>
                  <Ionicons name="checkmark-circle" size={56} color={theme.colors.success} />
                </View>
                <Text style={[styles.stepTitle, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
                  Identity Confirmed! 🛡️
                </Text>
                <Text style={[styles.stepDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                  {userName}'s identity matches the registered profile with {confidence}% confidence. You are ready for a safe ride!
                </Text>

                <Pressable
                  style={[styles.primaryBtn, { backgroundColor: theme.colors.success, marginTop: 24 }]}
                  onPress={resetModal}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.primaryBtnText}>Done</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
  },
  body: {
    padding: 24,
  },
  contentWrap: {
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 20,
    textAlign: 'center',
  },
  stepDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  privacyBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 16,
  },
  privacyTitle: {
    fontSize: 13,
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  privacyLaw: {
    fontSize: 11,
    opacity: 0.8,
  },
  primaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  previewWrap: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  scanLineOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#10B981',
    opacity: 0.8,
  },
});
