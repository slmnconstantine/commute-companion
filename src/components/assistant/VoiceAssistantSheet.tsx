import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useVoiceAssistant } from '@/context/VoiceAssistantContext';

export default function VoiceAssistantSheet() {
  const { theme } = useTheme();
  const { state, transcript, spokenReply, command, stopRecording, cancel, confirmAction } = useVoiceAssistant();
  
  const slideAnim = useRef(new Animated.Value(300)).current;

  const isVisible = state !== 'idle' && state !== 'error';

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  if (!isVisible && state !== 'error') return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View 
        style={[
          styles.sheet, 
          { backgroundColor: theme.colors.surface, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {state === 'recording' && 'Listening...'}
            {state === 'transcribing' && 'Transcribing...'}
            {state === 'thinking' && 'Thinking...'}
            {state === 'speaking' && 'Assistant'}
            {state === 'confirming' && 'Confirmation'}
            {state === 'executing' && 'Executing...'}
            {state === 'error' && 'Error'}
          </Text>
          <Pressable onPress={cancel} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.content}>
          {['transcribing', 'thinking', 'executing'].includes(state) && (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 20 }} />
          )}

          {state === 'recording' && (
            <Pressable 
              onPress={stopRecording}
              style={[styles.recordBtn, { backgroundColor: theme.colors.error }]}
            >
              <Ionicons name="stop" size={32} color="#fff" />
            </Pressable>
          )}

          {transcript ? (
            <Text style={[styles.transcript, { color: theme.colors.textMuted }]}>
              "{transcript}"
            </Text>
          ) : null}

          {spokenReply ? (
            <Text style={[styles.reply, { color: theme.colors.text }]}>
              {spokenReply}
            </Text>
          ) : null}

          {state === 'confirming' && (
            <View style={styles.actionRow}>
              <Pressable 
                style={[styles.btn, styles.btnCancel, { borderColor: theme.colors.border }]} 
                onPress={cancel}
              >
                <Text style={[styles.btnText, { color: theme.colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.btn, styles.btnConfirm, { backgroundColor: theme.colors.primary }]} 
                onPress={confirmAction}
              >
                <Text style={[styles.btnText, { color: '#fff' }]}>Confirm</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 10000,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    alignItems: 'center',
    minHeight: 120,
  },
  recordBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  transcript: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
  },
  reply: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnCancel: {
    borderWidth: 1,
  },
  btnConfirm: {},
  btnText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
});
