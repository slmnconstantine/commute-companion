/**
 * ActiveRouteCard
 *
 * Shows the user's current commute route in the Search Rides tab.
 * Tappable to navigate to the set-route screen for editing.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ActiveRouteCardProps {
  theme: any;
  originLabel: string;
  destinationLabel: string;
  onPress: () => void;
}

export default function ActiveRouteCard({
  theme,
  originLabel,
  destinationLabel,
  onPress,
}: ActiveRouteCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.dots}>
        <View style={[styles.dotGreen, { backgroundColor: theme.colors.success }]} />
        <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
        <View style={[styles.dotRed, { backgroundColor: theme.colors.error }]} />
      </View>
      <View style={styles.info}>
        <Text
          style={[
            styles.label,
            { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' },
          ]}
        >
          Your Commute
        </Text>
        <Text
          style={[styles.routeText, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]}
          numberOfLines={1}
        >
          {originLabel.split(',')[0]}
        </Text>
        <Text
          style={[styles.routeText, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]}
          numberOfLines={1}
        >
          {destinationLabel.split(',')[0]}
        </Text>
      </View>
      <Ionicons name="pencil" size={18} color={theme.colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  dots: {
    alignItems: 'center',
    width: 10,
  },
  dotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 3,
  },
  dotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  info: {
    flex: 1,
    gap: 1,
  },
  label: {
    fontSize: 11,
    marginBottom: 2,
  },
  routeText: {
    fontSize: 13,
  },
});
