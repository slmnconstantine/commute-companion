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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { analyzeDocumentQuality, DocumentQualityResult } from '@/services/documentQuality';

const { width } = Dimensions.get('window');

export interface DocumentCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onCaptureSuccess: (base64: string, uri: string) => void;
  documentTitle?: string;
  documentType?: 'id' | 'license' | 'vehicle' | 'or_cr';
}

export default function DocumentCaptureModal({
  visible,
  onClose,
  onCaptureSuccess,
  documentTitle = 'Government ID',
  documentType = 'id',
}: DocumentCaptureModalProps) {
  const { theme } = useTheme();

  const [step, setStep] = useState<'guide' | 'analyzing' | 'review'>('guide');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [qualityResult, setQualityResult] = useState<DocumentQualityResult | null>(null);

  const resetState = () => {
    setStep('guide');
    setCapturedUri(null);
    setCapturedBase64(null);
    setQualityResult(null);
    onClose();
  };

  const handleLaunchCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Camera access is required to take a live document photo for verification.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.back,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets[0]?.uri) {
        return;
      }

      const asset = result.assets[0];
      setCapturedUri(asset.uri);
      const b64 = asset.base64 || '';
      setCapturedBase64(b64);
      setStep('analyzing');

      // Analyze image quality & blurriness
      const quality = await analyzeDocumentQuality(
        {
          width: asset.width,
          height: asset.height,
          base64: b64,
          fileSize: asset.fileSize,
        },
        documentType
      );

      setQualityResult(quality);
      setStep('review');
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Failed to capture document photo.');
      setStep('guide');
    }
  };

  const handleConfirm = () => {
    if (!capturedBase64 || !capturedUri) return;

    if (qualityResult && !qualityResult.isClear) {
      Alert.alert(
        'Photo Appears Blurry',
        documentType === 'vehicle'
          ? 'Your vehicle photo may be rejected by administrators if details or license plate are unclear. Are you sure you want to proceed with this photo?'
          : 'Your document may be rejected by administrators if details are unclear. Are you sure you want to proceed with this photo?',
        [
          { text: 'Retake', style: 'cancel', onPress: handleLaunchCamera },
          {
            text: 'Submit Anyway',
            style: 'destructive',
            onPress: () => {
              onCaptureSuccess(capturedBase64, capturedUri);
              resetState();
            },
          },
        ]
      );
      return;
    }

    onCaptureSuccess(capturedBase64, capturedUri);
    resetState();
  };

  const getDocTypeIcon = () => {
    switch (documentType) {
      case 'license':
        return 'card-outline';
      case 'vehicle':
        return 'car-outline';
      case 'or_cr':
        return 'document-text-outline';
      case 'id':
      default:
        return 'id-card-outline';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={resetState}>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.headerTitleRow}>
              <Ionicons name={getDocTypeIcon()} size={22} color={theme.colors.primary} />
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                {documentTitle}
              </Text>
            </View>
            <Pressable onPress={resetState} style={styles.closeBtn} hitSlop={10}>
              <Ionicons name="close" size={22} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          {/* Body */}
          {step === 'guide' && (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Security Banner */}
              <View
                style={[
                  styles.securityBadge,
                  {
                    backgroundColor: `${theme.colors.primary}12`,
                    borderColor: `${theme.colors.primary}30`,
                  },
                ]}
              >
                <Ionicons name="shield-checkmark" size={18} color={theme.colors.primary} />
                <Text style={[styles.securityBadgeText, { color: theme.colors.primary }]}>
                  Live Camera Capture Only — For your safety and anti-fraud verification, {documentType === 'vehicle' ? 'vehicle photos' : 'documents'} must be photographed in real-time. Gallery uploads are disabled.
                </Text>
              </View>

              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                How to take a clear photo
              </Text>

              {/* Guidelines List */}
              <View style={styles.guideList}>
                {documentType === 'vehicle' ? (
                  <>
                    <GuideItem
                      icon="car-outline"
                      title="Full Vehicle in View"
                      desc="Capture the full exterior of your vehicle showing make, model, color, and condition clearly."
                      theme={theme}
                    />
                    <GuideItem
                      icon="card-outline"
                      title="Clear License Plate"
                      desc="Ensure the license plate is clean, fully visible, and legible from the camera angle."
                      theme={theme}
                    />
                    <GuideItem
                      icon="sunny-outline"
                      title="Bright Daylight or Good Lighting"
                      desc="Take the photo in well-lit conditions. Avoid extreme glare, heavy shadows, or night darkness."
                      theme={theme}
                    />
                    <GuideItem
                      icon="eye-outline"
                      title="Sharp & Crisp Focus"
                      desc="Hold your phone steady until the camera focuses so vehicle details and plate are sharp."
                      theme={theme}
                    />
                    <GuideItem
                      icon="shield-checkmark-outline"
                      title="Original Live Vehicle"
                      desc="Take a live photo of the actual vehicle. Photos of screens or paper prints will be rejected."
                      theme={theme}
                    />
                  </>
                ) : (
                  <>
                    <GuideItem
                      icon="layers-outline"
                      title="Flat, Contrasting Surface"
                      desc="Place your document flat on a dark or contrasting table so all borders stand out."
                      theme={theme}
                    />
                    <GuideItem
                      icon="sunny-outline"
                      title="Good Lighting, Zero Glare"
                      desc="Ensure even lighting from above. Avoid camera flash reflections or dark shadows over text."
                      theme={theme}
                    />
                    <GuideItem
                      icon="scan-outline"
                      title="Frame All 4 Corners"
                      desc="Align the document so that all four corners and edges are fully visible within the camera view."
                      theme={theme}
                    />
                    <GuideItem
                      icon="eye-outline"
                      title="Sharp & Readable Text"
                      desc="Hold your phone steady until the camera focuses. Name, ID number, and photo must be crisp."
                      theme={theme}
                    />
                    <GuideItem
                      icon="document-attach-outline"
                      title="Original Physical Document"
                      desc="Take a photo of the original physical document. Photocopies or screen shots will be rejected."
                      theme={theme}
                    />
                  </>
                )}
              </View>

              {/* Primary Action */}
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleLaunchCamera}
              >
                <Ionicons name="camera" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Open Camera to Capture</Text>
              </Pressable>
            </ScrollView>
          )}

          {step === 'analyzing' && (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.analyzingTitle, { color: theme.colors.text }]}>
                Analyzing Photo Clarity...
              </Text>
              <Text style={[styles.analyzingDesc, { color: theme.colors.textMuted }]}>
                Checking {documentType === 'vehicle' ? 'vehicle photo' : 'document'} focus, contrast, and edge sharpness.
              </Text>
            </View>
          )}

          {step === 'review' && (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Document Preview Card */}
              <View
                style={[
                  styles.previewFrame,
                  {
                    borderColor:
                      qualityResult?.status === 'sharp'
                        ? theme.colors.success
                        : qualityResult?.status === 'acceptable'
                        ? theme.colors.accent || '#F59E0B'
                        : theme.colors.error,
                  },
                ]}
              >
                {capturedUri ? (
                  <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="contain" />
                ) : null}

                {/* Score Pill Overlay */}
                {qualityResult && (
                  <View
                    style={[
                      styles.scorePill,
                      {
                        backgroundColor:
                          qualityResult.status === 'sharp'
                            ? theme.colors.success
                            : qualityResult.status === 'acceptable'
                            ? theme.colors.accent || '#F59E0B'
                            : theme.colors.error,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        qualityResult.status === 'sharp'
                          ? 'checkmark-circle'
                          : qualityResult.status === 'acceptable'
                          ? 'alert-circle'
                          : 'close-circle'
                      }
                      size={14}
                      color="#FFFFFF"
                    />
                    <Text style={styles.scorePillText}>
                      {qualityResult.score}% Clarity • {qualityResult.title}
                    </Text>
                  </View>
                )}
              </View>

              {/* Clarity Feedback Card */}
              {qualityResult && (
                <View
                  style={[
                    styles.qualityCard,
                    {
                      backgroundColor:
                        qualityResult.status === 'sharp'
                          ? `${theme.colors.success}12`
                          : qualityResult.status === 'acceptable'
                          ? `${theme.colors.accent || '#F59E0B'}15`
                          : `${theme.colors.error}15`,
                      borderColor:
                        qualityResult.status === 'sharp'
                          ? `${theme.colors.success}40`
                          : qualityResult.status === 'acceptable'
                          ? `${theme.colors.accent || '#F59E0B'}40`
                          : `${theme.colors.error}40`,
                    },
                  ]}
                >
                  <View style={styles.qualityHeaderRow}>
                    <Ionicons
                      name={
                        qualityResult.status === 'sharp'
                          ? 'shield-checkmark'
                          : qualityResult.status === 'acceptable'
                          ? 'information-circle'
                          : 'warning'
                      }
                      size={20}
                      color={
                        qualityResult.status === 'sharp'
                          ? theme.colors.success
                          : qualityResult.status === 'acceptable'
                          ? theme.colors.accent || '#F59E0B'
                          : theme.colors.error
                      }
                    />
                    <Text
                      style={[
                        styles.qualityTitle,
                        {
                          color:
                            qualityResult.status === 'sharp'
                              ? theme.colors.success
                              : qualityResult.status === 'acceptable'
                              ? theme.colors.accent || '#F59E0B'
                              : theme.colors.error,
                        },
                      ]}
                    >
                      {qualityResult.title}
                    </Text>
                  </View>

                  <Text style={[styles.qualityMessage, { color: theme.colors.text }]}>
                    {qualityResult.message}
                  </Text>

                  {/* Issues List (if any) */}
                  {qualityResult.issues.length > 0 && (
                    <View style={styles.issuesContainer}>
                      {qualityResult.issues.map((issue, idx) => (
                        <View key={idx.toString()} style={styles.issueRow}>
                          <Ionicons name="close-circle-outline" size={15} color={theme.colors.error} />
                          <Text style={[styles.issueText, { color: theme.colors.text }]}>{issue}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Suggestions List */}
                  {qualityResult.suggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      {qualityResult.suggestions.map((sug, idx) => (
                        <View key={idx.toString()} style={styles.suggestionRow}>
                          <Ionicons name="bulb-outline" size={15} color={theme.colors.textMuted} />
                          <Text style={[styles.suggestionText, { color: theme.colors.textMuted }]}>{sug}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.secondaryBtn, { borderColor: theme.colors.border }]}
                  onPress={handleLaunchCamera}
                >
                  <Ionicons name="refresh-outline" size={18} color={theme.colors.text} style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryBtnText, { color: theme.colors.text }]}>Retake Photo</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.confirmBtn,
                    {
                      backgroundColor:
                        qualityResult?.isClear
                          ? theme.colors.primary
                          : theme.colors.accent || '#F59E0B',
                    },
                  ]}
                  onPress={handleConfirm}
                >
                  <Ionicons name="checkmark-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.confirmBtnText}>
                    {qualityResult?.isClear
                      ? documentType === 'vehicle'
                        ? 'Use Vehicle Photo'
                        : documentType === 'license'
                        ? 'Use License'
                        : 'Use Document'
                      : 'Submit Anyway'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function GuideItem({
  icon,
  title,
  desc,
  theme,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  desc: string;
  theme: any;
}) {
  return (
    <View style={styles.guideItem}>
      <View
        style={[
          styles.guideIconWrap,
          { backgroundColor: `${theme.colors.primary}12` },
        ]}
      >
        <Ionicons name={icon} size={18} color={theme.colors.primary} />
      </View>
      <View style={styles.guideTextWrap}>
        <Text style={[styles.guideTitle, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.guideDesc, { color: theme.colors.textMuted }]}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
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
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  securityBadgeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  guideList: {
    gap: 14,
    marginBottom: 24,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  guideIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  guideTextWrap: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  guideDesc: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    lineHeight: 17,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  analyzingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginTop: 20,
    marginBottom: 6,
  },
  analyzingDesc: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  previewFrame: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  scorePill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  scorePillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  qualityCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  qualityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  qualityTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  qualityMessage: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
    marginBottom: 10,
  },
  issuesContainer: {
    gap: 6,
    marginBottom: 8,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  issueText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  suggestionsContainer: {
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  confirmBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
});
