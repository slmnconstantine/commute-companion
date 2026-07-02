/**
 * ActiveRequestCard
 *
 * Displays the user's active "Looking for a Ride" request in the Search Rides tab.
 * Shows route, seats needed, departure time, and a cancel button.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ActiveRequestCardProps {
  theme: any;
  originLabel: string;
  destinationLabel: string;
  seats: number;
  departureTime: string;
  onCancel: () => void;
}

export default function ActiveRequestCard({
  theme,
  originLabel,
  destinationLabel,
  seats,
  departureTime,
  onCancel,
}: ActiveRequestCardProps) {
  const displayTime = departureTime
    ? new Date(departureTime).toLocaleDateString('en-PH', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: `${theme.colors.success}10`,
          borderColor: theme.colors.success,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
          <Text style={[styles.headerText, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
            Active Ride Request
          </Text>
        </View>
        <Pressable onPress={onCancel} hitSlop={12}>
          <Text style={[styles.cancelText, { color: theme.colors.error, fontFamily: 'Inter-SemiBold' }]}>
            Cancel Request
          </Text>
        </Pressable>
      </View>
      <View style={styles.detailsWrap}>
        <Text style={[styles.detailLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
          Route:{' '}
          <Text style={[styles.detailValue, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>
            {originLabel.split(',')[0]} → {destinationLabel.split(',')[0]}
          </Text>
        </Text>
        <Text style={[styles.detailLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
          Seats Needed:{' '}
          <Text style={[styles.detailValue, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>
            {seats}
          </Text>
        </Text>
        <Text style={[styles.detailLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
          Departure:{' '}
          <Text style={[styles.detailValue, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>
            {displayTime}
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    fontSize: 14,
  },
  cancelText: {
    fontSize: 13,
  },
  detailsWrap: {
    marginTop: 8,
    gap: 4,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
  },
});
