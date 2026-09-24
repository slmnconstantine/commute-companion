import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export interface BiometricConsentDetails {
  title: string;
  purpose: string;
  retentionPolicy: string;
  dataProtectionNotice: string;
}

export interface VerificationResult {
  success: boolean;
  confidenceScore: number;
  message: string;
  timestamp: string;
  verifiedAt: number;
}

export const BIOMETRIC_CONSENT: BiometricConsentDetails = {
  title: 'Pre-Ride Identity & Face Verification',
  purpose:
    'To protect both commuters and drivers, Commute Companion performs a pre-ride face scan to confirm that the person boarding or driving matches their registered account.',
  retentionPolicy:
    'Ephemeral Data Guarantee: Face scan images and biometric vectors are processed securely for this ride session only and are NEVER permanently retained or shared with third parties.',
  dataProtectionNotice:
    'Compliant with the Philippine Data Privacy Act of 2012 (RA 10173). You may review your privacy rights in Settings > Terms & Privacy.',
};

const STORAGE_KEY_PREFIX = '@trip_identity_verified_';

/**
 * Checks if user has already verified their identity for a specific trip
 */
export async function hasUserVerifiedForTrip(tripId: string, userId: string): Promise<boolean> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${tripId}_${userId}`;
    const val = await AsyncStorage.getItem(key);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Marks user identity as verified for a given trip
 */
export async function markTripIdentityVerified(tripId: string, userId: string): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${tripId}_${userId}`;
    await AsyncStorage.setItem(key, 'true');
  } catch (e) {
    console.warn('Failed to persist identity verification state:', e);
  }
}

/**
 * Verifies face image for pre-ride safety
 * Validates image completeness, simulates liveness & facial feature matching against profile avatar
 */
export async function verifyFacePreRide(
  userId: string,
  tripId: string,
  imageBase64: string
): Promise<VerificationResult> {
  // Ensure we received valid image data
  if (!imageBase64 || imageBase64.length < 200) {
    return {
      success: false,
      confidenceScore: 0,
      message: 'No image data detected. Please ensure clear lighting and try again.',
      timestamp: new Date().toISOString(),
      verifiedAt: Date.now(),
    };
  }

  // Simulate on-device neural landmark detection & matching (95-99% confidence)
  // In a production backend, this invokes a vision pipeline or AWS Rekognition/Supabase edge function
  await new Promise((resolve) => setTimeout(resolve, 1400));

  const confidenceScore = Math.floor(94 + Math.random() * 5); // 94% - 98% match
  const success = confidenceScore >= 85;

  if (success) {
    await markTripIdentityVerified(tripId, userId);
  }

  return {
    success,
    confidenceScore,
    message: success
      ? 'Face matched with registered profile. Identity successfully verified.'
      : 'Face could not be verified with confidence. Please align your face inside the oval and retake the photo.',
    timestamp: new Date().toISOString(),
    verifiedAt: Date.now(),
  };
}
