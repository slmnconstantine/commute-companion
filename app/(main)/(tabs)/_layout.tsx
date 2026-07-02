import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';

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
          fontFamily: 'Inter-Medium',
          fontSize: 11,
          marginTop: -2,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? insets.bottom : 12,
          left: 16,
          right: 16,
          height: 64,
          borderRadius: 20,
          borderTopWidth: 0,
          backgroundColor: mode === 'dark' ? 'rgba(21, 28, 44, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 12,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: 'Rides',
          tabBarBadge: profile?.role === 'driver' && driverPendingCount > 0 ? driverPendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.error, color: '#fff', fontSize: 10 },
          tabBarIcon: ({ color }) => (
            <Ionicons name="car-sport" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Hub',
          tabBarIcon: ({ color }) => (
            <Ionicons name="people" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarBadge: commuterUpcomingCount > 0 ? commuterUpcomingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.primary, color: '#fff', fontSize: 10 },
          tabBarIcon: ({ color }) => (
            <Ionicons name="time" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
