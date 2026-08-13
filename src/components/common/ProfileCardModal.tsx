import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Avatar from './Avatar';
import Badge from './Badge';
import { supabase } from '@/lib/supabase';
import { Profile, Vehicle } from '@/types/database';

interface ProfileCardModalProps {
  userId: string | null;
  visible: boolean;
  onClose: () => void;
  onMention?: (handle: string) => void;
}

export default function ProfileCardModal({ userId, visible, onClose, onMention }: ProfileCardModalProps) {
  const { theme } = useTheme();
  const { profile: currentUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    if (!visible || !userId) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (!error && data) {
          setProfile(data as Profile);

          if (data.role === 'driver') {
            const { data: vData } = await supabase
              .from('vehicles')
              .select('*')
              .eq('driver_id', userId)
              .eq('is_active', true)
              .single();
            if (vData) setVehicle(vData as Vehicle);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, visible]);

  const handleMention = () => {
    if (!profile) return;
    const rawHandle = profile.username || profile.full_name.replace(/\s+/g, '');
    const handleWithAt = `@${rawHandle}`;
    
    onClose();

    if (onMention) {
      onMention(handleWithAt);
    } else {
      // Small timeout so modal cleanly closes before tab transition
      setTimeout(() => {
        router.push({
          pathname: '/(main)/(tabs)/community',
          params: { mention: handleWithAt },
        });
      }, 150);
    }
  };

  const handleDisplayTag = profile?.username
    ? `@${profile.username}`
    : `@${(profile?.full_name || '').replace(/\s+/g, '')}`;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.modalContent, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
          {loading ? (
            <ActivityIndicator color={theme.colors.primary} size="large" style={{ marginVertical: 40 }} />
          ) : profile ? (
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <View style={styles.header}>
                <Avatar uri={profile.avatar_url} name={profile.full_name} size="xl" showBadge={profile.verified_badge} />
                <Pressable onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close-circle" size={28} color={theme.colors.textMuted} />
                </Pressable>
              </View>

              <View style={styles.infoSection}>
                <View style={styles.nameContainer}>
                  <Text style={[styles.name, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
                    {profile.full_name}
                  </Text>
                  <Text style={[styles.handle, { color: theme.colors.primary, fontFamily: 'Inter-Medium' }]}>
                    {handleDisplayTag}
                  </Text>
                </View>
                
                <View style={styles.badgesRow}>
                  <Badge label={profile.role === 'driver' ? 'Verified Driver 🚗' : 'Commuter 🚶'} variant={profile.role === 'driver' ? 'active' : 'pending'} />
                </View>

                {/* Ratings (shown for drivers) */}
                {profile.role === 'driver' && (
                  <View style={styles.statsRow}>
                    <View style={[styles.statBox, { backgroundColor: theme.colors.background }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="star" size={20} color={theme.colors.accent || '#F59E0B'} />
                        <Text style={[styles.statValue, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
                          {profile.rating_avg ? profile.rating_avg.toFixed(1) : '5.0'}
                        </Text>
                      </View>
                      <Text style={[styles.statLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                        {profile.total_ratings || 0} Ratings
                      </Text>
                    </View>
                    
                    {vehicle && (
                      <View style={[styles.statBox, { backgroundColor: theme.colors.background, flex: 2 }]}>
                        <Ionicons name="car-outline" size={20} color={theme.colors.primary} />
                        <Text style={[styles.statValue, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
                          {vehicle.model}
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                          {vehicle.plate_number} • {vehicle.capacity} seats
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Action Buttons: @ Mention in Community Hub */}
                <View style={styles.actionButtonsContainer}>
                  <Pressable
                    style={[styles.mentionBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={handleMention}
                  >
                    <View style={styles.atBadgeCircle}>
                      <Text style={styles.atBadgeText}>@</Text>
                    </View>
                    <Text style={[styles.mentionBtnText, { fontFamily: 'Inter-SemiBold' }]}>
                      Mention in Community Hub
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>

                {/* Report User */}
                {currentUser?.id !== userId && (
                  <Pressable
                    style={styles.reportBtn}
                    onPress={() => {
                      onClose();
                      setTimeout(() => {
                        const { Alert } = require('react-native');
                        Alert.alert(
                          'Report User',
                          'Are you sure you want to report this user?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Report',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  const { submitReport } = require('@/services/reports');
                                  await submitReport(currentUser?.id || '', userId || '', null, 'Reported from profile card', '');
                                  Alert.alert('Report Submitted', 'Thank you for reporting. Our team will review it.');
                                } catch (e) {
                                  Alert.alert('Error', 'Failed to submit report. The reports table may not exist yet.');
                                }
                              },
                            },
                          ]
                        );
                      }, 300);
                    }}
                  >
                    <Ionicons name="flag-outline" size={14} color={theme.colors.error} />
                    <Text style={[styles.reportText, { color: theme.colors.error }]}>Report User</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          ) : (
            <Text style={{ color: theme.colors.text, margin: 20 }}>Profile not found.</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 260,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  closeBtn: {
    padding: 4,
  },
  infoSection: {
    gap: 14,
  },
  nameContainer: {
    gap: 2,
  },
  name: {
    fontSize: 22,
  },
  handle: {
    fontSize: 14,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
  },
  statLabel: {
    fontSize: 12,
  },
  actionButtonsContainer: {
    marginTop: 8,
  },
  mentionBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: '#0057FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  atBadgeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  atBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  mentionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    flex: 1,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  reportText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
});
