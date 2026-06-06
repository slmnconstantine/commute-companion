import { Stack } from 'expo-router';

export default function RideLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="create" />
      <Stack.Screen name="set-route" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="book/[id]" />
      <Stack.Screen name="review/[id]" />
    </Stack>
  );
}
