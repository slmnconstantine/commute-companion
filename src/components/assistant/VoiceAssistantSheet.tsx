import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput,
  Dimensions,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence, withDelay, withRepeat, runOnJS, Easing, interpolate } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { useVoiceAssistant } from '@/context/VoiceAssistantContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Thinking dots component
function ThinkingDots({ color }: { color: string }) {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const createDotAnimation = (dot: any, delay: number) => {
      dot.value = withRepeat(
        withSequence(
          withDelay(delay, withTiming(-8, { duration: 300, easing: Easing.out(Easing.cubic) })),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) }),
          withDelay(600 - delay, withTiming(0, { duration: 0 }))
        ),
        -1,
        false
      );
    };

    createDotAnimation(dot1, 0);
    createDotAnimation(dot2, 150);
    createDotAnimation(dot3, 300);
  }, []);

  const d1Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const d2Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const d3Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

  return (
    <View style={dotStyles.container}>
      <Animated.View style={[dotStyles.dot, { backgroundColor: color }, d1Style]} />
      <Animated.View style={[dotStyles.dot, { backgroundColor: color }, d2Style]} />
      <Animated.View style={[dotStyles.dot, { backgroundColor: color }, d3Style]} />
    </View>
  );
}

const dotStyles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

// Waveform ring component for recording state
function WaveformRing({ color }: { color: string }) {
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const ring3 = useSharedValue(0);

  useEffect(() => {
    const createRing = (anim: any, delay: number) => {
      anim.value = withRepeat(
        withSequence(
          withDelay(delay, withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) })),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      );
    };

    createRing(ring1, 0);
    createRing(ring2, 500);
    createRing(ring3, 1000);
  }, []);

  const r1Style = useAnimatedStyle(() => ({
    opacity: interpolate(ring1.value, [0, 1], [0.5, 0]),
    transform: [{ scale: interpolate(ring1.value, [0, 1], [1, 2]) }],
  }));
  const r2Style = useAnimatedStyle(() => ({
    opacity: interpolate(ring2.value, [0, 1], [0.5, 0]),
    transform: [{ scale: interpolate(ring2.value, [0, 1], [1, 2]) }],
  }));
  const r3Style = useAnimatedStyle(() => ({
    opacity: interpolate(ring3.value, [0, 1], [0.5, 0]),
    transform: [{ scale: interpolate(ring3.value, [0, 1], [1, 2]) }],
  }));

  return (
    <View style={waveStyles.container}>
      <Animated.View style={[waveStyles.ring, { borderColor: color }, r1Style]} />
      <Animated.View style={[waveStyles.ring, { borderColor: color }, r2Style]} />
      <Animated.View style={[waveStyles.ring, { borderColor: color }, r3Style]} />
    </View>
  );
}

const waveStyles = StyleSheet.create({
  container: { position: 'absolute', width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 72, height: 72, borderRadius: 36, borderWidth: 2 },
});

// State label config
const STATE_CONFIG: Record<string, { label: string; icon: string; color?: string }> = {
  recording: { label: 'Listening', icon: 'mic' },
  transcribing: { label: 'Transcribing', icon: 'document-text' },
  thinking: { label: 'Thinking', icon: 'sparkles' },
  speaking: { label: 'Assistant', icon: 'chatbubble-ellipses' },
  confirming: { label: 'Confirm Action', icon: 'help-circle' },
  executing: { label: 'Executing', icon: 'flash' },
  error: { label: 'Error', icon: 'alert-circle', color: 'error' },
};

