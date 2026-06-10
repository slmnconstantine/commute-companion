import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { AVATAR_BUCKET, DOCUMENTS_BUCKET } from '@/lib/constants';
import { handleServiceError } from '@/utils/errorHelper';

/** Pick an image from the gallery */
export async function pickImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.7,
    base64: true,
  });
  if (result.canceled || !result.assets[0]?.base64) return null;
  return result.assets[0].base64;
}

/** Take a photo with camera */
export async function takePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return null;
  
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.7,
    base64: true,
  });
  if (result.canceled || !result.assets[0]?.base64) return null;
  return result.assets[0].base64;
}

/** Upload an image to Supabase Storage */
export async function uploadImage(
  bucket: string,
  path: string,
  base64Data: string,
  contentType: string = 'image/jpeg'
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, decode(base64Data), {
        contentType,
        upsert: true,
      });
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (error) {
    handleServiceError('Upload error:', error);
    return null;
  }
}

/** Upload avatar image */
export async function uploadAvatar(userId: string, base64Data: string): Promise<string | null> {
  const path = `${userId}/avatar_${Date.now()}.jpg`;
  return uploadImage(AVATAR_BUCKET, path, base64Data);
}

/** Upload government ID image */
export async function uploadGovernmentId(userId: string, base64Data: string): Promise<string | null> {
  const path = `${userId}/gov_id_${Date.now()}.jpg`;
  return uploadImage(DOCUMENTS_BUCKET, path, base64Data);
}
