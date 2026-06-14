import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { submitReview } from '@/services/reviews';

export default function ReviewScreen() {
  const { id, driverId } = useLocalSearchParams<{ id: string; driverId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { profile } = useAuth();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const buttonScale = useRef(new Animated.Value(1)).current;

  const handleSubmit = async () => {
    if (rating === 0) { Alert.alert('Rating Required', 'Please select a star rating.'); return; }
    if (!profile || !id) return;
    setLoading(true);
    try {
      const { error } = await submitReview({
        booking_id: id,
        reviewer_id: profile.id,
        reviewee_id: driverId || '', // Passed from Activity tab
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
      Alert.alert('Thank You!', 'Your review has been submitted.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit review.');
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
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Rate Your Trip</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.content}>
        <View style={[styles.emojiCircle, { backgroundColor: `${theme.colors.accent}15` }]}>
          <Text style={styles.emoji}>{rating >= 4 ? '😊' : rating >= 2 ? '😐' : rating > 0 ? '😟' : '⭐'}</Text>
        </View>
        <Text style={[styles.prompt, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
          How was your ride?
        </Text>

        {/* Stars */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => setRating(star)} style={styles.starBtn}>
              <Ionicons
                name={star <= rating ? 'star' : 'star-outline'}
                size={44}
                color={star <= rating ? theme.colors.accent : theme.colors.border}
              />
            </Pressable>
          ))}
        </View>

        {/* Comment */}
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Tell us about your experience... (optional)"
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={4}
          style={[styles.commentInput, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text,
            fontFamily: 'Inter-Regular',
          }]}
        />

        <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
          <Pressable
            style={[styles.submitBtn, { backgroundColor: theme.colors.primary, opacity: loading || !rating ? 0.6 : 1 }]}
            onPress={handleSubmit}
            onPressIn={() => Animated.spring(buttonScale, { toValue: 0.97, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(buttonScale, { toValue: 1, friction: 5, useNativeDriver: true }).start()}
            disabled={loading || !rating}
          >
            <Text style={styles.submitText}>{loading ? 'Submitting...' : 'Submit Review'}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17 },
  content: { flex: 1, alignItems: 'center', padding: 32, paddingTop: 48 },
  emojiCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emoji: { fontSize: 40 },
  prompt: { fontSize: 22, marginBottom: 24 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  starBtn: { padding: 4 },
  commentInput: { width: '100%', borderRadius: 16, borderWidth: 1.5, padding: 16, fontSize: 15, textAlignVertical: 'top', minHeight: 120, marginBottom: 24 },
  submitBtn: { width: '100%', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  submitText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-SemiBold' },
});
