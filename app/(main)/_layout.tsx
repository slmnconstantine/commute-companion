import { Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { NotificationProvider } from '@/context/NotificationContext';

export default function MainLayout() {
  const { session, isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <NotificationProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="ride" />
        <Stack.Screen name="hub" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="verification" />
        <Stack.Screen name="settings" />
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
