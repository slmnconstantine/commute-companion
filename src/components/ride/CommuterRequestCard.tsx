/**
 * CommuterRequestCard
 *
 * Shows a commuter's ride request on the driver's "Post a Ride" board.
 * Displays commuter info, route, seats, time, and an "Offer Ride" button.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '@/components/common/Avatar';

interface CommuterRequestCardProps {
  theme: any;
  commuterName: string;
  commuterAvatarUrl?: string | null;
  commuterVerified?: boolean;
  originLabel: string;
  destinationLabel: string;
  seatsNeeded: number;
  displayTime: string;
  onOfferRide: () => void;
}

export default function CommuterRequestCard({
  theme,
  commuterName,
  commuterAvatarUrl,
  commuterVerified,
  originLabel,
  destinationLabel,
  seatsNeeded,
  displayTime,
  onOfferRide,
}: CommuterRequestCardProps) {
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <View style={styles.row}>
        <Avatar
          uri={commuterAvatarUrl}
          name={commuterName}
          size="md"
          showBadge={commuterVerified}
        />
        <View style={styles.info}>
          <Text
            style={[styles.name, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}
          >
            {commuterName}
          </Text>
          <Text
            style={[styles.route, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}
            numberOfLines={1}
          >
            From: {originLabel.split(',')[0]}
          </Text>
          <Text
            style={[styles.route, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}
            numberOfLines={1}
          >
            To: {destinationLabel.split(',')[0]}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={14} color={theme.colors.textMuted} />
              <Text style={[styles.metaText, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>
                {seatsNeeded} seats
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
              <Text style={[styles.metaText, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>
                {displayTime}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.offerBtn,
          {
            backgroundColor: theme.colors.primary,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
        onPress={onOfferRide}
      >
        <Text style={styles.offerBtnText}>Offer Ride</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
  },
  route: {
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  offerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  offerBtnText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
});
