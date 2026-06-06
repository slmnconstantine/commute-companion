/**
 * VerificationBanner
 *
 * A prominent, colour-coded banner that communicates the user's
 * identity verification status at a glance:
 *
 *  • **Unverified** – amber, shield icon, prompts user to begin
 *  • **Pending**    – blue, hourglass icon, verification in review
 *  • **Verified**   – green, checkmark icon, account is verified
 *
 * Pressing the banner navigates the user to the verification screen.
 */

import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Profile } from '@/types/database';

type VerificationState = 'unverified' | 'pending' | 'verified';

interface VerificationBannerProps {
  /** The user's profile used to derive verification state */
  profile: Profile;
  /** Called when the banner is pressed */
  onPress?: () => void;
}

interface BannerConfig {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description: string;
  color: string;
}

/** Convert a hex colour to rgba with given alpha */
function hexToRgba(hex: string, alpha: number): string {
  const sanitised = hex.replace('#', '');
  const r = parseInt(sanitised.substring(0, 2), 16);
  const g = parseInt(sanitised.substring(2, 4), 16);
  const b = parseInt(sanitised.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Derive the verification state from the profile:
 *  - verified_badge === true  → 'verified'
 *  - has government_id_url but not verified → 'pending'
 *  - otherwise → 'unverified'
 */
function getVerificationState(profile: Profile): VerificationState {
  if (profile.verified_badge || profile.is_verified) return 'verified';
  if (profile.government_id_url) return 'pending';
  return 'unverified';
}

export default function VerificationBanner({ profile, onPress }: VerificationBannerProps) {
  const { theme } = useTheme();

  const state = getVerificationState(profile);

  /** Resolve state → banner configuration */
  const getConfig = (): BannerConfig => {
    switch (state) {
      case 'unverified':
        return {
          icon: 'shield-outline',
          label: 'Unverified Account',
          description: 'Complete verification to start sharing rides',
          color: theme.colors.warning,
        };
      case 'pending':
        return {
          icon: 'hourglass-outline',
          label: 'Verification In Progress',
          description: 'We\'re reviewing your documents — hang tight!',
          color: theme.colors.info,
        };
      case 'verified':
        return {
          icon: 'shield-checkmark',
          label: 'Verified Account',
          description: 'Your identity has been confirmed',
          color: theme.colors.success,
        };
    }
  };

  const config = getConfig();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: hexToRgba(config.color, 0.1),
          borderColor: hexToRgba(config.color, 0.3),
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={onPress}
    >
      {/* Left icon */}
      <Ionicons name={config.icon} size={24} color={config.color} />

      {/* Text content */}
      <Pressable style={styles.textContent} onPress={onPress}>
        <Text
          style={[
            styles.label,
            { color: config.color, fontFamily: 'Inter-SemiBold' },
          ]}
        >
          {config.label}
        </Text>
        <Text
          style={[
            styles.description,
            { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' },
          ]}
        >
          {config.description}
        </Text>
      </Pressable>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={18} color={config.color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  textContent: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 14,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
});
