/**
 * Avatar
 *
 * Displays a user photo or a coloured circle with the user's initials.
 * An optional verification badge (green circle with a checkmark) can be
 * shown at the bottom-right corner.
 */

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  /** Remote image URI — if null/undefined, initials are shown instead */
  uri?: string | null;
  /** Full name used to derive initials */
  name: string;
  /** Visual size preset */
  size?: AvatarSize;
  /** Show a small green verification badge */
  showBadge?: boolean;
  /** Optional ring color for trust indicators */
  ringColor?: string;
  /** User rating — auto-sets gold ring for 4.5+ */
  rating?: number;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  sm: 32,
  md: 44,
  lg: 64,
  xl: 96,
};

/** Extract the first letter of each word (max 2 characters). */
function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

export default function Avatar({
  uri,
  name,
  size = 'md',
  showBadge = false,
  ringColor,
  rating,
}: AvatarProps) {
  const { theme } = useTheme();
  const dim = SIZE_MAP[size];
  const badgeSize = Math.max(12, Math.round(dim * 0.3));
  const initialsFont = Math.round(dim * 0.38);

  // Auto-derive ring color from rating if not explicitly set
  const resolvedRing = ringColor
    ? ringColor
    : rating && rating >= 4.5
    ? '#F59E0B' // Gold for high-rated
    : showBadge
    ? theme.colors.success // Green for verified
    : undefined;

  const ringWidth = resolvedRing ? 2.5 : 0;
  const outerDim = dim + ringWidth * 2 + 2;

  return (
    <View style={[styles.wrapper, { width: outerDim, height: outerDim }]}>
      {/* Ring */}
      {resolvedRing ? (
        <View
          style={[
            styles.ring,
            {
              width: outerDim,
              height: outerDim,
              borderRadius: outerDim / 2,
              borderWidth: ringWidth,
              borderColor: resolvedRing,
            },
          ]}
        />
      ) : null}

      {/* Avatar content */}
      <View style={[styles.avatarInner, { width: dim, height: dim, top: ringWidth + 1, left: ringWidth + 1 }]}>
        {uri ? (
          <Image
            source={{ uri }}
            style={[
              styles.image,
              {
                width: dim,
                height: dim,
                borderRadius: dim / 2,
              },
            ]}
          />
        ) : (
          <View
            style={[
              styles.initialsContainer,
              {
                width: dim,
                height: dim,
                borderRadius: dim / 2,
                backgroundColor: theme.colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.initialsText,
                {
                  fontSize: initialsFont,
                  color: theme.colors.white,
                  fontFamily: theme.typography.subtitle.fontFamily,
                },
              ]}
            >
              {getInitials(name)}
            </Text>
          </View>
        )}
      </View>

      {showBadge && (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: theme.colors.success,
              borderColor: theme.colors.surface,
            },
          ]}
        >
          <Ionicons
            name="checkmark"
            size={Math.round(badgeSize * 0.65)}
            color={theme.colors.white}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  avatarInner: {
    position: 'absolute',
  },
  image: {
    resizeMode: 'cover',
  },
  initialsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
