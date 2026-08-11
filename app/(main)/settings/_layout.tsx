import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="become-driver" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="about" />
      <Stack.Screen name="terms-privacy" />
      <Stack.Screen name="report-bug" />
    </Stack>
  );
}
