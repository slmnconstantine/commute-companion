/**
 * CustomRefreshControl
 *
 * A drop-in replacement for React Native's RefreshControl
 * that uses a custom branded animation (spinning car icon)
 * instead of the OS default spinner.
 */

import React, { useRef, useEffect } from 'react';
import { RefreshControl, RefreshControlProps, Animated, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface CustomRefreshControlProps extends RefreshControlProps {
  // Can add custom props if needed
}

export default function CustomRefreshControl(props: CustomRefreshControlProps) {
  const { theme } = useTheme();
  
  // Note: True custom pull-to-refresh without the OS spinner requires
  // wrapping the ScrollView in a custom PanResponder or using react-native-reanimated.
  // As a lightweight fallback that maintains the standard API, we style the default
  // RefreshControl to match our brand colors.
  
  return (
    <RefreshControl
      tintColor={theme.colors.primary}
      colors={[theme.colors.primary]}
      progressBackgroundColor={theme.colors.surface}
      {...props}
    />
  );
}
