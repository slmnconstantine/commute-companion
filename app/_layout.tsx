import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { RouteProvider } from '@/context/RouteContext';
import { VoiceAssistantProvider } from '@/context/VoiceAssistantContext';
import VoiceAssistantFab from '@/components/assistant/VoiceAssistantFab';
import VoiceAssistantSheet from '@/components/assistant/VoiceAssistantSheet';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

import AsyncStorage from '@react-native-async-storage/async-storage';

function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const [hasSkippedVerification, setHasSkippedVerification] = React.useState(false);

  // Check if user previously chose "Skip for now" on this device
  useEffect(() => {
    AsyncStorage.getItem('@skipped_verification').then(val => {
      if (val === 'true') setHasSkippedVerification(true);
    });
  }, []);

  useEffect(() => {
    if (isLoading || !navigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isVerifyEmail = inAuthGroup && segments[1] === 'verify-email';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (session && inAuthGroup) {
      // Soft Gate logic
      if (!session.user.email_confirmed_at && !hasSkippedVerification && !isVerifyEmail) {
        router.replace('/(auth)/verify-email');
      } else if (session.user.email_confirmed_at || hasSkippedVerification) {
        if (isVerifyEmail) {
          // If they verified or skipped while on verify-email screen, push to main
          router.replace('/(main)/(tabs)');
        } else {
          router.replace('/(main)/(tabs)');
        }
      }
    }
  }, [session, isLoading, segments, navigationState?.key, hasSkippedVerification]);

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(main)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Outfit-Regular': Outfit_400Regular,
    'Outfit-Medium': Outfit_500Medium,
    'Outfit-SemiBold': Outfit_600SemiBold,
    'Outfit-Bold': Outfit_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <RouteProvider>
              <VoiceAssistantProvider>
                <RootLayoutNav />
                <VoiceAssistantFab />
                <VoiceAssistantSheet />
              </VoiceAssistantProvider>
            </RouteProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
