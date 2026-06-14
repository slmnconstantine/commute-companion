import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

export default function BecomeDriverBanner({
  theme,
  onPress,
}: {
  theme: ReturnType<typeof useTheme>['theme'];
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.driverBanner, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}
      onPress={onPress}
    >
      <View style={[styles.bannerIconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
        <Ionicons name="car-sport" size={36} color={theme.colors.primary} />
      </View>
      <Text style={[styles.bannerTitle, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
        Want to offer rides?
      </Text>
      <Text style={[styles.bannerDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
        Become a driver to start posting rides and earn by sharing your commute with others.
      </Text>
      <View style={[styles.bannerButton, { backgroundColor: theme.colors.primary }]}>
        <Ionicons name="arrow-forward" size={18} color={theme.colors.white} />
        <Text style={[styles.bannerButtonText, { fontFamily: 'Inter-SemiBold' }]}>Become a Driver</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  driverBanner: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    marginTop: 20,
    gap: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 20,
    textAlign: 'center',
  },
  bannerDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  bannerButtonText: {
    color: '#fff',
    fontSize: 15,
  },
});
