import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

export default function NotFoundScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Ionicons name="compass-outline" size={64} color={theme.colors.textMuted} />
      <Text style={[styles.title, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
        Page Not Found
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
        Looks like you've taken a wrong turn.
      </Text>
      <Pressable
        style={[styles.button, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.replace('/')}
      >
        <Text style={styles.buttonText}>Go Home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  title: { fontSize: 24 },
  subtitle: { fontSize: 16, textAlign: 'center' },
  button: { paddingHorizontal: 32, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-SemiBold' },
});
