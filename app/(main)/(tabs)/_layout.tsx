import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import { BlurView } from 'expo-blur';

export default function TabLayout() {
  const { theme, mode } = useTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { driverPendingCount, commuterUpcomingCount } = useNotifications();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: 'Inter-SemiBold',
          fontSize: 10,
          marginTop: -2,
          letterSpacing: 0.2,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? insets.bottom : 12,
          left: 16,
          right: 16,
          height: 66,
          borderRadius: 22,
          borderTopWidth: 0,
          backgroundColor: mode === 'dark'
            ? 'rgba(17, 24, 39, 0.88)'
            : 'rgba(255, 255, 255, 0.82)',
          borderColor: mode === 'dark'
            ? 'rgba(255, 255, 255, 0.06)'
            : 'rgba(0, 0, 0, 0.04)',
          borderWidth: 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: mode === 'dark' ? 0.4 : 0.12,
          shadowRadius: 24,
          elevation: 16,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={60}
              tint={mode === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, {
              backgroundColor: mode === 'dark'
                ? 'rgba(17, 24, 39, 0.95)'
                : 'rgba(255, 255, 255, 0.95)',
              borderRadius: 22,
            }]} />
          )
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: 'Rides',
          tabBarBadge: profile?.role === 'driver' && driverPendingCount > 0 ? driverPendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.error, color: '#fff', fontSize: 10, fontFamily: 'Inter-Bold' },
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons name={focused ? 'car-sport' : 'car-sport-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Hub',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarBadge: commuterUpcomingCount > 0 ? commuterUpcomingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.primary, color: '#fff', fontSize: 10, fontFamily: 'Inter-Bold' },
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons name={focused ? 'time' : 'time-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconWrap: {
    transform: [{ scale: 1.1 }],
  },
});
