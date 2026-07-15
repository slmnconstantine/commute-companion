import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';

import * as Haptics from 'expo-haptics';
import React, { useRef, useEffect } from 'react';

function AnimatedTabIcon({ name, focused, color }: { name: string; focused: boolean; color: any }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.2,
          useNativeDriver: true,
          speed: 60,
          bounciness: 15,
        }),
        Animated.spring(scale, {
          toValue: 1.05,
          useNativeDriver: true,
          speed: 40,
          bounciness: 8,
        }),
      ]).start();
    } else {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 8,
      }).start();
    }
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name={name as any} size={22} color={color} />
    </Animated.View>
  );
}

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
          <View style={[StyleSheet.absoluteFill, {
            backgroundColor: mode === 'dark'
              ? '#1A2235'
              : '#FFFFFF',
            borderRadius: 22,
          }]} />
        ),
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon name={focused ? 'home' : 'home-outline'} focused={focused} color={color} />
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
            <AnimatedTabIcon name={focused ? 'car-sport' : 'car-sport-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Hub',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon name={focused ? 'people' : 'people-outline'} focused={focused} color={color} />
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
            <AnimatedTabIcon name={focused ? 'time' : 'time-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon name={focused ? 'person' : 'person-outline'} focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
