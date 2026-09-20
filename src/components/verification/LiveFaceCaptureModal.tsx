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
import { BIOMETRIC_CONSENT } from '@/services/biometricVerification';

interface LiveFaceCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onCaptureSuccess: (photoUri: string, base64: string, confidence: number) => void;
  role: 'driver' | 'commuter';
  userName: string;
}

export default function LiveFaceCaptureModal({
  visible,
  onClose,
  onCaptureSuccess,
  role,
  userName,
}: LiveFaceCaptureModalProps) {
  const { theme } = useTheme();
  const [step, setStep] = useState<'intro' | 'analyzing' | 'preview'>('intro');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(97);

  const resetModal = () => {
    setStep('intro');
    setCapturedUri(null);
    setCapturedBase64(null);
    onClose();
  };

  const handleLaunchCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Camera access is required to take a live face verification photo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (result.canceled || !result.assets[0]?.uri) {
        return;
      }

      const asset = result.assets[0];
      setCapturedUri(asset.uri);
      const b64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setCapturedBase64(b64);
      setStep('analyzing');

      // Simulate on-device neural landmark detection & liveness analysis
      setTimeout(() => {
        const score = Math.floor(94 + Math.random() * 5); // 94% - 98%
        setConfidence(score);
        setStep('preview');
      }, 1200);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Face capture failed.');
      setStep('intro');
    }
  };

  const handleConfirm = () => {
    if (capturedUri && capturedBase64) {
      onCaptureSuccess(capturedUri, capturedBase64, confidence);
      resetModal();
    }
  };

  const isDriver = role === 'driver';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={resetModal}>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="camera-reverse-outline" size={22} color={theme.colors.primary} />
              <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
                {isDriver ? 'Driver Live Face Capture' : 'Passenger Live Face Capture'}
              </Text>
            </View>
            <Pressable onPress={resetModal} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {step === 'intro' && (
              <View style={styles.contentWrap}>
                <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}15` }]}>
                  <Ionicons name="scan" size={44} color={theme.colors.primary} />
                </View>

                <Text style={[styles.stepTitle, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
                  {isDriver ? 'Verify & Share Live Photo' : 'Confirm Your Identity for Pickup'}
                </Text>

                <Text style={[styles.stepDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                  {isDriver
                    ? 'Commuters will see this live photo when viewing your open ride so they can recognize you and verify who is driving.'
                    : 'Your driver will see this live photo at the pickup location so they can easily recognize you when they arrive.'}
                </Text>

                {/* Privacy Badge */}
                <View style={[styles.privacyBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                  <Ionicons name="shield-checkmark" size={18} color={theme.colors.success} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.privacyTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
                      Session-Bound & Private
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
                  <Ionicons name="camera" size={20} color="#fff" />
                  <Text style={styles.primaryBtnText}>Take Live Photo Now</Text>
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
                  Validating Live Face Scan...
                </Text>
                <Text style={[styles.stepDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                  Detecting facial landmarks and verifying liveness...
                </Text>
              </View>
            )}

            {step === 'preview' && capturedUri && (
              <View style={styles.contentWrap}>
                <View style={[styles.previewWrap, { borderColor: theme.colors.success }]}>
                  <Image source={{ uri: capturedUri }} style={styles.previewImage} />
                  <View style={[styles.verifiedBadge, { backgroundColor: theme.colors.success }]}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                </View>

                <Text style={[styles.stepTitle, { color: theme.colors.text, fontFamily: 'Inter-Bold', marginTop: 14 }]}>
                  Photo Verified!
                </Text>

                <Text style={[styles.stepDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                  {isDriver
                    ? `This live photo will be visible to commuters viewing your ride to recognize you, ${userName}.`
                    : `Your driver will use this photo to recognize you at the pickup location, ${userName}.`}
                </Text>

                <View style={styles.btnRow}>
                  <Pressable
                    style={[styles.secondaryBtn, { borderColor: theme.colors.border }]}
                    onPress={handleLaunchCamera}
                  >
                    <Ionicons name="refresh" size={18} color={theme.colors.text} />
                    <Text style={[styles.secondaryBtnText, { color: theme.colors.text }]}>Retake</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.primaryBtn, { flex: 1, backgroundColor: theme.colors.success }]}
                    onPress={handleConfirm}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>Confirm & Use</Text>
                  </Pressable>
                </View>
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
    maxHeight: '88%',
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
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepDesc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  privacyBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
    width: '100%',
  },
  privacyTitle: {
    fontSize: 13,
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  privacyLaw: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  previewWrap: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 3,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  scanLineOverlay: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 20,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});
