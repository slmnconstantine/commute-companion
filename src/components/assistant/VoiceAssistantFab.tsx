import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
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

  // Determine context
  const currentScreen = segments[segments.length - 1] || 'Home';
  let selectedTripId = null;
  let selectedChatRoomId = null;

  if (pathname.startsWith('/(main)/ride/') && segments.length > 2) {
    selectedTripId = segments[segments.length - 1];
  }
  if (pathname.startsWith('/(main)/chat/') && segments.length > 2) {
    selectedChatRoomId = segments[segments.length - 1];
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

  const panGesture = Gesture.Pan()
    .onStart(() => {
      isDragging.value = true;
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd(() => {
      isDragging.value = false;
      
      // Snap to edges or stay in bounds
      // For simplicity, just spring back to (0,0) or keep the position and reset translation
      // Actually, standard draggable FABs usually snap to the left or right edge.
      // But a simple free-drag can just offset the base position.
      // We will just let it stay where dragged, but we need to update the base offset
      // so the next drag starts from the new position.
    });

  // Since updating base offset without layout info is tricky, 
  // the easiest robust draggable is to just use context in onUpdate:
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
      // Save the offset for the next drag
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
        { scale: isDragging.value ? 1.1 : 1 },
      ],
    };
  });

  if (!inMainGroup) return null;

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.fab,
          { backgroundColor: theme.colors.primary },
          state !== 'idle' && state !== 'error' && { opacity: 0 },
          animatedStyle,
        ]}
      >
        <Ionicons name="mic" size={24} color="#fff" />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90, // Above bottom tabs
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 9999,
  },
});
