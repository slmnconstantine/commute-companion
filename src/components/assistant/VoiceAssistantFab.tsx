import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withRepeat,
  withTiming, withSequence, runOnJS, Easing, interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { useVoiceAssistant } from '@/context/VoiceAssistantContext';
import { useRoute } from '@/context/RouteContext';
import { useSegments, usePathname } from 'expo-router';

export default function VoiceAssistantFab() {
  const { theme } = useTheme();
  const { startRecording, state } = useVoiceAssistant();
  const { activeRoute } = useRoute();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const segments = useSegments();
  const pathname = usePathname();

  // Shared values for dragging
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // Animation shared values
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);

  // Determine context
  let currentScreen = segments[segments.length - 1] || 'Home';
  let selectedTripId = null;
  let selectedChatRoomId = null;

  if (pathname.startsWith('/ride/')) {
    const parts = pathname.split('/');
    const idParam = parts[2];
    if (idParam && !['create', 'set-route', 'book', 'review'].includes(idParam)) {
      selectedTripId = idParam;
      currentScreen = 'RideDetails';
    }
  } else if (pathname.startsWith('/chat/')) {
    const parts = pathname.split('/');
    const idParam = parts[2];
    if (idParam) {
      selectedChatRoomId = idParam;
      currentScreen = 'ChatDetails';
    }
  }

  const handlePress = () => {
    if (state !== 'idle' && state !== 'error') return; // Assistant is active

    startRecording({
      activeRoute,
      currentScreen,
      selectedTripId,
      selectedChatRoomId,
    });
  };

  // Only show on main screens
  const inMainGroup = segments[0] === '(main)';

  // Idle breathing pulse
  useEffect(() => {
    if (state === 'idle') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1500 }),
          withTiming(0.2, { duration: 1500 }),
        ),
        -1,
        true,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
      glowOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [state]);

  // Active processing ring animation
  useEffect(() => {
    const isActive = state !== 'idle' && state !== 'error';
    if (isActive) {
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.8, { duration: 1200, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 0 }),
        ),
        -1,
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 0 }),
          withTiming(0, { duration: 1200 }),
        ),
        -1,
      );
    } else {
      ringScale.value = withTiming(1, { duration: 200 });
      ringOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [state]);

  // Draggable FAB gesture
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  const betterPanGesture = Gesture.Pan()
    .onStart(() => {
      isDragging.value = true;
    })
    .onUpdate((event) => {
      translateX.value = offsetX.value + event.translationX;
      translateY.value = offsetY.value + event.translationY;
    })
    .onEnd(() => {
      isDragging.value = false;
      offsetX.value = translateX.value;
      offsetY.value = translateY.value;
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(handlePress)();
  });

  const composedGesture = Gesture.Simultaneous(betterPanGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: isDragging.value ? 1.1 : pulseScale.value },
      ],
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: ringScale.value },
    ],
  }));

  if (!inMainGroup) return null;

  const isActive = state !== 'idle' && state !== 'error';
  const gradientColors = theme.colors.gradientPrimary;

  return (
    <>
      {/* Glow shadow layer */}
      <Animated.View style={[styles.glowLayer, { backgroundColor: theme.colors.primary }, glowStyle]} />

      {/* Active processing ring */}
      <Animated.View style={[styles.activeRing, { borderColor: theme.colors.primary }, ringStyle]} />

      {/* Main FAB */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[
            styles.fab,
            isActive && { opacity: 0 },
            animatedStyle,
          ]}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Ionicons name="mic" size={24} color="#fff" />
          </LinearGradient>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowLayer: {
    position: 'absolute',
    bottom: 86,
    right: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    zIndex: 9998,
  },
  activeRing: {
    position: 'absolute',
    bottom: 83,
    right: 13,
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    zIndex: 9997,
  },
});
