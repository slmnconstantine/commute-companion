/**
 * SeatSelector
 *
 * An interactive seat count picker.  Displays a row of seat icons
 * that can be tapped to select the number of seats (1 → maxSeats).
 * Selected seats are highlighted in the primary colour; unselected
 * seats appear muted.  A label below shows "X of Y seats".
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface SeatSelectorProps {
  /** Maximum number of available seats */
  maxSeats: number;
  /** Currently selected number of seats */
  selectedSeats: number;
  /** Called when the user taps a seat to change the count */
  onSeatChange: (seats: number) => void;
}

export default function SeatSelector({
  maxSeats,
  selectedSeats,
  onSeatChange,
}: SeatSelectorProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text
        style={[
          styles.title,
          { color: theme.colors.text, fontFamily: 'Inter-SemiBold' },
        ]}
      >
        Select Seats
      </Text>

      {/* Seat icons row */}
      <View style={styles.seatsRow}>
        {Array.from({ length: maxSeats }, (_, i) => {
          const seatNumber = i + 1;
          const isSelected = seatNumber <= selectedSeats;

          return (
            <Pressable
              key={seatNumber}
              onPress={() => onSeatChange(seatNumber)}
              hitSlop={4}
              style={({ pressed }) => [
                styles.seatButton,
                {
                  backgroundColor: isSelected
                    ? hexToRgba(theme.colors.primary, 0.12)
                    : hexToRgba(theme.colors.border, 0.4),
                  borderColor: isSelected
                    ? theme.colors.primary
                    : theme.colors.border,
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                },
              ]}
            >
              <Ionicons
                name={isSelected ? 'person' : 'person-outline'}
                size={22}
                color={isSelected ? theme.colors.primary : theme.colors.textMuted}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Label */}
      <Text
        style={[
          styles.label,
          { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' },
        ]}
      >
        <Text style={{ color: theme.colors.primary, fontFamily: 'Inter-Bold' }}>
          {selectedSeats}
        </Text>
        {' '}of{' '}
        <Text style={{ fontFamily: 'Inter-Medium' }}>{maxSeats}</Text>
        {' '}seat{maxSeats !== 1 ? 's' : ''}
      </Text>
    </View>
  );
}

/** Convert a hex colour to rgba with given alpha */
function hexToRgba(hex: string, alpha: number): string {
  const sanitised = hex.replace('#', '');
  const r = parseInt(sanitised.substring(0, 2), 16);
  const g = parseInt(sanitised.substring(2, 4), 16);
  const b = parseInt(sanitised.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {
    fontSize: 15,
  },
  seatsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  seatButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    textAlign: 'center',
  },
});
