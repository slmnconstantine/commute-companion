/**
 * ProfileHeader
 *
 * A hero-style profile header section.  Displays a large, centered
 * avatar, the user's full name, role and verification badges, and
 * a bottom stats row for Rating | Total Rides | Member Since.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Profile } from '@/types/database';
import { formatFullDate } from '@/utils/dateFormatter';
import Avatar from '@/components/common/Avatar';
import Badge from '@/components/common/Badge';
import StarRating from '@/components/common/StarRating';
import Skeleton from '@/components/common/Skeleton';

interface ProfileHeaderProps {
  /** The user's profile */
  profile?: Profile;
  loading?: boolean;
}

/** Convert a hex colour to rgba with given alpha */
function hexToRgba(hex: string, alpha: number): string {
  const sanitised = hex.replace('#', '');
  const r = parseInt(sanitised.substring(0, 2), 16);
  const g = parseInt(sanitised.substring(2, 4), 16);
  const b = parseInt(sanitised.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ProfileHeader({ profile, loading = false }: ProfileHeaderProps) {
  const { theme } = useTheme();

  if (loading || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <Skeleton width={80} height={80} borderRadius={40} />
        <Skeleton width={160} height={24} style={{ marginBottom: 8, marginTop: 16 }} />
        <Skeleton width={100} height={16} style={{ marginBottom: 16 }} />
        <View style={styles.statsRow}>
          <Skeleton width={60} height={40} />
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <Skeleton width={60} height={40} />
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <Skeleton width={60} height={40} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Large avatar */}
      <Avatar
        uri={profile.avatar_url}
        name={profile.full_name}
        size="xl"
        showBadge={profile.verified_badge}
      />

      {/* Full name */}
      <Text
        style={[
          styles.name,
          { color: theme.colors.text, fontFamily: 'Inter-Bold' },
        ]}
      >
        {profile.full_name}
      </Text>

      {/* Badges row */}
      <View style={styles.badgesRow}>
        <Badge
          label={profile.role === 'driver' ? 'Driver' : 'Commuter'}
          variant={profile.role === 'driver' ? 'driver' : 'commuter'}
        />
        {profile.verified_badge && (
          <View
            style={[
              styles.verifiedPill,
              { backgroundColor: hexToRgba(theme.colors.success, 0.12) },
            ]}
          >
            <Ionicons name="shield-checkmark" size={14} color={theme.colors.success} />
            <Text
              style={[
                styles.verifiedText,
                { color: theme.colors.success, fontFamily: 'Inter-SemiBold' },
              ]}
            >
              Verified
            </Text>
          </View>
        )}
      </View>

      {/* Stats row */}
      <View
        style={[
          styles.statsRow,
          {
            backgroundColor: hexToRgba(theme.colors.primary, 0.06),
            borderColor: theme.colors.border,
          },
        ]}
      >
        {/* Rating stat */}
        <View style={styles.statItem}>
          <View style={styles.statValueRow}>
            <StarRating
              rating={profile.rating_avg ?? 0}
              size="sm"
            />
          </View>
          <Text
            style={[
              styles.statValue,
              { color: theme.colors.text, fontFamily: 'Inter-Bold' },
            ]}
          >
            {profile.rating_avg?.toFixed(1) ?? 'N/A'}
          </Text>
          <Text
            style={[
              styles.statLabel,
              { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' },
            ]}
          >
            Rating
          </Text>
        </View>

        {/* Divider */}
        <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />

        {/* Total rides */}
        <View style={styles.statItem}>
          <Ionicons name="car-outline" size={20} color={theme.colors.primary} />
          <Text
            style={[
              styles.statValue,
              { color: theme.colors.text, fontFamily: 'Inter-Bold' },
            ]}
          >
            {profile.total_ratings}
          </Text>
          <Text
            style={[
              styles.statLabel,
              { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' },
            ]}
          >
            Total Rides
          </Text>
        </View>

        {/* Divider */}
        <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />

        {/* Member since */}
        <View style={styles.statItem}>
          <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
          <Text
            style={[
              styles.statValue,
              { color: theme.colors.text, fontFamily: 'Inter-Bold' },
            ]}
            numberOfLines={1}
          >
            {formatFullDate(profile.created_at).split(',')[0]}
          </Text>
          <Text
            style={[
              styles.statLabel,
              { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' },
            ]}
          >
            Member Since
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  name: {
    fontSize: 22,
    marginTop: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  verifiedText: {
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginTop: 8,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
  },
  statLabel: {
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
});
