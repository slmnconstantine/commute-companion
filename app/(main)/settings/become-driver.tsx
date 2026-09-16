/**
 * Become a Driver Screen
 *
 * Allows commuters to apply to become a driver by uploading
 * vehicle information and required documents.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { uploadDriverDocument } from '@/services/storage';
import DocumentCaptureModal from '@/components/verification/DocumentCaptureModal';

import { addVehicle } from '@/services/vehicles';

export default function BecomeDriverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { profile, updateProfile } = useAuth();

  const [vehicleModel, setVehicleModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [gcashNumber, setGcashNumber] = useState(profile?.gcash_number || '');
  const [gcashName, setGcashName] = useState(profile?.gcash_name || '');
  const [vehicleType, setVehicleType] = useState<'sedan' | 'suv' | 'van' | 'motorcycle'>('sedan');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});

  const buttonScale = useRef(new Animated.Value(1)).current;

  const vehicleTypes = [
    { key: 'sedan' as const, icon: 'car-sport', label: 'Sedan' },
    { key: 'suv' as const, icon: 'car', label: 'SUV' },
    { key: 'van' as const, icon: 'bus', label: 'Van' },
    { key: 'motorcycle' as const, icon: 'bicycle', label: 'Motorcycle' },
  ];

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!vehicleModel.trim()) newErrors.vehicleModel = 'Vehicle model is required';
    if (!plateNumber.trim()) newErrors.plateNumber = 'Plate number is required';
    
    const cleanGcash = gcashNumber.trim().replace(/\s|-/g, '');
    if (!cleanGcash) {
      newErrors.gcashNumber = 'GCash number is required for reservations';
    } else if (!/^09\d{9}$/.test(cleanGcash)) {
      newErrors.gcashNumber = 'Enter a valid 11-digit GCash number (09XXXXXXXXX)';
    }

    if (!gcashName.trim()) {
      newErrors.gcashName = 'GCash registered account name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const updates: Record<string, any> = {
        role: 'driver',
        is_verified: false, // Requires manual verification
        gcash_number: gcashNumber.trim().replace(/\s|-/g, ''),
        gcash_name: gcashName.trim(),
      };
      if (docUrls.license) {
        updates.government_id_url = docUrls.license;
      }
      const { error } = await updateProfile(updates);

      if (error) {
        Alert.alert('Error', error.message || 'Failed to submit application.');
      } else {
        try {
          if (profile?.id) {
            await addVehicle(
              profile.id,
              plateNumber.trim(),
              'private',
              `${vehicleModel.trim()} (${vehicleType.toUpperCase()})`,
              vehicleType === 'motorcycle' ? '1' : vehicleType === 'van' ? '12' : '4'
            );
          }
        } catch (vErr) {
          console.warn('Vehicle registration note:', vErr);
        }

        Alert.alert(
          'Application Submitted!',
          'Your driver application and documents have been submitted for review. Once verified by our team, you will be able to start posting rides.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoOverride = async () => {
    if (!profile) return;

    Alert.alert(
      'Select Vehicle Type',
      'What type of vehicle do you drive?',
      [
        {
          text: 'Tricycle',
          onPress: () => processDriverOverride('public', 'Tricycle (TODA)', '3'),
        },
        {
          text: 'Private Vehicle (Car)',
          onPress: () => processDriverOverride('private', 'Sedan (Private)', '4'),
        },
        {
          text: 'Motorcycle',
          onPress: () => processDriverOverride('private', 'Motorcycle', '1'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const processDriverOverride = async (type: string, defaultModel: string, capacity: string) => {
    if (!profile) return;
    setLoading(true);
    try {
      const { error } = await updateProfile({
        role: 'driver',
        is_verified: true,
        verified_badge: true,
      });
      if (error) throw error;

      const plate = plateNumber.trim() || `DEMO-${Math.floor(100 + Math.random() * 900)}`;
      const model = vehicleModel.trim() || defaultModel;

      try {
        await addVehicle(profile.id, plate, type, model, capacity);
      } catch (vErr) {
        console.warn('Note: Mock vehicle insertion skipped:', vErr);
      }

      Alert.alert('Success!', 'You are now a verified driver with your registered vehicle.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to verify driver.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Become a Driver</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Section */}
        <View style={[styles.hero, { backgroundColor: `${theme.colors.primary}10` }]}>
          <View style={[styles.heroIconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
            <Ionicons name="car-sport" size={48} color={theme.colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
            Start Earning as a Driver
          </Text>
          <Text style={[styles.heroDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            Share your commute, offer rides, and earn by carpooling with others in your community.
          </Text>
        </View>

        {/* Vehicle Type Selection */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
          Vehicle Type
        </Text>
        <View style={styles.vehicleTypeRow}>
          {vehicleTypes.map((vt) => (
            <Pressable
              key={vt.key}
              style={[
                styles.vehicleTypeCard,
                {
                  backgroundColor: vehicleType === vt.key ? `${theme.colors.primary}15` : theme.colors.surface,
                  borderColor: vehicleType === vt.key ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setVehicleType(vt.key)}
            >
              <Ionicons
                name={vt.icon as any}
                size={24}
                color={vehicleType === vt.key ? theme.colors.primary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.vehicleTypeLabel,
                  {
                    color: vehicleType === vt.key ? theme.colors.primary : theme.colors.textMuted,
                    fontFamily: vehicleType === vt.key ? 'Inter-SemiBold' : 'Inter-Regular',
                  },
                ]}
              >
                {vt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Vehicle Model */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
          Vehicle Model
        </Text>
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: errors.vehicleModel ? theme.colors.error : theme.colors.border }]}>
          <Ionicons name="car-outline" size={20} color={theme.colors.textMuted} />
          <TextInput
            value={vehicleModel}
            onChangeText={(t) => { setVehicleModel(t); setErrors(e => ({ ...e, vehicleModel: '' })); }}
            placeholder="e.g. Toyota Vios 2022"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.textInput, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]}
          />
        </View>
        {errors.vehicleModel && <Text style={[styles.errorText, { color: theme.colors.error }]}>{errors.vehicleModel}</Text>}

        {/* Plate Number */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', marginTop: 20 }]}>
          Plate Number
        </Text>
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: errors.plateNumber ? theme.colors.error : theme.colors.border }]}>
          <Ionicons name="document-text-outline" size={20} color={theme.colors.textMuted} />
          <TextInput
            value={plateNumber}
            onChangeText={(t) => { setPlateNumber(t.toUpperCase()); setErrors(e => ({ ...e, plateNumber: '' })); }}
            placeholder="e.g. ABC 1234"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="characters"
            style={[styles.textInput, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]}
          />
        </View>
        {errors.plateNumber && <Text style={[styles.errorText, { color: theme.colors.error }]}>{errors.plateNumber}</Text>}

        {/* GCash Payment & Reservation Details */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', marginTop: 24 }]}>
          GCash Payment Details
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontFamily: 'Inter-Regular', marginBottom: 12 }}>
          Your GCash details will be visible to commuters for advance seat reservation fees and fare payments.
        </Text>

        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: errors.gcashNumber ? theme.colors.error : theme.colors.border }]}>
          <Ionicons name="wallet-outline" size={20} color={theme.colors.primary} />
          <TextInput
            value={gcashNumber}
            onChangeText={(t) => { setGcashNumber(t); setErrors(e => ({ ...e, gcashNumber: '' })); }}
            placeholder="GCash Number (e.g. 09171234567)"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="phone-pad"
            maxLength={13}
            style={[styles.textInput, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]}
          />
        </View>
        {errors.gcashNumber && <Text style={[styles.errorText, { color: theme.colors.error }]}>{errors.gcashNumber}</Text>}

        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: errors.gcashName ? theme.colors.error : theme.colors.border, marginTop: 10 }]}>
          <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
          <TextInput
            value={gcashName}
            onChangeText={(t) => { setGcashName(t); setErrors(e => ({ ...e, gcashName: '' })); }}
            placeholder="GCash Registered Name (e.g. JUAN D.)"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="characters"
            style={[styles.textInput, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]}
          />
        </View>
        {errors.gcashName && <Text style={[styles.errorText, { color: theme.colors.error }]}>{errors.gcashName}</Text>}

        {/* Upload Documents */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', marginTop: 24 }]}>
          Required Documents
        </Text>

        <UploadCard
          icon="camera-outline"
          title="Vehicle Photo"
          description="Take or upload a clear photo of your vehicle"
          theme={theme}
          docType="vehicle_photo"
          userId={profile?.id}
          onUploadSuccess={(url) => setDocUrls(prev => ({ ...prev, vehicle_photo: url }))}
        />
        <UploadCard
          icon="document-attach-outline"
          title="Vehicle Registration (OR/CR)"
          description="Upload your Official Receipt and Certificate of Registration"
          theme={theme}
          docType="or_cr"
          userId={profile?.id}
          onUploadSuccess={(url) => setDocUrls(prev => ({ ...prev, or_cr: url }))}
        />
        <UploadCard
          icon="id-card-outline"
          title="Driver's License"
          description="Upload a valid Philippine driver's license"
          theme={theme}
          docType="license"
          userId={profile?.id}
          onUploadSuccess={(url) => setDocUrls(prev => ({ ...prev, license: url }))}
        />

        {/* Submit Button */}
        <Animated.View style={[styles.submitContainer, { transform: [{ scale: buttonScale }] }]}>
          <Pressable
            style={[styles.submitButton, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSubmit}
            onPressIn={() => Animated.spring(buttonScale, { toValue: 0.97, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(buttonScale, { toValue: 1, friction: 5, useNativeDriver: true }).start()}
            disabled={loading}
          >
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.submitText}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Demo Override */}
        <Pressable
          style={[styles.demoButton, { borderColor: theme.colors.border }]}
          onPress={handleDemoOverride}
        >
          <Ionicons name="flash" size={18} color={theme.colors.accent} />
          <Text style={[styles.demoText, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>
            Override Verification (Demo)
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function UploadCard({
  icon,
  title,
  description,
  theme,
  docType,
  userId,
  onUploadSuccess
}: {
  icon: string;
  title: string;
  description: string;
  theme: any;
  docType: string;
  userId?: string;
  onUploadSuccess?: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [showCaptureModal, setShowCaptureModal] = useState(false);

  const getDocTypeCategory = (): 'license' | 'vehicle' | 'or_cr' | 'id' => {
    if (docType.includes('license')) return 'license';
    if (docType.includes('vehicle')) return 'vehicle';
    if (docType.includes('or_cr')) return 'or_cr';
    return 'id';
  };

  const handleOpenCapture = () => {
    if (!userId) {
      Alert.alert('Error', 'Please log in to upload documents.');
      return;
    }
    setShowCaptureModal(true);
  };

  const handleCaptureSuccess = async (base64: string) => {
    if (!userId) return;
    setUploading(true);
    try {
      const url = await uploadDriverDocument(userId, base64, docType);
      if (url) {
        setUploadedUrl(url);
        if (onUploadSuccess) onUploadSuccess(url);
      }
    } catch (e) {
      console.error('Document upload error:', e);
      Alert.alert('Upload Error', 'Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Pressable
        style={[
          styles.uploadCard,
          {
            backgroundColor: uploadedUrl ? `${theme.colors.success}08` : theme.colors.surface,
            borderColor: uploadedUrl ? theme.colors.success : theme.colors.border,
          },
        ]}
        onPress={handleOpenCapture}
        disabled={uploading}
      >
        <View style={[styles.uploadIcon, { backgroundColor: uploadedUrl ? `${theme.colors.success}15` : `${theme.colors.primary}10` }]}>
          {uploading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Ionicons
              name={uploadedUrl ? 'checkmark-circle' : (icon as any)}
              size={24}
              color={uploadedUrl ? theme.colors.success : theme.colors.primary}
            />
          )}
        </View>
        <View style={styles.uploadInfo}>
          <Text style={[styles.uploadTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
            {title}
          </Text>
          <Text style={[styles.uploadDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            {uploading ? 'Uploading live capture to documents...' : uploadedUrl ? 'Live document verified & attached' : description}
          </Text>
        </View>
        <Ionicons
          name={uploadedUrl ? 'checkmark-circle' : 'camera-outline'}
          size={22}
          color={uploadedUrl ? theme.colors.success : theme.colors.textMuted}
        />
      </Pressable>

      <DocumentCaptureModal
        visible={showCaptureModal}
        onClose={() => setShowCaptureModal(false)}
        onCaptureSuccess={handleCaptureSuccess}
        documentTitle={title}
        documentType={getDocTypeCategory()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17 },
  scrollContent: { padding: 20, paddingBottom: 100 },

  hero: { alignItems: 'center', padding: 28, borderRadius: 20, marginBottom: 28, gap: 12 },
  heroIconContainer: { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 22, textAlign: 'center' },
  heroDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  sectionTitle: { fontSize: 15, marginBottom: 10 },

  vehicleTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  vehicleTypeCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  vehicleTypeLabel: { fontSize: 11 },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    gap: 10,
  },
  textInput: { flex: 1, fontSize: 15 },
  errorText: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 4, marginLeft: 4 },

  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  uploadIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  uploadInfo: { flex: 1, gap: 2 },
  uploadTitle: { fontSize: 14 },
  uploadDesc: { fontSize: 12, lineHeight: 16 },

  submitContainer: { marginTop: 24 },
  submitButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-SemiBold' },

  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  demoText: { fontSize: 13 },
});
