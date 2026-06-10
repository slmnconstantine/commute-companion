/**
 * Profile Tab
 *
 * Displays the authenticated user's profile header (avatar, name,
 * role & verification badges), stats row, and grouped menu sections.
 * For commuters, shows a "Become a Driver" upgrade card.
 * For drivers, shows vehicle management options.
 * Includes dark-mode toggle, demo override, and sign-out.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/common/Avatar';
import Badge from '@/components/common/Badge';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MenuItem {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  color?: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { theme, mode, toggleTheme } = useTheme();
  const { profile, signOut, updateProfile, refreshProfile } = useAuth();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      refreshProfile().catch(console.error);
    }, [])
  );

  const isDriver = profile?.role === 'driver';

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-PH', {
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  const handleDemoOverride = () => {
    Alert.alert(
      'Demo Override',
      'This will instantly set you as a verified driver. For demo/testing only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            const { error } = await updateProfile({
              role: 'driver',
              is_verified: true,
              verified_badge: true,
            });
            if (!error) {
              Alert.alert('Success! ✅', 'You are now a verified driver.');
            } else {
              Alert.alert('Error', 'Failed to update profile.');
            }
          },
        },
      ]
    );
  };


  // ── Menu Sections ─────────────────────────────────────────────

  const menuSections: MenuSection[] = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person-outline',
          label: 'Edit Profile',
          onPress: () => router.push('/(main)/settings/edit-profile' as any),
        },
        {
          icon: 'shield-checkmark-outline',
          label: 'Verification',
          onPress: () => router.push('/(main)/verification' as any),
        },
        ...(isDriver
          ? [
              {
                icon: 'car-outline' as const,
                label: 'My Vehicle',
                onPress: () =>
                  router.push('/(main)/settings/vehicle' as any),
              },
            ]
          : []),
      ],
    },
    {
      title: 'App',
      items: [
        {
          icon: 'moon-outline',
          label: 'Dark Mode',
          rightElement: (
            <Switch
              value={mode === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.white}
            />
          ),
        },
        {
          icon: 'notifications-outline',
          label: 'Notifications',
          onPress: () => router.push('/(main)/settings/notifications' as any),
        },
      ],
    },
    {
      title: 'Developer',
      items: [
        {
          icon: 'flash-outline',
          label: 'Override Driver Verification (Demo)',
          onPress: handleDemoOverride,
          color: theme.colors.accent,
        },

      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'information-circle-outline',
          label: 'About',
          onPress: () => {},
        },
        {
          icon: 'document-text-outline',
          label: 'Terms & Privacy',
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Profile Header ──────────────────────────────────────── */}
        <View style={styles.profileHeader}>
          <Avatar
            uri={profile?.avatar_url}
            name={profile?.full_name ?? 'User'}
            size="xl"
            showBadge={profile?.verified_badge ?? false}
          />

          <Text
            style={[
              theme.typography.heading,
              { color: theme.colors.text, marginTop: 16 },
            ]}
          >
            {profile?.full_name ?? 'User'}
          </Text>

          {/* Badges row */}
          <View style={styles.badgeRow}>
            <Badge
              label={isDriver ? 'Driver' : 'Commuter'}
              variant={isDriver ? 'driver' : 'commuter'}
            />
            {profile?.is_verified && (
              <Badge label="Verified" variant="verified" />
            )}
            {!profile?.is_verified && (
              <Badge label="Unverified" variant="unverified" />
            )}
          </View>
        </View>

        {/* ── Stats Row ───────────────────────────────────────────── */}
        <View
          style={[
            styles.statsRow,
            {
              backgroundColor: theme.colors.surface,
              shadowColor: theme.colors.shadow,
            },
          ]}
        >
          <View style={styles.statItem}>
            <View style={styles.statValueRow}>
              <Ionicons name="star" size={18} color={theme.colors.accent} />
              <Text
                style={[
                  theme.typography.title,
                  { color: theme.colors.text, marginLeft: 4 },
                ]}
              >
                {profile?.rating_avg?.toFixed(1) ?? '—'}
              </Text>
            </View>
            <Text
              style={[
                theme.typography.small,
                { color: theme.colors.textMuted },
              ]}
            >
              Rating
            </Text>
          </View>

          <View
            style={[styles.statDivider, { backgroundColor: theme.colors.border }]}
          />

          <View style={styles.statItem}>
            <Text
              style={[theme.typography.title, { color: theme.colors.text }]}
            >
              {profile?.total_ratings ?? 0}
            </Text>
            <Text
              style={[
                theme.typography.small,
                { color: theme.colors.textMuted },
              ]}
            >
              Total Rides
            </Text>
          </View>

          <View
            style={[styles.statDivider, { backgroundColor: theme.colors.border }]}
          />

          <View style={styles.statItem}>
            <Text
              style={[theme.typography.title, { color: theme.colors.text }]}
            >
              {memberSince}
            </Text>
            <Text
              style={[
                theme.typography.small,
                { color: theme.colors.textMuted },
              ]}
            >
              Member Since
            </Text>
          </View>
        </View>

        {/* ── Outstanding Balance Card (Drivers only) ──────────────── */}
        {isDriver && (
          <View
            style={[
              styles.balanceCard,
              {
                backgroundColor: theme.colors.surface,
                shadowColor: theme.colors.shadow,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.balanceInfo}>
              <View style={styles.balanceHeader}>
                <Ionicons name="wallet-outline" size={20} color={theme.colors.textMuted} />
                <Text
                  style={[
                    theme.typography.small,
                    {
                      color: theme.colors.textMuted,
                      fontFamily: 'Inter-Medium',
                      marginLeft: 6,
                    },
                  ]}
                >
                  Outstanding Platform Fees
                </Text>
              </View>
              <Text
                style={[
                  theme.typography.heading,
                  {
                    color: theme.colors.text,
                    fontFamily: 'Outfit-Bold',
                    marginTop: 4,
                  },
                ]}
              >
                ₱{profile?.platform_fee_balance !== undefined ? profile.platform_fee_balance.toFixed(2) : '0.00'}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.payButton,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              onPress={() => router.push('/(main)/payment/pay-fees')}
            >
              <Text
                style={[
                  theme.typography.body,
                  { color: theme.colors.white, fontFamily: 'Inter-SemiBold' },
                ]}
              >
                Pay Balance
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.colors.white}
                style={{ marginLeft: 4 }}
              />
            </Pressable>
          </View>
        )}

        {/* ── Become a Driver Card (Commuters only) ────────────────── */}
        {!isDriver && (
          <Pressable
            style={[styles.upgradeCard, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}
            onPress={() => router.push('/(main)/settings/become-driver' as any)}
          >
            <View style={[styles.upgradeIconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
              <Ionicons name="car-sport" size={32} color={theme.colors.primary} />
            </View>
            <View style={styles.upgradeTextContainer}>
              <Text style={[styles.upgradeTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
                Become a Driver
              </Text>
              <Text style={[styles.upgradeDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                Start offering rides, share your commute, and earn by carpooling with others.
              </Text>
            </View>
            <View style={[styles.upgradeArrow, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="arrow-forward" size={18} color={theme.colors.white} />
            </View>
          </Pressable>
        )}

        {/* ── Menu Sections ───────────────────────────────────────── */}
        {menuSections.map((section) => (
          <View key={section.title} style={styles.menuSection}>
            <Text
              style={[
                theme.typography.small,
                {
                  color: theme.colors.textMuted,
                  fontFamily: 'Inter-SemiBold',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 8,
                  paddingHorizontal: 4,
                },
              ]}
            >
              {section.title}
            </Text>

            <View
              style={[
                styles.menuCard,
                {
                  backgroundColor: theme.colors.surface,
                  shadowColor: theme.colors.shadow,
                },
              ]}
            >
              {section.items.map((item, idx) => (
                <React.Fragment key={item.label}>
                  <Pressable
                    style={styles.menuItem}
                    onPress={item.onPress}
                    disabled={!item.onPress && !item.rightElement}
                  >
                    <View
                      style={[
                        styles.menuIconContainer,
                        {
                          backgroundColor: `${item.color ?? theme.colors.primary}12`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={item.color ?? theme.colors.primary}
                      />
                    </View>
                    <Text
                      style={[
                        theme.typography.body,
                        { color: item.color ?? theme.colors.text, flex: 1 },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.rightElement ?? (
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={theme.colors.textMuted}
                      />
                    )}
                  </Pressable>

                  {/* Divider (skip last) */}
                  {idx < section.items.length - 1 && (
                    <View
                      style={[
                        styles.menuDivider,
                        { backgroundColor: theme.colors.border },
                      ]}
                    />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        {/* ── Sign Out ────────────────────────────────────────────── */}
        <Pressable
          style={[
            styles.signOutBtn,
            {
              backgroundColor: `${theme.colors.error}10`,
              borderColor: `${theme.colors.error}30`,
            },
          ]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
          <Text
            style={[
              theme.typography.body,
              {
                color: theme.colors.error,
                fontFamily: 'Inter-SemiBold',
                marginLeft: 8,
              },
            ]}
          >
            Sign Out
          </Text>
        </Pressable>

        {/* Version info */}
        <Text
          style={[
            theme.typography.small,
            {
              color: theme.colors.textMuted,
              textAlign: 'center',
              marginTop: 16,
              marginBottom: 8,
            },
          ]}
        >
          Commute Companion v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  /* Profile header */
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
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
  statDivider: {
    width: 1,
    height: 36,
  },

  /* Upgrade card */
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 18,
    borderRadius: 16,
    gap: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeTextContainer: {
    flex: 1,
    gap: 4,
  },
  upgradeTitle: {
    fontSize: 16,
  },
  upgradeDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  upgradeArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Menu */
  menuSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  menuCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDivider: {
    height: 1,
    marginLeft: 64,
  },

  /* Sign out */
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
  },

  /* Balance Card */
  balanceCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
});
