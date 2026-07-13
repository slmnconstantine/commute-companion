/**
 * DriverInfoCard
 *
 * A rich driver profile card for trip detail screens.
 * Horizontal layout: large avatar on the left, driver details and
 * vehicle information on the right.  Includes star rating,
 * verification status, and full vehicle specs.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Profile, Vehicle } from '@/types/database';
import Avatar from '@/components/common/Avatar';
import StarRating from '@/components/common/StarRating';

import Skeleton from '@/components/common/Skeleton';

interface DriverInfoCardProps {
  driver?: Pick<Profile, 'full_name' | 'avatar_url' | 'verified_badge' | 'rating_avg' | 'total_ratings'>;
  vehicle?: Pick<Vehicle, 'model' | 'plate_number' | 'type' | 'capacity'>;
  loading?: boolean;
}

export default function DriverInfoCard({ driver, vehicle, loading = false }: DriverInfoCardProps) {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  if (loading || !driver) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center' }]}>
        <Skeleton width={56} height={56} borderRadius={28} />
        <View style={{ marginLeft: 16 }}>
          <Skeleton width={140} height={18} style={{ marginBottom: 6 }} />
          <Skeleton width={100} height={14} style={{ marginBottom: 6 }} />
          <Skeleton width={120} height={14} />
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: 'transparent',
          borderColor: theme.colors.border,
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={[styles.blurContainer, { backgroundColor: theme.colors.surface }]}>
      {/* Top section: Avatar + Driver info */}
      <View style={styles.topSection}>
        {/* Avatar */}
        <Avatar
          uri={driver.avatar_url}
          name={driver.full_name}
          size="lg"
          showBadge={driver.verified_badge}
        />

        {/* Driver details */}
        <View style={styles.driverDetails}>
          {/* Name row */}
          <View style={styles.nameRow}>
            <Text
              style={[
                styles.driverName,
                { color: theme.colors.text, fontFamily: 'Inter-Bold' },
              ]}
              numberOfLines={1}
            >
              {driver.full_name}
            </Text>
            {driver.verified_badge && (
              <View
                style={[
                  styles.verifiedPill,
                  { backgroundColor: hexToRgba(theme.colors.success, 0.12) },
                ]}
              >
                <Ionicons name="shield-checkmark" size={12} color={theme.colors.success} />
                <Text
                  style={[
                    styles.verifiedText,
                    { color: theme.colors.success, fontFamily: 'Inter-Medium' },
                  ]}
                >
                  Verified
                </Text>
              </View>
            )}
          </View>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <StarRating rating={driver.rating_avg ?? 0} size="sm" showValue />
            <Text
              style={[
                styles.ratingCount,
                { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' },
              ]}
            >
              ({driver.total_ratings} {driver.total_ratings === 1 ? 'review' : 'reviews'})
            </Text>
          </View>
        </View>
      </View>

      {/* Vehicle section */}
      {vehicle && (
        <>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <View style={styles.vehicleSection}>
            <View style={styles.vehicleHeader}>
              <Ionicons name="car-sport-outline" size={18} color={theme.colors.primary} />
              <Text
                style={[
                  styles.vehicleTitle,
                  { color: theme.colors.text, fontFamily: 'Inter-SemiBold' },
                ]}
              >
                Vehicle
              </Text>
            </View>

            <View style={styles.vehicleGrid}>
              <VehicleDetail
                icon="car-outline"
                label="Type"
                value={vehicle.type}
                textColor={theme.colors.text}
                mutedColor={theme.colors.textMuted}
                iconColor={theme.colors.textMuted}
              />
              <VehicleDetail
                icon="construct-outline"
                label="Model"
                value={vehicle.model}
                textColor={theme.colors.text}
                mutedColor={theme.colors.textMuted}
                iconColor={theme.colors.textMuted}
              />
              <VehicleDetail
                icon="document-text-outline"
                label="Plate"
                value={vehicle.plate_number}
                textColor={theme.colors.text}
                mutedColor={theme.colors.textMuted}
                iconColor={theme.colors.textMuted}
              />
              <VehicleDetail
                icon="people-outline"
                label="Capacity"
                value={vehicle.capacity}
                textColor={theme.colors.text}
                mutedColor={theme.colors.textMuted}
                iconColor={theme.colors.textMuted}
              />
            </View>
          </View>
        </>
      )}
      </View>
    </Animated.View>
  );
}

/** Individual vehicle detail item */
function VehicleDetail({
  icon,
  label,
  value,
  textColor,
  mutedColor,
  iconColor,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  textColor: string;
  mutedColor: string;
  iconColor: string;
}) {
  return (
    <View style={styles.vehicleDetailItem}>
      <View style={styles.vehicleDetailRow}>
        <Ionicons name={icon} size={14} color={iconColor} />
        <Text
          style={[
            styles.vehicleLabel,
            { color: mutedColor, fontFamily: 'Inter-Regular' },
          ]}
        >
          {label}
        </Text>
      </View>
      <Text
        style={[
          styles.vehicleValue,
          { color: textColor, fontFamily: 'Inter-Medium' },
        ]}
        numberOfLines={1}
      >
        {value}
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
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  blurContainer: {
    padding: 16,
  },
  topSection: {
    flexDirection: 'row',
    gap: 16,
  },
  driverDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  driverName: {
    fontSize: 17,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingCount: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  vehicleSection: {
    gap: 12,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleTitle: {
    fontSize: 14,
  },
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  vehicleDetailItem: {
    width: '46%',
    gap: 2,
  },
  vehicleDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vehicleLabel: {
    fontSize: 12,
  },
  vehicleValue: {
    fontSize: 14,
    marginLeft: 18,
  },
});
