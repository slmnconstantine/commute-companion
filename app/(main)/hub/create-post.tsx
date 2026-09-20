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
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/hooks/useLocation';
import { createPost } from '@/services/hub';
import { uploadHubPostImage, pickHubImage } from '@/services/storage';
import { STATUS_CONFIG } from '@/components/community/HubPostCard';

export default function CreatePostScreen() {
  const router = useRouter();
  const { tripId, initialMessage, routeHash: paramRouteHash } = useLocalSearchParams<{
    tripId?: string;
    initialMessage?: string;
    routeHash?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { profile } = useAuth();
  const { location, address } = useLocation();

  const [message, setMessage] = useState(initialMessage || '');
  const [selectedTag, setSelectedTag] = useState<string | null>(tripId ? 'ride' : null);
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{ uri: string; base64: string }[]>([]);
  const buttonScale = useRef(new Animated.Value(1)).current;

  const handlePickImage = async () => {
    if (selectedImages.length >= 2) {
      Alert.alert('Limit Reached', 'You can attach up to 2 images per update.');
      return;
    }
    const result = await pickHubImage();
    if (result) {
      setSelectedImages((prev) => [...prev, result]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!message.trim() || !selectedTag || !profile || loading) {
      if (!loading) Alert.alert('Missing Info', 'Please write a message and select a category.');
      return;
    }
    setLoading(true);
    try {
      let uploadedUrls: string[] = [];
      if (selectedImages.length > 0) {
        for (const img of selectedImages) {
          const url = await uploadHubPostImage(profile.id, img.base64);
          if (url) uploadedUrls.push(url);
        }
      }

      const targetRouteHash = paramRouteHash || (location ? `${location.latitude.toFixed(2)}_${location.longitude.toFixed(2)}` : 'default_route');

      await createPost(
        profile.id,
        targetRouteHash,
        selectedTag.toLowerCase(),
        message.trim(),
        location?.latitude ?? 0,
        location?.longitude ?? 0,
        address || undefined,
        uploadedUrls.length > 0 ? uploadedUrls : undefined,
        tripId || undefined
      );

      Alert.alert('Posted!', 'Your update has been shared with the community.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create post.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>New Post</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Category Selection */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Category</Text>
        <View style={styles.tagsRow}>
          {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((tagKey) => {
            const tag = STATUS_CONFIG[tagKey];
            const isSelected = selectedTag === tagKey;
            return (
              <Pressable
                key={tagKey}
                style={[
                  styles.tagChip,
                  {
                    backgroundColor: isSelected ? `${tag.color}20` : theme.colors.surface,
                    borderColor: isSelected ? tag.color : theme.colors.border,
                  },
                ]}
                onPress={() => setSelectedTag(tagKey)}
              >
                <Ionicons name={tag.icon} size={16} color={isSelected ? tag.color : theme.colors.textMuted} />
                <Text style={[styles.tagText, { color: isSelected ? tag.color : theme.colors.text, fontFamily: 'Inter-Medium' }]}>
                  {tag.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Attached Ride Info */}
        {tripId && (
          <View style={[styles.attachedRideBox, { backgroundColor: `${theme.colors.primary}12`, borderColor: `${theme.colors.primary}35` }]}>
            <Ionicons name="car-sport" size={18} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.attachedRideTitle, { color: theme.colors.primary }]}>
                Attached Carpool Ride
              </Text>
              <Text style={[styles.attachedRideSub, { color: theme.colors.textMuted }]}>
                An interactive "Join Ride" card will be attached to your post.
              </Text>
            </View>
          </View>
        )}

        {/* Message */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Message</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="What's happening on your route?"
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={5}
          maxLength={280}
          style={[styles.messageInput, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text,
            fontFamily: 'Inter-Regular',
          }]}
        />

        {/* Image Attachments */}
        {selectedImages.length > 0 && (
          <View style={styles.imagePreviewRow}>
            {selectedImages.map((img, i) => (
              <View key={i} style={[styles.previewThumbWrapper, { borderColor: theme.colors.border }]}>
                <Image source={{ uri: img.uri }} style={styles.previewThumb} />
                <Pressable
                  style={styles.removeImageBtn}
                  onPress={() => handleRemoveImage(i)}
                  hitSlop={6}
                >
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Pressable
          style={[
            styles.attachBtn,
            {
              borderColor: theme.colors.border,
              backgroundColor: selectedImages.length >= 2 ? `${theme.colors.border}40` : theme.colors.surface,
            },
          ]}
          onPress={handlePickImage}
          disabled={selectedImages.length >= 2}
        >
          <Ionicons name="camera-outline" size={18} color={theme.colors.primary} />
          <Text style={[styles.attachBtnText, { color: theme.colors.primary }]}>
            {selectedImages.length === 0 ? 'Attach Photos (up to 2)' : `${selectedImages.length}/2 Photos Attached`}
          </Text>
        </Pressable>

        {/* Location */}
        <View style={[styles.locationCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="location" size={20} color={theme.colors.primary} />
          <View style={styles.locationInfo}>
            <Text style={[styles.locationLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>Your Location</Text>
            <Text style={[styles.locationAddress, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]} numberOfLines={1}>
              {address || 'Getting location...'}
            </Text>
          </View>
        </View>

        {/* Post Button */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <Pressable
            style={[styles.postBtn, { backgroundColor: theme.colors.primary, opacity: loading || !message.trim() || !selectedTag ? 0.6 : 1 }]}
            onPress={handlePost}
            onPressIn={() => Animated.spring(buttonScale, { toValue: 0.97, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(buttonScale, { toValue: 1, friction: 5, useNativeDriver: true }).start()}
            disabled={loading || !message.trim() || !selectedTag}
          >
            <Ionicons name="send" size={20} color="#fff" />
            <Text style={styles.postBtnText}>{loading ? 'Posting...' : 'Share Update'}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17 },
  content: { padding: 24, gap: 14, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, marginBottom: 2 },
  tagsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5 },
  tagText: { fontSize: 13 },
  messageInput: { borderRadius: 16, borderWidth: 1.5, padding: 16, fontSize: 15, textAlignVertical: 'top', minHeight: 120, lineHeight: 22 },
  imagePreviewRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  previewThumbWrapper: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  previewThumb: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  attachBtnText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  locationCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  locationInfo: { flex: 1, gap: 2 },
  locationLabel: { fontSize: 12 },
  locationAddress: { fontSize: 14 },
  attachedRideBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
  },
  attachedRideTitle: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  attachedRideSub: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  postBtn: { height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  postBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-SemiBold' },
});
