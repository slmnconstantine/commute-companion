import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Avatar from './Avatar';
import Badge from './Badge';
import { supabase } from '@/lib/supabase';
import { Profile, Vehicle, ReviewWithProfiles } from '@/types/database';
import { getUserReviews } from '@/services/reviews';

interface ProfileCardModalProps {
  userId: string | null;
  visible: boolean;
  onClose: () => void;
}

export default function ProfileCardModal({ userId, visible, onClose }: ProfileCardModalProps) {
  const { theme } = useTheme();
  const { profile: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [reviews, setReviews] = useState<ReviewWithProfiles[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);

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

        // Fetch recent reviews
        try {
          const reviewsData = await getUserReviews(userId);
          setReviews(reviewsData.slice(0, 3));
        } catch (e) {
          // Reviews fetch is non-critical
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, visible]);

  const getRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

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
                <Text style={[styles.name, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
                  {profile.full_name}
                </Text>
                
                <View style={styles.badgesRow}>
                  <Badge label={profile.role === 'driver' ? 'Driver' : 'Commuter'} variant={profile.role === 'driver' ? 'active' : 'pending'} />
                </View>

                <View style={styles.statsRow}>
                  <View style={[styles.statBox, { backgroundColor: theme.colors.background }]}>
                    <Ionicons name="star" size={18} color={theme.colors.accent} />
                    <Text style={[styles.statValue, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
                      {profile.rating_avg?.toFixed(1) || 'New'}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
                      {profile.total_ratings} Ratings
                    </Text>
                  </View>
                  
                  {vehicle && (
                    <View style={[styles.statBox, { backgroundColor: theme.colors.background, flex: 2 }]}>
                      <Ionicons name="car-outline" size={18} color={theme.colors.primary} />
                      <Text style={[styles.statValue, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
                        {vehicle.model}
                      </Text>
                      <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
                        {vehicle.plate_number} • {vehicle.capacity} seats
                      </Text>
                    </View>
                  )}
                </View>

                {/* Recent Reviews */}
                {reviews.length > 0 && (
                  <View style={styles.reviewsSection}>
                    <Text style={[styles.reviewsTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
                      Recent Reviews
                    </Text>
                    {reviews.map((review) => (
                      <View key={review.id} style={[styles.reviewCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                        <View style={styles.reviewHeader}>
                          <Avatar uri={review.reviewer?.avatar_url} name={review.reviewer?.full_name || ''} size="sm" />
                          <View style={styles.reviewMeta}>
                            <Text style={[styles.reviewerName, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]} numberOfLines={1}>
                              {review.reviewer?.full_name}
                            </Text>
                            <Text style={[styles.reviewTime, { color: theme.colors.textMuted }]}>
                              {getRelativeTime(review.created_at)}
                            </Text>
                          </View>
                          <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map(s => (
                              <Ionicons key={s} name={s <= review.rating ? 'star' : 'star-outline'} size={12} color={theme.colors.accent} />
                            ))}
                          </View>
                        </View>
                        {review.comment && (
                          <Text style={[styles.reviewComment, { color: theme.colors.textMuted }]} numberOfLines={2}>
                            "{review.comment}"
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {reviews.length === 0 && (
                  <View style={[styles.noReviews, { backgroundColor: theme.colors.background }]}>
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.textMuted} />
                    <Text style={[styles.noReviewsText, { color: theme.colors.textMuted }]}>No reviews yet</Text>
                  </View>
                )}

                {/* Report User */}
                {currentUser?.id !== userId && (
                  <Pressable
                    style={styles.reportBtn}
                    onPress={() => {
                      onClose();
                      // Small delay so modal closes first
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
    minHeight: 280,
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
    gap: 12,
  },
  name: {
    fontSize: 24,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
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
  reviewsSection: {
    marginTop: 8,
    gap: 8,
  },
  reviewsTitle: {
    fontSize: 15,
  },
  reviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewMeta: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 13,
  },
  reviewTime: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  reviewComment: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
    marginLeft: 32,
  },
  noReviews: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
  },
  noReviewsText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  reportText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
});
