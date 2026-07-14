import React from 'react';
import { Pressable, StyleSheet, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';

interface SOSButtonProps {
  theme: any;
  tripId: string;
  driverName: string;
  currentLocation?: { latitude: number; longitude: number } | null;
  originLabel: string;
  destinationLabel: string;
}

export default function SOSButton({
  theme,
  tripId,
  driverName,
  currentLocation,
  originLabel,
  destinationLabel,
}: SOSButtonProps) {
  const handleSOS = () => {
    Alert.alert(
      '🆘 Emergency SOS',
      'What would you like to do?',
      [
        {
          text: 'Call Emergency (911)',
          onPress: () => {
            Linking.openURL('tel:911').catch(() =>
              Alert.alert('Error', 'Unable to make a call from this device.')
            );
          },
        },
        {
          text: 'Share Trip Details',
          onPress: async () => {
            const locationStr = currentLocation
              ? `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`
              : 'Location unavailable';
            
            const message = [
              `🆘 SOS — I need help!`,
              ``,
              `I'm on a ride with Commute Companion.`,
              `Driver: ${driverName}`,
              `Route: ${originLabel.split(',')[0]} → ${destinationLabel.split(',')[0]}`,
              `Trip ID: ${tripId}`,
              ``,
              `📍 My current location:`,
              locationStr,
            ].join('\n');

            try {
              const { Share } = require('react-native');
              await Share.share({ message });
            } catch (e) {
              // User cancelled
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <Pressable
      style={[styles.sosButton, { backgroundColor: theme.colors.error }]}
      onPress={handleSOS}
    >
      <Ionicons name="alert-circle" size={24} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sosButton: {
    position: 'absolute',
    right: 16,
    bottom: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
