/**
 * FareBreakdown
 *
 * Displays a detailed, itemised fare breakdown inside a subtle card.
 * Each cost component is shown as a label–amount row, with a thin
 * divider separating the line items from the bold total row.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { FareBreakdown as FareBreakdownType } from '@/utils/fareCalculator';
import { formatCurrency } from '@/utils/fareCalculator';

interface FareBreakdownProps {
  /** The fare breakdown object returned by calculateFare() */
  fareBreakdown: FareBreakdownType;
  /** Number of passengers sharing the ride */
  passengers?: number;
}

/** A single label–amount row */
function FareRow({
  label,
  amount,
  isBold = false,
  color,
  mutedColor,
}: {
  label: string;
  amount: string;
  isBold?: boolean;
  color: string;
  mutedColor: string;
}) {
  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.rowLabel,
          {
            color: isBold ? color : mutedColor,
            fontFamily: isBold ? 'Inter-SemiBold' : 'Inter-Regular',
          },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.rowAmount,
          {
            color: isBold ? color : mutedColor,
            fontFamily: isBold ? 'Inter-Bold' : 'Inter-Medium',
          },
        ]}
      >
        {amount}
      </Text>
    </View>
  );
}

export default function FareBreakdown({ fareBreakdown, passengers = 1 }: FareBreakdownProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="receipt-outline" size={18} color={theme.colors.primary} />
        <Text
          style={[
            styles.headerTitle,
            { color: theme.colors.text, fontFamily: 'Inter-SemiBold' },
          ]}
        >
          Fare Breakdown
        </Text>
      </View>

      {/* Line items */}
      <View style={styles.lineItems}>
        <FareRow
          label="Base fare"
          amount={formatCurrency(fareBreakdown.baseFare)}
          color={theme.colors.text}
          mutedColor={theme.colors.textMuted}
        />
        <FareRow
          label="Distance cost"
          amount={formatCurrency(fareBreakdown.distanceCost)}
          color={theme.colors.text}
          mutedColor={theme.colors.textMuted}
        />
        <FareRow
          label="Time cost"
          amount={formatCurrency(fareBreakdown.timeCost)}
          color={theme.colors.text}
          mutedColor={theme.colors.textMuted}
        />

        {/* Subtotal divider */}
        <View style={[styles.thinDivider, { backgroundColor: theme.colors.border }]} />

        <FareRow
          label="Subtotal"
          amount={formatCurrency(fareBreakdown.subtotal)}
          color={theme.colors.text}
          mutedColor={theme.colors.textMuted}
        />

        {passengers > 1 && (
          <FareRow
            label={`Per seat (÷ ${passengers})`}
            amount={formatCurrency(fareBreakdown.costPerSeat)}
            color={theme.colors.text}
            mutedColor={theme.colors.textMuted}
          />
        )}

        <View style={styles.row}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text
              style={[
                styles.rowLabel,
                {
                  color: theme.colors.textMuted,
                  fontFamily: 'Inter-Regular',
                },
              ]}
            >
              Platform fee
            </Text>
            <Ionicons name="information-circle-outline" size={14} color={`${theme.colors.textMuted}80`} />
          </View>
          <Text
            style={[
              styles.rowAmount,
              {
                color: theme.colors.textMuted,
                fontFamily: 'Inter-Medium',
              },
            ]}
          >
            {formatCurrency(fareBreakdown.platformFee)}
          </Text>
        </View>
      </View>

      {/* Total divider + total row */}
      <View style={[styles.totalDivider, { backgroundColor: theme.colors.border }]} />

      <View style={[styles.totalRow, { backgroundColor: `${theme.colors.primary}08`, borderRadius: 10, padding: 12, marginHorizontal: -4 }]}>
        <Text
          style={[
            styles.totalLabel,
            { color: theme.colors.text, fontFamily: 'Inter-Bold' },
          ]}
        >
          Total per seat
        </Text>
        <Text
          style={[
            styles.totalAmount,
            { color: theme.colors.primary, fontFamily: 'Inter-Bold' },
          ]}
        >
          {formatCurrency(fareBreakdown.totalPerSeat)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 15,
  },
  lineItems: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 14,
  },
  rowAmount: {
    fontSize: 14,
  },
  thinDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  totalDivider: {
    height: 1,
    marginTop: 14,
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
  },
  totalAmount: {
    fontSize: 20,
  },
});
