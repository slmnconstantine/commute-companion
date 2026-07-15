import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated, Easing, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────────────────────────

type DemoState = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking' | 'confirming' | 'executing' | 'done' | 'error';

interface DemoMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface CommandInfo {
  type: string;
  icon: string;
  label: string;
  description: string;
  example: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const COMMANDS: CommandInfo[] = [
  { type: 'NAVIGATE', icon: 'compass', label: 'Navigate', description: 'Go to any screen in the app', example: '"Go to community hub"' },
  { type: 'SEARCH_RIDES', icon: 'search', label: 'Search Rides', description: 'Find available rides', example: '"Show me rides"' },
  { type: 'SET_ROUTE', icon: 'map', label: 'Set Route', description: 'Set your commute route', example: '"Set route from BGC to Makati"' },
  { type: 'PREPARE_RIDE_POST', icon: 'add-circle', label: 'Post a Ride', description: 'Create a ride offer', example: '"Post a ride"' },
  { type: 'PREPARE_BOOKING', icon: 'ticket', label: 'Book a Ride', description: 'Book an available ride', example: '"Book this ride"' },
  { type: 'ACCEPT_BOOKING', icon: 'checkmark-circle', label: 'Accept Booking', description: 'Accept a ride request', example: '"Accept booking for Juan"' },
  { type: 'DRAFT_MESSAGE', icon: 'chatbubble', label: 'Send Message', description: 'Send a chat message', example: '"Send hello to the group"' },
  { type: 'DRAFT_COMMUNITY_POST', icon: 'megaphone', label: 'Community Post', description: 'Post to community hub', example: '"Post a traffic update"' },
  { type: 'DELETE_POSTS', icon: 'trash', label: 'Delete Posts', description: 'Remove your posts', example: '"Delete my posts"' },
  { type: 'SUMMARIZE_ACTIVITY', icon: 'bar-chart', label: 'Activity Summary', description: 'View your activity', example: '"Show my trips"' },
  { type: 'CLARIFY', icon: 'help-circle', label: 'Clarify', description: 'AI asks for more info', example: '(automatic when ambiguous)' },
];

const DEMO_SCENARIOS = [
  {
    name: 'Find a Ride',
    steps: [
      { state: 'recording' as DemoState, duration: 2000 },
      { state: 'transcribing' as DemoState, duration: 1500, addMessage: { role: 'user' as const, text: 'Find me a ride to Makati' } },
      { state: 'thinking' as DemoState, duration: 2000 },
      { state: 'speaking' as DemoState, duration: 2500, addMessage: { role: 'assistant' as const, text: 'I found 3 available rides to Makati. The earliest departs at 7:30 AM from BGC. Opening the rides screen now.' } },
      { state: 'executing' as DemoState, duration: 1500 },
      { state: 'done' as DemoState, duration: 1000 },
    ],
  },
  {
    name: 'Accept a Booking',
    steps: [
      { state: 'recording' as DemoState, duration: 2000 },
      { state: 'transcribing' as DemoState, duration: 1200, addMessage: { role: 'user' as const, text: 'Accept the booking for Maria' } },
      { state: 'thinking' as DemoState, duration: 1800 },
      { state: 'speaking' as DemoState, duration: 2000, addMessage: { role: 'assistant' as const, text: "I'll accept Maria Santos' booking for your 8:00 AM ride. She booked 1 seat at ₱75. Should I proceed?" } },
      { state: 'confirming' as DemoState, duration: 3000 },
      { state: 'transcribing' as DemoState, duration: 1000, addMessage: { role: 'user' as const, text: 'Yes' } },
      { state: 'speaking' as DemoState, duration: 1500, addMessage: { role: 'assistant' as const, text: 'Done! Booking accepted and a group chat has been created.' } },
      { state: 'executing' as DemoState, duration: 1500 },
      { state: 'done' as DemoState, duration: 1000 },
    ],
  },
  {
    name: 'Send a Message',
    steps: [
      { state: 'recording' as DemoState, duration: 1800 },
      { state: 'transcribing' as DemoState, duration: 1200, addMessage: { role: 'user' as const, text: "Send a message: I'm on my way, be there in 10 minutes" } },
      { state: 'thinking' as DemoState, duration: 1500 },
      { state: 'speaking' as DemoState, duration: 2000, addMessage: { role: 'assistant' as const, text: "I'll send \"I'm on my way, be there in 10 minutes\" to the ride group chat. Sending now." } },
      { state: 'executing' as DemoState, duration: 1200 },
      { state: 'done' as DemoState, duration: 1000 },
    ],
  },
];

// ─── Subcomponents ───────────────────────────────────────────────────────────

function ThinkingDots({ color }: { color: string }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue: -8, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
        Animated.delay(600 - delay),
      ]));
    const a1 = anim(dot1, 0); const a2 = anim(dot2, 150); const a3 = anim(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 }}>
      {[dot1, dot2, dot3].map((d, i) => (
        <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color, transform: [{ translateY: d }] }} />
      ))}
    </View>
  );
}

