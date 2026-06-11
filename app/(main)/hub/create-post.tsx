import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Alert, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/hooks/useLocation';
import { createHubPost } from '@/services/hubPosts';

const STATUS_TAGS = [
  { label: 'Traffic', icon: 'car', color: '#EF4444' },
  { label: 'Tip', icon: 'bulb', color: '#10B981' },
  { label: 'Alert', icon: 'warning', color: '#F59E0B' },
  { label: 'Question', icon: 'help-circle', color: '#3B82F6' },
];

export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { profile } = useAuth();
  const { location, address } = useLocation();

  const [message, setMessage] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const buttonScale = useRef(new Animated.Value(1)).current;

  const handlePost = async () => {
    if (!message.trim() || !selectedTag || !profile) {
      Alert.alert('Missing Info', 'Please write a message and select a category.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await createHubPost({
        author_id: profile.id,
        route_hash: `${location.latitude.toFixed(2)}_${location.longitude.toFixed(2)}`,
        status_tag: selectedTag.toLowerCase(),
        message: message.trim(),
        location_lat: location.latitude,
        location_lng: location.longitude,
      });
      if (error) throw error;
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
          {STATUS_TAGS.map((tag) => (
            <Pressable
              key={tag.label}
              style={[
                styles.tagChip,
                {
                  backgroundColor: selectedTag === tag.label ? `${tag.color}20` : theme.colors.surface,
                  borderColor: selectedTag === tag.label ? tag.color : theme.colors.border,
                },
              ]}
              onPress={() => setSelectedTag(tag.label)}
            >
              <Ionicons name={tag.icon as any} size={18} color={selectedTag === tag.label ? tag.color : theme.colors.textMuted} />
              <Text style={[styles.tagText, { color: selectedTag === tag.label ? tag.color : theme.colors.text, fontFamily: 'Inter-Medium' }]}>
                {tag.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Message */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Message</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="What's happening on your route?"
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={5}
          style={[styles.messageInput, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text,
            fontFamily: 'Inter-Regular',
          }]}
        />

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
  content: { padding: 24, gap: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, marginBottom: 4 },
  tagsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  tagText: { fontSize: 14 },
  messageInput: { borderRadius: 16, borderWidth: 1.5, padding: 16, fontSize: 15, textAlignVertical: 'top', minHeight: 140, lineHeight: 22 },
  locationCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  locationInfo: { flex: 1, gap: 2 },
  locationLabel: { fontSize: 12 },
  locationAddress: { fontSize: 14 },
  postBtn: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  postBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-SemiBold' },
});
