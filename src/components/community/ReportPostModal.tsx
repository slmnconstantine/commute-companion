import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { reportHubPost } from '@/services/reports';

interface ReportPostModalProps {
  visible: boolean;
  postId: string | null;
  currentUserId: string | null;
  onClose: () => void;
  onReported?: () => void;
}

const REPORT_REASONS = [
  { id: 'misleading', label: 'Misleading or inaccurate update', icon: 'alert-circle-outline' },
  { id: 'spam', label: 'Spam or advertising', icon: 'megaphone-outline' },
  { id: 'harassment', label: 'Harassment or abusive language', icon: 'hand-left-outline' },
  { id: 'safety', label: 'Safety concern or false alert', icon: 'warning-outline' },
  { id: 'other', label: 'Other issue', icon: 'help-circle-outline' },
];

export default function ReportPostModal({
  visible,
  postId,
  currentUserId,
  onClose,
  onReported,
}: ReportPostModalProps) {
  const { theme } = useTheme();
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0].label);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!postId || !currentUserId) return;

    setSubmitting(true);
    const { error, autoRemoved, alreadyReported } = await reportHubPost(
      currentUserId,
      postId,
      selectedReason,
      details.trim() || undefined
    );
    setSubmitting(false);

    if (error) {
      Alert.alert('Error', 'Unable to submit report. Please try again.');
    } else if (alreadyReported) {
      Alert.alert(
        'Already Reported',
        'You have already submitted a report for this post. Our moderation team is reviewing it.',
        [{ text: 'OK', onPress: () => {
          setDetails('');
          onClose();
        }}]
      );
    } else if (autoRemoved) {
      Alert.alert(
        'Post Removed',
        'This post has received more than 20 reports from the community and has been automatically removed.',
        [{ text: 'OK', onPress: () => {
          setDetails('');
          onClose();
          if (onReported) onReported();
        }}]
      );
    } else {
      Alert.alert(
        'Report Submitted',
        'Thank you for keeping our commute community safe and accurate. Our team will review this post.',
        [{ text: 'OK', onPress: () => {
          setDetails('');
          onClose();
          if (onReported) onReported();
        }}]
      );
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.backdrop}
      >
        <View style={[styles.container, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="flag-outline" size={20} color={theme.colors.error} />
              <Text style={[styles.title, { color: theme.colors.text }]}>Report Community Post</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            Why are you reporting this post?
          </Text>

          <View style={styles.reasonsList}>
            {REPORT_REASONS.map((reason) => {
              const isSelected = selectedReason === reason.label;
              return (
                <Pressable
                  key={reason.id}
                  style={[
                    styles.reasonItem,
                    {
                      backgroundColor: isSelected ? `${theme.colors.primary}12` : theme.colors.surface,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setSelectedReason(reason.label)}
                >
                  <Ionicons
                    name={reason.icon as any}
                    size={18}
                    color={isSelected ? theme.colors.primary : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.reasonText,
                      {
                        color: isSelected ? theme.colors.primary : theme.colors.text,
                        fontFamily: isSelected ? 'Inter-SemiBold' : 'Inter-Regular',
                      },
                    ]}
                  >
                    {reason.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.inputLabel, { color: theme.colors.textMuted }]}>
            Additional details (optional):
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            placeholder="Add context to help reviewers..."
            placeholderTextColor={theme.colors.textMuted}
            value={details}
            onChangeText={setDetails}
            multiline
            numberOfLines={3}
            maxLength={250}
          />

          <View style={styles.actions}>
            <Pressable
              style={[styles.cancelBtn, { borderColor: theme.colors.border }]}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={{ color: theme.colors.text, fontFamily: 'Inter-Medium', fontSize: 14 }}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.submitBtn,
                { backgroundColor: theme.colors.error, opacity: submitting ? 0.7 : 1 },
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontFamily: 'Inter-SemiBold', fontSize: 14 }}>
                  Submit Report
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  reasonsList: {
    gap: 8,
    marginBottom: 14,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  reasonText: {
    fontSize: 13,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