function WaveformRing({ color }: { color: string }) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const make = (anim: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 1500, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]));
    const r1 = make(ring1, 0); const r2 = make(ring2, 600);
    r1.start(); r2.start();
    return () => { r1.stop(); r2.stop(); };
  }, []);

  return (
    <View style={{ position: 'absolute', width: 72, height: 72, alignItems: 'center', justifyContent: 'center' }}>
      {[ring1, ring2].map((r, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: color,
          opacity: r.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
          transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
        }} />
      ))}
    </View>
  );
}

// ─── State label config ──────────────────────────────────────────────────────

const STATE_CONFIG: Record<string, { label: string; icon: string }> = {
  idle: { label: 'Ready', icon: 'mic' },
  recording: { label: 'Listening', icon: 'mic' },
  transcribing: { label: 'Transcribing', icon: 'document-text' },
  thinking: { label: 'Thinking', icon: 'sparkles' },
  speaking: { label: 'Speaking', icon: 'chatbubble-ellipses' },
  confirming: { label: 'Confirm Action', icon: 'help-circle' },
  executing: { label: 'Executing', icon: 'flash' },
  done: { label: 'Complete', icon: 'checkmark-circle' },
  error: { label: 'Error', icon: 'alert-circle' },
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AssistantDemoScreen() {
  const { theme, mode } = useTheme();
  const router = useRouter();

  const [demoState, setDemoState] = useState<DemoState>('idle');
  const [demoMessages, setDemoMessages] = useState<DemoMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const statePulse = useRef(new Animated.Value(0.5)).current;
  const scrollRef = useRef<ScrollView>(null);
  const demoScrollRef = useRef<ScrollView>(null);

  const gradientColors = theme.colors.gradientPrimary;

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(statePulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(statePulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [demoState]);

  // Auto-scroll demo chat
  useEffect(() => {
    if (demoMessages.length > 0) {
      setTimeout(() => demoScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [demoMessages, demoState]);

  const runScenario = useCallback(async (scenarioIdx: number) => {
    const scenario = DEMO_SCENARIOS[scenarioIdx];
    if (!scenario || isRunning) return;

    setIsRunning(true);
    setDemoMessages([]);
    setActiveScenarioIdx(scenarioIdx);

    for (const step of scenario.steps) {
      setDemoState(step.state);
      if (step.addMessage) {
        setDemoMessages(prev => [
          ...prev,
          { id: `${Date.now()}-${Math.random()}`, role: step.addMessage!.role, text: step.addMessage!.text },
        ]);
      }
      await new Promise(resolve => setTimeout(resolve, step.duration));
    }

    setDemoState('idle');
    setIsRunning(false);
  }, [isRunning]);

  const stateConfig = STATE_CONFIG[demoState] || STATE_CONFIG.idle;
  const stateColor = demoState === 'error' ? theme.colors.error
    : demoState === 'done' ? theme.colors.success
    : theme.colors.primary;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { backgroundColor: `${theme.colors.text}08`, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerTitleArea}>
          <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
            AI Assistant
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            Voice-powered ride management
          </Text>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: `${theme.colors.primary}15` }]}>
          <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Interactive Demo Section ─── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
            Interactive Demo
          </Text>
          <Text style={[styles.sectionDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            Watch how the assistant handles real commands
          </Text>

          {/* Scenario picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scenarioPicker}>
            {DEMO_SCENARIOS.map((scenario, idx) => (
              <Pressable
                key={idx}
                style={({ pressed }) => [
                  styles.scenarioChip,
                  {
                    backgroundColor: activeScenarioIdx === idx && isRunning ? `${theme.colors.primary}18` : `${theme.colors.text}06`,
                    borderColor: activeScenarioIdx === idx && isRunning ? theme.colors.primary : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => runScenario(idx)}
                disabled={isRunning}
              >
                <Text style={[
                  styles.scenarioChipText,
                  {
                    color: activeScenarioIdx === idx && isRunning ? theme.colors.primary : theme.colors.text,
                    fontFamily: activeScenarioIdx === idx && isRunning ? 'Inter-SemiBold' : 'Inter-Medium',
                  },
                ]}>
                  {scenario.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Demo assistant sheet */}
          <View style={[styles.demoSheet, { overflow: 'hidden' }]}>

            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.glassBackground }]} />

            {/* Handle */}
            <View style={[styles.demoHandle, { backgroundColor: `${theme.colors.textMuted}30` }]} />

            {/* State pill */}
            <View style={styles.demoHeader}>
              <View style={[styles.statePill, { backgroundColor: `${stateColor}15` }]}>
                <Animated.View style={[styles.stateDot, { backgroundColor: stateColor, opacity: statePulse }]} />
                <Ionicons name={stateConfig.icon as any} size={14} color={stateColor} />
                <Text style={[styles.stateLabel, { color: stateColor, fontFamily: 'Inter-SemiBold' }]}>
                  {stateConfig.label}
                </Text>
              </View>
            </View>

            {/* Chat area */}
            <ScrollView
              ref={demoScrollRef}
              style={styles.demoChatArea}
              contentContainerStyle={styles.demoChatContent}
              showsVerticalScrollIndicator={false}
            >
              {demoMessages.length === 0 && demoState === 'idle' && (
                <View style={styles.emptyState}>
                  <Ionicons name="mic-outline" size={40} color={`${theme.colors.textMuted}50`} />
                  <Text style={[styles.emptyText, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>
                    Tap a scenario above to start
                  </Text>
                </View>
              )}

              {demoMessages.map(msg => (
                <View
                  key={msg.id}
                  style={[
                    styles.msgRow,
                    msg.role === 'user' ? styles.userMsgRow : styles.assistantMsgRow,
                  ]}
                >
                  {msg.role === 'assistant' && (
                    <View style={[styles.avatarDot, { backgroundColor: theme.colors.primary }]}>
                      <Ionicons name="sparkles" size={9} color="#fff" />
                    </View>
                  )}
                  <View
                    style={[
                      styles.msgBubble,
                      msg.role === 'user'
                        ? [styles.userBubble, { backgroundColor: `${theme.colors.primary}18` }]
                        : [styles.assistantBubble, { backgroundColor: `${theme.colors.text}08` }],
                    ]}
                  >
                    <Text style={[
                      styles.msgText,
                      {
                        color: theme.colors.text,
                        fontFamily: msg.role === 'user' ? 'Inter-Medium' : 'Inter-Regular',
                      },
                    ]}>
                      {msg.text}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Active state indicators */}
              {['transcribing', 'thinking', 'executing'].includes(demoState) && (
                <View style={styles.assistantMsgRow}>
                  <View style={[styles.avatarDot, { backgroundColor: theme.colors.primary }]}>
                    <Ionicons name="sparkles" size={9} color="#fff" />
                  </View>
                  <View style={[styles.msgBubble, styles.assistantBubble, { backgroundColor: `${theme.colors.text}08` }]}>
                    <ThinkingDots color={theme.colors.primary} />
                  </View>
                </View>
              )}

              {demoState === 'recording' && (
                <View style={styles.recordingDemo}>
                  <View style={{ width: 72, height: 72, alignItems: 'center', justifyContent: 'center' }}>
                    <WaveformRing color={theme.colors.error} />
                    <LinearGradient colors={[theme.colors.error, '#C53030']} style={styles.recordBtnDemo}>
                      <Ionicons name="stop" size={24} color="#fff" />
                    </LinearGradient>
                  </View>
                  <Text style={[styles.recordHint, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>
                    Listening…
                  </Text>
                </View>
              )}

              {demoState === 'confirming' && (
                <View style={styles.confirmDemo}>
                  <View style={[styles.confirmHintPill, { backgroundColor: `${theme.colors.primary}12` }]}>
                    <Ionicons name="mic" size={12} color={theme.colors.primary} />
                    <Text style={[styles.confirmHintText, { color: theme.colors.primary, fontFamily: 'Inter-Medium' }]}>
                      Listening for "yes" or "no"…
                    </Text>
                  </View>
                  <View style={styles.confirmBtnRow}>
                    <View style={[styles.confirmBtn, styles.cancelBtnDemo, { borderColor: theme.colors.border }]}>
                      <Ionicons name="close-circle-outline" size={16} color={theme.colors.textMuted} />
                      <Text style={[styles.confirmBtnLabel, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Cancel</Text>
                    </View>
                    <View style={[styles.confirmBtn, { overflow: 'hidden' }]}>
                      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.confirmGradient}>
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                        <Text style={[styles.confirmBtnLabel, { color: '#fff', fontFamily: 'Inter-Bold' }]}>Confirm</Text>
                      </LinearGradient>
                    </View>
                  </View>
                </View>
              )}

              {demoState === 'done' && (
                <View style={styles.doneIndicator}>
                  <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
                  <Text style={[styles.doneText, { color: theme.colors.success, fontFamily: 'Inter-SemiBold' }]}>
                    Command executed successfully
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>

        {/* ─── State Reference ─── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
            Assistant States
          </Text>
          <Text style={[styles.sectionDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            The lifecycle of every voice command
          </Text>

          <View style={styles.stateTimeline}>
            {[
              { state: 'recording', desc: 'Microphone active, capturing speech', icon: 'mic', color: theme.colors.error },
              { state: 'transcribing', desc: 'Converting speech to text', icon: 'document-text', color: theme.colors.info },
              { state: 'thinking', desc: 'AI parsing intent & building response', icon: 'sparkles', color: theme.colors.accent },
              { state: 'speaking', desc: 'Reading the response aloud via TTS', icon: 'chatbubble-ellipses', color: theme.colors.primary },
              { state: 'confirming', desc: 'Waiting for user approval (yes/no)', icon: 'help-circle', color: theme.colors.warning },
              { state: 'executing', desc: 'Performing the action (booking, navigating…)', icon: 'flash', color: theme.colors.primary },
            ].map((item, idx, arr) => (
              <View key={item.state} style={styles.timelineItem}>
                <View style={styles.timelineDotCol}>
                  <View style={[styles.timelineDot, { backgroundColor: `${item.color}20` }]}>
                    <Ionicons name={item.icon as any} size={16} color={item.color} />
                  </View>
                  {idx < arr.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: `${theme.colors.border}` }]} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, { color: item.color, fontFamily: 'Inter-SemiBold' }]}>
                    {item.state.charAt(0).toUpperCase() + item.state.slice(1)}
                  </Text>
                  <Text style={[styles.timelineDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                    {item.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ─── Capabilities Grid ─── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
            Capabilities
          </Text>
          <Text style={[styles.sectionDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            Everything the assistant can do for you
          </Text>

          <View style={styles.capabilitiesGrid}>
            {COMMANDS.map((cmd, idx) => (
              <View
                key={cmd.type}
                style={[styles.capabilityCard, { backgroundColor: `${theme.colors.text}04` }]}
              >
                <View style={[styles.capabilityIcon, { backgroundColor: `${theme.colors.primary}12` }]}>
                  <Ionicons name={cmd.icon as any} size={20} color={theme.colors.primary} />
                </View>
                <Text style={[styles.capabilityLabel, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
                  {cmd.label}
                </Text>
                <Text style={[styles.capabilityDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                  {cmd.description}
                </Text>
                <View style={[styles.examplePill, { backgroundColor: `${theme.colors.primary}08` }]}>
                  <Text style={[styles.exampleText, { color: theme.colors.primary, fontFamily: 'Inter-Medium' }]}>
                    {cmd.example}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ─── How It Works ─── */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
            How It Works
          </Text>

          <View style={[styles.howItWorksCard, { backgroundColor: `${theme.colors.text}04` }]}>
            {[
              { step: '1', title: 'Tap the Mic', desc: 'Press the floating mic button anywhere in the app', icon: 'finger-print' },
              { step: '2', title: 'Speak Naturally', desc: 'Say your command in plain English — no special syntax', icon: 'chatbox-ellipses' },
              { step: '3', title: 'AI Processes', desc: 'Intent parsed locally or via Groq Llama AI', icon: 'sparkles' },
              { step: '4', title: 'Confirm & Execute', desc: 'Review the action, then confirm to proceed', icon: 'checkmark-done' },
            ].map((item, idx) => (
              <View key={idx} style={styles.howStep}>
                <View style={[styles.stepNumber, { backgroundColor: `${theme.colors.primary}15` }]}>
                  <Text style={[styles.stepNumberText, { color: theme.colors.primary, fontFamily: 'Inter-Bold' }]}>
                    {item.step}
                  </Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.stepDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                    {item.desc}
                  </Text>
                </View>
                <Ionicons name={item.icon as any} size={20} color={theme.colors.primary} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleArea: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  // Sections
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 14,
  },

  // Scenario Picker
  scenarioPicker: {
    marginBottom: 14,
  },
  scenarioChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  scenarioChipText: {
    fontSize: 13,
  },

  // Demo Sheet
  demoSheet: {
    borderRadius: 22,
    minHeight: 280,
  },
  demoHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
  },
  demoHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  stateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stateLabel: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  demoChatArea: {
    maxHeight: 260,
    paddingHorizontal: 14,
  },
  demoChatContent: {
    paddingVertical: 6,
    gap: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
  },

  // Messages
  msgRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 2,
  },
  userMsgRow: {
    justifyContent: 'flex-end',
    paddingLeft: 32,
  },
  assistantMsgRow: {
    justifyContent: 'flex-start',
    paddingRight: 32,
  },
  avatarDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  msgBubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    maxWidth: '85%',
  },
  userBubble: {
    borderTopRightRadius: 4,
    marginLeft: 'auto',
  },
  assistantBubble: {
    borderTopLeftRadius: 4,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 19,
  },

  // Recording
  recordingDemo: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  recordBtnDemo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordHint: {
    fontSize: 11,
  },

  // Confirming
  confirmDemo: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  confirmHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  confirmHintText: {
    fontSize: 11,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelBtnDemo: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
  },
  confirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
  },
  confirmBtnLabel: {
    fontSize: 13,
  },

  // Done
  doneIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  doneText: {
    fontSize: 13,
  },

  // State timeline
  stateTimeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 14,
  },
  timelineDotCol: {
    alignItems: 'center',
    width: 36,
  },
  timelineDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 16,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 18,
  },
  timelineLabel: {
    fontSize: 14,
    letterSpacing: 0.1,
  },
  timelineDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },

  // Capabilities
  capabilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  capabilityCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  capabilityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capabilityLabel: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
  capabilityDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  examplePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  exampleText: {
    fontSize: 10,
    fontStyle: 'italic',
  },

  // How it works
  howItWorksCard: {
    borderRadius: 18,
    padding: 16,
    gap: 16,
  },
  howStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
  },
  stepDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 1,
  },
});
