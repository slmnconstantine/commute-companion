import React, { useState } from 'react';
import { Pressable, StyleSheet, Alert, Linking, Share, Text, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

export interface SOSButtonProps {
  theme: any;
  tripId: string;
  driverName?: string;
  currentLocation?: { latitude: number; longitude: number } | null;
  originLabel?: string;
  destinationLabel?: string;
  variant?: 'floating' | 'card' | 'compact';
  style?: any;
}

export default function SOSButton({
  theme,
  tripId,
  driverName = 'Driver',
  currentLocation,
  originLabel = 'Origin',
  destinationLabel = 'Destination',
  variant = 'floating',
  style,
}: SOSButtonProps) {
  const [locating, setLocating] = useState(false);

  // Fetch live high-accuracy GPS location if not passed
  const getLiveLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    if (currentLocation?.latitude && currentLocation?.longitude) {
      return currentLocation;
    }

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        return {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
      }
    } catch (err) {
      console.warn('Live location retrieval note:', err);
    }
    return null;
  };

  const handleShareLocation = async () => {
    setLocating(true);
    let coords: { latitude: number; longitude: number } | null = null;
    try {
      coords = await getLiveLocation();
    } finally {
      setLocating(false);
    }

    const locationLink = coords
      ? `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`
      : 'Location coordinates unavailable (GPS permission required)';

    const coordinatesText = coords
      ? `Latitude: ${coords.latitude.toFixed(6)}, Longitude: ${coords.longitude.toFixed(6)}`
      : '';

    const originClean = originLabel ? originLabel.split(',')[0] : 'Origin';
    const destClean = destinationLabel ? destinationLabel.split(',')[0] : 'Destination';

    const messageLines = [
      `🚨 [EMERGENCY SOS] Urgent assistance needed!`,
      ``,
      `I am currently on an active commute with Commute Companion.`,
      `• Driver: ${driverName}`,
      `• Route: ${originClean} → ${destClean}`,
      `• Trip ID: ${tripId}`,
      `• Time: ${new Date().toLocaleTimeString()} (${new Date().toLocaleDateString()})`,
      ``,
      `📍 LIVE GPS LOCATION:`,
      locationLink,
      coordinatesText ? `(${coordinatesText})` : '',
    ].filter(Boolean);

    try {
      await Share.share({
        title: 'EMERGENCY SOS - Commute Companion',
        message: messageLines.join('\n'),
      });
    } catch (e) {
      // User dismissed share dialog
    }
  };

  const handleSOS = () => {
    Alert.alert(
      'Emergency SOS',
      'Choose an emergency action to take immediately:',
      [
        {
          text: 'Call Emergency (911)',
          style: 'destructive',
          onPress: () => {
            Linking.openURL('tel:911').catch(() =>
              Alert.alert('Error', 'Unable to initiate a call from this device.')
            );
          },
        },
        {
          text: 'Share Live Location & Trip Details',
          onPress: handleShareLocation,
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (variant === 'card') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Emergency SOS button"
        style={({ pressed }) => [
          styles.cardSosButton,
          {
            backgroundColor: theme.colors.error,
            opacity: pressed || locating ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
          style,
        ]}
        onPress={(e) => {
          e.stopPropagation?.();
          handleSOS();
        }}
        disabled={locating}
      >
        {locating ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <View style={styles.cardContent}>
            <Ionicons name="warning" size={15} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.cardSosText}>SOS</Text>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Emergency SOS button"
      style={({ pressed }) => [
        styles.sosButton,
        {
          backgroundColor: theme.colors.error,
          opacity: pressed || locating ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
        style,
      ]}
      onPress={handleSOS}
      disabled={locating}
    >
      {locating ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Ionicons name="alert-circle" size={26} color="#fff" />
      )}
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
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 99,
  },
  cardSosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardSosText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
  },
});
