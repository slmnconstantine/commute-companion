import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useVoiceAssistant } from '@/context/VoiceAssistantContext';
import { useRoute } from '@/context/RouteContext';
import { useSegments, usePathname } from 'expo-router';

export default function VoiceAssistantFab() {
  const { theme } = useTheme();
  const { startRecording, state } = useVoiceAssistant();
  const { activeRoute } = useRoute();
  
  const segments = useSegments();
  const pathname = usePathname();

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
  if (!inMainGroup) return null;

  return (
    <Pressable
      style={[
        styles.fab,
        { backgroundColor: theme.colors.primary },
        state !== 'idle' && state !== 'error' && { opacity: 0 } // Hide FAB when sheet is open
      ]}
      onPress={handlePress}
    >
      <Ionicons name="mic" size={24} color="#fff" />
    </Pressable>
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
