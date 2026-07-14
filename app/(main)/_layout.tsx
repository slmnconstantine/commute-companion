import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { NotificationProvider } from '@/context/NotificationContext';

export default function MainLayout() {
  const { session, isLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/(auth)/welcome');
    }
  }, [session, isLoading, router]);

  if (isLoading || !session) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NotificationProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="ride" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="hub" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="verification" />
        <Stack.Screen name="settings" options={{ animation: 'fade' }} />
        <Stack.Screen name="assistant-demo" />
      </Stack>
    </NotificationProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
