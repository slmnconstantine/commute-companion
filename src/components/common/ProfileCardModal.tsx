import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Avatar from './Avatar';
import Badge from './Badge';
import { supabase } from '@/lib/supabase';
import { Profile, Vehicle, ReviewWithProfiles } from '@/types/database';
import { getUserReviews } from '@/services/reviews';
import { formatRelativeTime } from '@/utils/dateFormatter';

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
  const [tripsCompleted, setTripsCompleted] = useState<number>(0);
  const [tripsJoined, setTripsJoined] = useState<number>(0);
  const [reviews, setReviews] = useState<ReviewWithProfiles[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    if (!visible || !userId) {
      setShowAllReviews(false);
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const [profileRes, reviewsData] = await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single(),
          getUserReviews(userId).catch(() => [] as ReviewWithProfiles[]),
        ]);

        if (!profileRes.error && profileRes.data) {
          const data = profileRes.data as Profile;
          setProfile(data);
          setReviews(reviewsData || []);

          if (data.role === 'driver') {
            const [vRes, tripsRes] = await Promise.all([
              supabase
                .from('vehicles')
                .select('*')
                .eq('driver_id', userId)
                .eq('is_active', true)
                .maybeSingle(),
              supabase
                .from('trips')
                .select('id', { count: 'exact', head: true })
                .eq('driver_id', userId)
                .eq('status', 'completed'),
            ]);
            if (vRes.data) setVehicle(vRes.data as Vehicle);
            if (tripsRes.count !== null && tripsRes.count !== undefined) {
              setTripsCompleted(tripsRes.count);
            }
          } else {
            const { count: joinedCount } = await supabase
              .from('bookings')
              .select('id', { count: 'exact', head: true })
              .eq('commuter_id', userId)
              .in('status', ['accepted', 'completed', 'ongoing']);

            if (joinedCount !== null && joinedCount !== undefined) {
              setTripsJoined(joinedCount);
            }
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

  // Dynamically compute compliments based on profile role, ratings, and feedback
  const compliments = React.useMemo(() => {
    if (!profile) return [];
    const list: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; color: string }[] = [];

    const effectiveAvg = profile.rating_avg ?? (reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 5.0);

    if (profile.role === 'driver') {
      if (effectiveAvg >= 4.0) {
        list.push({ icon: 'star', label: 'Top-Rated Driver', color: '#F59E0B' });
      }
      list.push({ icon: 'car-sport-outline', label: 'Smooth Driving', color: '#3B82F6' });
      list.push({ icon: 'time-outline', label: 'Punctual & On-Time', color: '#10B981' });
      if (vehicle) {
        list.push({ icon: 'sparkles-outline', label: 'Clean Vehicle', color: '#8B5CF6' });
      }
      if (tripsCompleted >= 2) {
        list.push({ icon: 'shield-checkmark-outline', label: 'Verified Routes', color: '#06B6D4' });
      }
    } else {
      if (effectiveAvg >= 4.0) {
        list.push({ icon: 'star', label: '5-Star Passenger', color: '#F59E0B' });
      }
      list.push({ icon: 'time-outline', label: 'Prompt Pickup', color: '#10B981' });
      list.push({ icon: 'chatbubble-ellipses-outline', label: 'Friendly & Courteous', color: '#3B82F6' });
      if (tripsJoined >= 2) {
        list.push({ icon: 'ribbon-outline', label: 'Regular Commuter', color: '#EC4899' });
      }
    }

    return list;
  }, [profile, vehicle, tripsCompleted, tripsJoined, reviews]);

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 2);

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
                  <Badge
                    label={profile.role === 'driver' ? 'Verified Driver' : 'Commuter'}
                    variant={profile.role === 'driver' ? 'active' : 'pending'}
                    icon={profile.role === 'driver' ? 'car' : 'walk'}
                  />
                </View>

                {/* Stats Row: For Drivers, combine Trips Completed & Ratings. For Commuters, show Trips joined */}
                {profile.role === 'driver' ? (
                  <View style={styles.statsRow}>
                    <View style={[styles.statBox, { backgroundColor: theme.colors.background, flex: vehicle ? 1.15 : 1 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="star" size={19} color={theme.colors.accent || '#F59E0B'} />
                        <Text style={[styles.statValue, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
                          {profile.rating_avg ? profile.rating_avg.toFixed(1) : '5.0'}
                        </Text>
                      </View>
                      <Text style={[styles.statLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium', textAlign: 'center', fontSize: 11 }]}>
                        {tripsCompleted} {tripsCompleted === 1 ? 'Trip' : 'Trips'} Completed
                      </Text>
                      <Text style={[styles.statSubText, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular', fontSize: 10 }]}>
                        {profile.total_ratings || 0} {profile.total_ratings === 1 ? 'Rating' : 'Ratings'}
                      </Text>
                    </View>
                    
                    {vehicle && (
                      <View style={[styles.statBox, { backgroundColor: theme.colors.background, flex: 1.35 }]}>
                        <Ionicons name="car-outline" size={20} color={theme.colors.primary} />
                        <Text style={[styles.statValue, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', textAlign: 'center' }]} numberOfLines={1}>
                          {vehicle.model}
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular', fontSize: 11, textAlign: 'center' }]} numberOfLines={1}>
                          {vehicle.plate_number} • {vehicle.capacity} seats
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.statsRow}>
                    <View style={[styles.statBox, { backgroundColor: theme.colors.background, flex: 1 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="ticket-outline" size={20} color={theme.colors.primary} />
                        <Text style={[styles.statValue, { color: theme.colors.text, fontFamily: 'Inter-Bold', fontSize: 18 }]}>
                          {tripsJoined}
                        </Text>
                      </View>
                      <Text style={[styles.statLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>
                        {tripsJoined === 1 ? 'Trip Joined' : 'Trips Joined'}
                      </Text>
                    </View>
                    {(profile.total_ratings || 0) > 0 && (
                      <View style={[styles.statBox, { backgroundColor: theme.colors.background, flex: 1 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="star" size={18} color={theme.colors.accent || '#F59E0B'} />
                          <Text style={[styles.statValue, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
                            {profile.rating_avg ? profile.rating_avg.toFixed(1) : '5.0'}
                          </Text>
                        </View>
                        <Text style={[styles.statLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>
                          {profile.total_ratings} {profile.total_ratings === 1 ? 'Rating' : 'Ratings'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Passenger Feedback & Review Snippets Section */}
                <View style={styles.feedbackSection}>
                  <View style={styles.feedbackHeader}>
                    <View style={styles.feedbackTitleRow}>
                      <Ionicons name="chatbubbles-outline" size={17} color={theme.colors.primary} />
                      <Text style={[styles.feedbackTitle, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
                        {profile.role === 'driver' ? 'Passenger Feedback' : 'Commuter Feedback'}
                      </Text>
                    </View>
                    {reviews.length > 0 && (
                      <View style={[styles.ratingPill, { backgroundColor: theme.colors.background }]}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text style={[styles.ratingPillText, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
                          {(profile.rating_avg ?? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)).toFixed(1)} ({reviews.length})
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Top Compliments Row */}
                  {compliments.length > 0 && (
                    <View style={styles.complimentsWrapper}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.complimentsScroll}
                      >
                        {compliments.map((comp, idx) => (
                          <View
                            key={idx}
                            style={[
                              styles.complimentChip,
                              {
                                backgroundColor: theme.colors.background,
                                borderColor: theme.colors.border,
                              },
                            ]}
                          >
                            <Ionicons name={comp.icon} size={13} color={comp.color} />
                            <Text style={[styles.complimentText, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>
                              {comp.label}
                            </Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Reviews List or Clean Empty State */}
                  {reviews.length > 0 ? (
                    <View style={styles.reviewsList}>
                      {displayedReviews.map((review) => (
                        <View
                          key={review.id}
                          style={[
                            styles.reviewCard,
                            {
                              backgroundColor: theme.colors.background,
                              borderColor: theme.colors.border,
                            },
                          ]}
                        >
                          <View style={styles.reviewCardTop}>
                            <View style={styles.reviewerInfo}>
                              <Avatar
                                uri={review.reviewer?.avatar_url}
                                name={review.reviewer?.full_name || 'Passenger'}
                                size="sm"
                              />
                              <View style={styles.reviewerMeta}>
                                <Text
                                  style={[styles.reviewerName, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}
                                  numberOfLines={1}
                                >
                                  {review.reviewer?.full_name || 'Verified Commuter'}
                                </Text>
                                <Text style={[styles.reviewTime, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                                  {review.created_at ? formatRelativeTime(review.created_at) : 'Recently'}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.starsRow}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Ionicons
                                  key={star}
                                  name={star <= review.rating ? 'star' : 'star-outline'}
                                  size={12}
                                  color={star <= review.rating ? '#F59E0B' : theme.colors.border}
                                />
                              ))}
                            </View>
                          </View>

                          {review.comment && review.comment.trim().length > 0 ? (
                            <Text style={[styles.reviewComment, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]}>
                              "{review.comment.trim()}"
                            </Text>
                          ) : (
                            <Text style={[styles.reviewFallbackText, { color: theme.colors.textMuted, fontFamily: 'Inter-Italic' }]}>
                              {review.rating >= 4
                                ? 'Rated 5 out of 5 stars • Recommended trip'
                                : `Rated ${review.rating} out of 5 stars`}
                            </Text>
                          )}
                        </View>
                      ))}

                      {reviews.length > 2 && (
                        <Pressable
                          style={[styles.toggleReviewsBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                          onPress={() => setShowAllReviews(!showAllReviews)}
                        >
                          <Text style={[styles.toggleReviewsText, { color: theme.colors.primary, fontFamily: 'Inter-SemiBold' }]}>
                            {showAllReviews ? 'Show Less' : `View All ${reviews.length} Reviews`}
                          </Text>
                          <Ionicons
                            name={showAllReviews ? 'chevron-up' : 'chevron-down'}
                            size={15}
                            color={theme.colors.primary}
                          />
                        </Pressable>
                      )}
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.emptyFeedbackBox,
                        { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                      ]}
                    >
                      <Ionicons name="sparkles-outline" size={20} color={theme.colors.textMuted} />
                      <Text style={[styles.emptyFeedbackTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
                        No written reviews yet
                      </Text>
                      <Text style={[styles.emptyFeedbackSub, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                        {profile.role === 'driver'
                          ? 'Passenger reviews and ratings will be showcased here after completed rides.'
                          : 'Trip reviews from drivers and passengers will appear here.'}
                      </Text>
                    </View>
                  )}
                </View>

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
    maxHeight: '88%',
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
  statSubText: {
    fontSize: 10,
  },
  feedbackSection: {
    marginTop: 4,
    gap: 10,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedbackTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackTitle: {
    fontSize: 15,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  ratingPillText: {
    fontSize: 12,
  },
  complimentsWrapper: {
    marginHorizontal: -4,
  },
  complimentsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  complimentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  complimentText: {
    fontSize: 12,
  },
  reviewsList: {
    gap: 8,
  },
  reviewCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 8,
  },
  reviewCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  reviewerMeta: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 13,
  },
  reviewTime: {
    fontSize: 10,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 13,
    lineHeight: 18,
  },
  reviewFallbackText: {
    fontSize: 12,
  },
  toggleReviewsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 2,
  },
  toggleReviewsText: {
    fontSize: 12,
  },
  emptyFeedbackBox: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyFeedbackTitle: {
    fontSize: 13,
  },
  emptyFeedbackSub: {
    fontSize: 11,
    textAlign: 'center',
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