export default function VoiceAssistantSheet() {
  const { theme, mode } = useTheme();
  const { state, conversation, stopRecording, cancel, confirmAction, processTextInput } = useVoiceAssistant();

  const [inputValue, setInputValue] = useState('');
  const slideAnim = useSharedValue(400);
  const scrollViewRef = useRef<ScrollView>(null);
  const statePulse = useSharedValue(0.5);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollViewRef.current && conversation.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [conversation, state]);

  const isVisible = state !== 'idle' && state !== 'error';

  // Sheet slide animation
  useEffect(() => {
    if (isVisible) {
      slideAnim.value = withSpring(0, {
        damping: 15,
        stiffness: 300,
        mass: 0.5,
      });
    } else {
      slideAnim.value = withTiming(400, {
        duration: 250,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [isVisible]);

  // State pulse animation
  useEffect(() => {
    statePulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.5, { duration: 800 })
      ),
      -1,
      true
    );
  }, [state]);

  const pan = Gesture.Pan()
    .onChange((event) => {
      if (event.translationY > 0) {
        slideAnim.value = event.translationY;
      } else {
        slideAnim.value = event.translationY * 0.2; // rubber banding
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        runOnJS(cancel)();
      } else {
        slideAnim.value = withSpring(0, { damping: 15, stiffness: 300 });
      }
    });

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: statePulse.value,
  }));

  if (!isVisible && state !== 'error') return null;

  const stateConfig = STATE_CONFIG[state] || { label: state, icon: 'ellipse' };
  const stateColor = stateConfig.color === 'error' ? theme.colors.error : theme.colors.primary;
  const gradientColors = theme.colors.gradientPrimary;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.sheet,
            animatedSheetStyle,
          ]}
        >

          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.glassBackground }]} />

          {/* Handle bar */}
          <View style={[styles.handleBar, { backgroundColor: `${theme.colors.textMuted}30` }]} />

          {/* Header */}
          <View style={styles.header}>
            {/* Animated state pill */}
            <View style={[styles.statePill, { backgroundColor: `${stateColor}15` }]}>
              <Animated.View style={[styles.stateDot, { backgroundColor: stateColor }, pulseStyle]} />
              <Ionicons name={stateConfig.icon as any} size={14} color={stateColor} />
              <Text style={[styles.stateLabel, { color: stateColor, fontFamily: 'Inter-SemiBold' }]}>
                {stateConfig.label}
              </Text>
            </View>

          <Pressable
            onPress={cancel}
            style={({ pressed }) => [
              styles.closeBtn,
              { backgroundColor: `${theme.colors.textMuted}12`, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="close" size={18} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        {/* Chat content */}
        <View style={styles.content}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatScroll}
            contentContainerStyle={styles.chatScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {conversation.map((msg, index) => (
              <Animated.View
                key={msg.id}
                style={[
                  styles.messageBubbleContainer,
                  msg.role === 'user' ? styles.userBubbleContainer : styles.assistantBubbleContainer,
                ]}
              >
                {msg.role === 'assistant' && (
                  <View style={[styles.avatarDot, { backgroundColor: theme.colors.primary }]}>
                    <Ionicons name="sparkles" size={10} color="#fff" />
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    msg.role === 'user'
                      ? [styles.userBubble, { backgroundColor: `${theme.colors.primary}18` }]
                      : [styles.assistantBubble, { backgroundColor: `${theme.colors.text}08` }],
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      {
                        color: msg.role === 'user' ? theme.colors.text : theme.colors.text,
                        fontFamily: msg.role === 'user' ? 'Inter-Medium' : 'Inter-Regular',
                      },
                    ]}
                  >
                    {msg.text}
                  </Text>
                  <Text style={[styles.messageTime, { color: theme.colors.textMuted }]}>
                    just now
                  </Text>
                </View>
              </Animated.View>
            ))}

            {/* Thinking/Transcribing/Executing indicator */}
            {['transcribing', 'thinking', 'executing'].includes(state) && (
              <View style={styles.assistantBubbleContainer}>
                <View style={[styles.avatarDot, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="sparkles" size={10} color="#fff" />
                </View>
                <View style={[styles.messageBubble, styles.assistantBubble, { backgroundColor: `${theme.colors.text}08` }]}>
                  <ThinkingDots color={theme.colors.primary} />
                </View>
              </View>
            )}

            {/* Recording state — waveform ring + stop button */}
            {state === 'recording' && (
              <View style={styles.recordingContainer}>
                <Pressable
                  onPress={stopRecording}
                  style={({ pressed }) => [
                    styles.recordBtn,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <WaveformRing color={theme.colors.error} />
                  <LinearGradient
                    colors={[theme.colors.error, '#C53030']}
                    style={styles.recordBtnInner}
                  >
                    <Ionicons name="stop" size={28} color="#fff" />
                  </LinearGradient>
                </Pressable>
                <Text style={[styles.recordHint, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>
                  Tap to stop recording
                </Text>
              </View>
            )}

            {/* Confirming state */}
            {state === 'confirming' && (
              <View style={styles.confirmContainer}>
                <View style={[styles.confirmHintPill, { backgroundColor: `${theme.colors.primary}12` }]}>
                  <Ionicons name="mic" size={14} color={theme.colors.primary} />
                  <Text style={[styles.confirmHintText, { color: theme.colors.primary, fontFamily: 'Inter-Medium' }]}>
                    Listening for "yes" or "no"…
                  </Text>
                </View>
                <View style={styles.confirmRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.confirmBtn,
                      styles.cancelBtn,
                      { borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
                    ]}
                    onPress={cancel}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={theme.colors.textMuted} />
                    <Text style={[styles.confirmBtnText, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.confirmBtn,
                      { opacity: pressed ? 0.85 : 1, overflow: 'hidden' },
                    ]}
                    onPress={confirmAction}
                  >
                    <LinearGradient
                      colors={gradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.confirmGradient}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={[styles.confirmBtnText, { color: '#fff', fontFamily: 'Inter-Bold' }]}>Confirm</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Text input fallback */}
          {['recording', 'speaking', 'confirming', 'thinking', 'error'].includes(state) && (
            <View style={[styles.inputContainer, { borderTopColor: `${theme.colors.border}` }]}>
              <View style={[styles.inputWrapper, { backgroundColor: `${theme.colors.text}06` }]}>
                <TextInput
                  value={inputValue}
                  onChangeText={setInputValue}
                  placeholder="Type a command…"
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.textInput, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}
                  onSubmitEditing={() => {
                    if (inputValue.trim()) {
                      processTextInput(inputValue.trim());
                      setInputValue('');
                    }
                  }}
                />
                <Pressable
                  onPress={() => {
                    if (inputValue.trim()) {
                      processTextInput(inputValue.trim());
                      setInputValue('');
                    }
                  }}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    {
                      backgroundColor: inputValue.trim() ? theme.colors.primary : `${theme.colors.textMuted}20`,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Ionicons name="arrow-up" size={16} color={inputValue.trim() ? '#fff' : theme.colors.textMuted} />
                </Pressable>
              </View>
            </View>
          )}
        </View>
        </Animated.View>
      </GestureDetector>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 36,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 25,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  stateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stateLabel: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    minHeight: 140,
  },
  chatScroll: {
    maxHeight: 320,
    paddingHorizontal: 16,
  },
  chatScrollContent: {
    paddingVertical: 8,
    gap: 8,
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  userBubbleContainer: {
    justifyContent: 'flex-end',
    paddingLeft: 40,
  },
  assistantBubbleContainer: {
    justifyContent: 'flex-start',
    paddingRight: 40,
  },
  avatarDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '85%',
  },
  userBubble: {
    borderTopRightRadius: 4,
    marginLeft: 'auto',
  },
  assistantBubble: {
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    fontFamily: 'Inter-Regular',
  },
  recordingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  recordBtn: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordHint: {
    fontSize: 12,
    letterSpacing: 0.1,
  },
  confirmContainer: {
    alignItems: 'center',
    width: '100%',
    gap: 14,
    paddingVertical: 10,
  },
  confirmHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  confirmHintText: {
    fontSize: 12,
    letterSpacing: 0.1,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cancelBtn: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  confirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  confirmBtnText: {
    fontSize: 15,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 4,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    height: 48,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
