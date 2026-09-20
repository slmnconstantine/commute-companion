import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { HubPostWithAuthor } from '@/types/database';
import { formatRelativeTime, formatDepartureTime } from '@/utils/dateFormatter';
import Avatar from '@/components/common/Avatar';
import Skeleton from '@/components/common/Skeleton';
import ReactionPicker from './ReactionPicker';
import { HUB_REACTIONS, HubReactionType } from '@/lib/constants';

interface HubPostCardProps {
  post?: HubPostWithAuthor;
  locationLabel?: string;
  currentUserId?: string;
  onPress?: () => void;
  onLike?: (postId: string, currentlyLiked: boolean) => void;
  onReaction?: (postId: string, reactionType: HubReactionType) => void;
  onCommentClick?: (post: HubPostWithAuthor) => void;
  onDelete?: (postId: string) => void;
  onEditClick?: (post: HubPostWithAuthor) => void;
  onAvatarPress?: (userId: string) => void;
  onReport?: (postId: string) => void;
  onImagePress?: (images: string[], index: number) => void;
  isHighlighted?: boolean;
  loading?: boolean;
}

type StatusTag = 'traffic' | 'tip' | 'alert' | 'question' | 'delay' | 'full' | 'clear' | 'other' | 'ride';

export const STATUS_CONFIG: Record<StatusTag, { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  ride: { label: 'Ride Share', icon: 'car-sport-outline', color: '#0284C7' },
  traffic: { label: 'Traffic', icon: 'car-outline', color: '#EF4444' },
  delay: { label: 'Delay', icon: 'warning-outline', color: '#F59E0B' },
  full: { label: 'Full', icon: 'people-outline', color: '#8B5CF6' },
  clear: { label: 'Clear', icon: 'checkmark-circle-outline', color: '#10B981' },
  tip: { label: 'Tip', icon: 'bulb-outline', color: '#10B981' },
  alert: { label: 'Alert', icon: 'warning-outline', color: '#F59E0B' },
  question: { label: 'Question', icon: 'help-circle-outline', color: '#3B82F6' },
  other: { label: 'Other', icon: 'chatbubble-outline', color: '#6B7280' },
};

interface TagConfig {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const sanitised = hex.replace('#', '');
  const r = parseInt(sanitised.substring(0, 2), 16);
  const g = parseInt(sanitised.substring(2, 4), 16);
  const b = parseInt(sanitised.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function renderMessageWithMentions(text: string, primaryColor: string) {
  if (!text) return null;
  const parts = text.split(/(@[\w.-]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <Text
          key={index}
          style={{ color: primaryColor, fontFamily: 'Inter-Bold' }}
        >
          {part}
        </Text>
      );
    }
    return part;
  });
}

function HubPostCard({
  post,
  locationLabel,
  currentUserId,
  onPress,
  onLike,
  onReaction,
  onCommentClick,
  onDelete,
  onEditClick,
  onAvatarPress,
  onReport,
  onImagePress,
  isHighlighted = false,
  loading = false,
}: HubPostCardProps) {
  const { theme, mode } = useTheme();
  const router = useRouter();
  const isDark = mode === 'dark';
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);

  const likeScale = useRef(new Animated.Value(1)).current;

  if (loading || !post) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.header}>
          <View style={styles.authorRow}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <View style={styles.authorInfo}>
              <Skeleton width={120} height={16} style={{ marginBottom: 4 }} />
              <Skeleton width={80} height={12} />
            </View>
          </View>
        </View>
        <Skeleton width="100%" height={60} />
        <View style={styles.actionsRow}>
          <Skeleton width={60} height={20} style={{ marginRight: 24 }} />
          <Skeleton width={60} height={20} />
        </View>
      </View>
    );
  }

  const getTagConfig = (tag: string): TagConfig & { label: string } => {
    const config = STATUS_CONFIG[tag.toLowerCase() as StatusTag];
    if (config) {
      return { icon: config.icon, color: config.color, label: config.label };
    }
    return {
      icon: 'chatbubble-outline',
      color: theme.colors.textMuted,
      label: tag.charAt(0).toUpperCase() + tag.slice(1),
    };
  };

  const tagConfig = getTagConfig(post.status_tag);

  const handleLikePress = () => {
    Animated.sequence([
      Animated.timing(likeScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, friction: 3, useNativeDriver: true })
    ]).start();

    if (onReaction) {
      const activeType = (post.user_reaction as HubReactionType) || 'like';
      onReaction(post.id, activeType);
    } else if (onLike) {
      onLike(post.id, !!post.user_has_liked);
    }
  };

  const handleReactionSelect = (reactionType: HubReactionType) => {
    Animated.sequence([
      Animated.timing(likeScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, friction: 3, useNativeDriver: true })
    ]).start();

    if (onReaction) {
      onReaction(post.id, reactionType);
    } else if (onLike) {
      onLike(post.id, !!post.user_has_liked);
    }
  };

  const postAgeDays = (Date.now() - new Date(post.created_at).getTime()) / (24 * 60 * 60 * 1000);
  const isApproachingWeek = postAgeDays >= 6 && postAgeDays < 7;
  const isPastWeek = postAgeDays >= 7;

  // Find active reaction config
  const activeReaction = HUB_REACTIONS.find((r) => r.type === post.user_reaction);
  const reactionIcon = activeReaction ? (activeReaction.icon as any) : (post.user_has_liked ? 'heart' : 'heart-outline');
  const reactionColor = activeReaction ? activeReaction.color : (post.user_has_liked ? (theme.colors.error || '#EF4444') : theme.colors.textMuted);

  // Reaction types breakdown
  const topReactions = Object.entries(post.reactions_count || {})
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => HUB_REACTIONS.find((r) => r.type === type))
    .filter(Boolean);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: isHighlighted
            ? (isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF')
            : theme.colors.surface,
          borderColor: isHighlighted
            ? (isDark ? '#3B82F6' : '#BFDBFE')
            : theme.colors.border,
          opacity: pressed && onPress ? 0.97 : 1,
          transform: [{ scale: pressed && onPress ? 0.99 : 1 }],
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.authorRow}
          onPress={() => onAvatarPress && post.author_id && onAvatarPress(post.author_id)}
        >
          <Avatar
            uri={post.author?.avatar_url}
            name={post.author?.full_name || 'User'}
            size="sm"
            showBadge={post.author?.verified_badge}
          />
          <View style={styles.authorInfo}>
            <Text style={[styles.authorName, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]} numberOfLines={1}>
              {post.author?.full_name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={[styles.timestamp, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                {formatRelativeTime(post.created_at)}
              </Text>
              {post.edited_at && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 3,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 4,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : `${theme.colors.border}70`,
                  }}
                >
                  <Ionicons name="pencil-outline" size={9} color={theme.colors.textMuted} />
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: 'Inter-Medium',
                      color: theme.colors.textMuted,
                    }}
                  >
                    Edited {formatRelativeTime(post.edited_at)}
                  </Text>
                </View>
              )}
              {currentUserId && post.author_id === currentUserId && (isApproachingWeek || isPastWeek) && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 3,
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                    borderRadius: 4,
                    backgroundColor: isPastWeek ? `${theme.colors.error}18` : `${theme.colors.warning}18`,
                  }}
                >
                  <Ionicons name="time-outline" size={10} color={isPastWeek ? theme.colors.error : theme.colors.warning} />
                  <Text
                    style={{
                      fontSize: 9,
                      fontFamily: 'Inter-Medium',
                      color: isPastWeek ? theme.colors.error : theme.colors.warning,
                    }}
                  >
                    {isPastWeek ? 'Past 1 week' : 'Approaching 1w'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.tagBadge, { backgroundColor: hexToRgba(tagConfig.color, 0.12) }]}>
            <Ionicons name={tagConfig.icon} size={12} color={tagConfig.color} />
            <Text style={[styles.tagText, { color: tagConfig.color, fontFamily: 'Inter-SemiBold' }]}>
              {tagConfig.label}
            </Text>
          </View>

          {/* Post Author Actions */}
          {currentUserId && post.author_id === currentUserId && (
            <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
              {onEditClick && (
                <Pressable onPress={() => onEditClick(post)} style={{ padding: 4 }} hitSlop={8}>
                  <Ionicons name="pencil-outline" size={16} color={theme.colors.primary} />
                </Pressable>
              )}
              {onDelete && (
                <Pressable onPress={() => onDelete(post.id)} style={{ padding: 4 }} hitSlop={8}>
                  <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                </Pressable>
              )}
            </View>
          )}

          {/* Non-Author Report Action */}
          {currentUserId && post.author_id !== currentUserId && onReport && (
            <Pressable
              onPress={() => onReport(post.id)}
              style={{ padding: 4 }}
              hitSlop={8}
            >
              <Ionicons name="flag-outline" size={15} color={theme.colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <Text style={[styles.message, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]}>
        {renderMessageWithMentions(post.message, theme.colors.primary)}
      </Text>

      {/* Attached Images */}
      {post.image_urls && post.image_urls.length > 0 && (
        <View style={styles.imageGallery}>
          {post.image_urls.map((imgUrl, index) => (
            <Pressable
              key={index}
              style={[
                styles.imageCard,
                post.image_urls!.length === 1 ? styles.singleImageCard : styles.multiImageCard,
                { borderColor: theme.colors.border },
              ]}
              onPress={() => onImagePress && onImagePress(post.image_urls!, index)}
            >
              <Image source={{ uri: imgUrl }} style={styles.imageThumbnail} resizeMode="cover" />
            </Pressable>
          ))}
        </View>
      )}

      {/* Attached Shared Ride Card */}
      {(post.trip || post.trip_id) && (
        <Pressable
          style={({ pressed }) => [
            styles.sharedRideCard,
            {
              backgroundColor: isDark ? 'rgba(2, 132, 199, 0.12)' : 'rgba(2, 132, 199, 0.05)',
              borderColor: `${theme.colors.primary}35`,
              opacity: pressed ? 0.95 : 1,
            },
          ]}
          onPress={() => {
            const tripIdToOpen = post.trip?.id || post.trip_id;
            if (tripIdToOpen) {
              router.push(`/(main)/ride/${tripIdToOpen}` as any);
            }
          }}
        >
          {/* Top Row: Trip Badge & Departure */}
          <View style={styles.sharedRideTopRow}>
            <View style={[styles.rideTypeBadge, { backgroundColor: `${theme.colors.primary}20` }]}>
              <Ionicons name="car-sport" size={13} color={theme.colors.primary} />
              <Text style={[styles.rideTypeBadgeText, { color: theme.colors.primary }]}>Carpool Ride</Text>
            </View>

            {post.trip?.departure_time && (
              <View style={styles.rideTimeTag}>
                <Ionicons name="time-outline" size={13} color={theme.colors.textMuted} />
                <Text style={[styles.rideTimeText, { color: theme.colors.textMuted }]}>
                  {formatDepartureTime(post.trip.departure_time)}
                </Text>
              </View>
            )}

            {post.trip?.status && (
              <View
                style={[
                  styles.rideStatusBadge,
                  {
                    backgroundColor:
                      post.trip.status === 'open'
                        ? `${theme.colors.success}20`
                        : post.trip.status === 'full'
                        ? 'rgba(139, 92, 246, 0.2)'
                        : `${theme.colors.textMuted}20`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rideStatusText,
                    {
                      color:
                        post.trip.status === 'open'
                          ? theme.colors.success
                          : post.trip.status === 'full'
                          ? '#8B5CF6'
                          : theme.colors.textMuted,
                    },
                  ]}
                >
                  {post.trip.status === 'open'
                    ? `${post.trip.available_seats || 1} seat${(post.trip.available_seats || 1) !== 1 ? 's' : ''} left`
                    : post.trip.status === 'full'
                    ? 'Ride Full'
                    : post.trip.status.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Route Section */}
          <View style={styles.routeContainer}>
            <View style={styles.routeIndicator}>
              <View style={[styles.dot, { backgroundColor: theme.colors.success }]} />
              <View style={[styles.routeLine, { backgroundColor: theme.colors.border }]} />
              <View style={[styles.dot, { backgroundColor: theme.colors.error || '#EF4444' }]} />
            </View>
            <View style={styles.routeLabels}>
              <Text style={[styles.routeText, { color: theme.colors.text }]} numberOfLines={1}>
                {post.trip?.origin_label || 'Pickup Location'}
              </Text>
              <Text style={[styles.routeText, { color: theme.colors.text }]} numberOfLines={1}>
                {post.trip?.destination_label || 'Dropoff Location'}
              </Text>
            </View>
          </View>

          {/* Bottom Action CTA */}
          <View style={[styles.sharedRideFooter, { borderTopColor: `${theme.colors.border}60` }]}>
            <View style={styles.fareContainer}>
              <Text style={[styles.fareAmount, { color: theme.colors.primary }]}>
                ₱{Number(post.trip?.fare_per_seat || 0).toFixed(2)}
              </Text>
              <Text style={[styles.fareSub, { color: theme.colors.textMuted }]}>/ seat</Text>
            </View>

            <View style={[styles.joinRideBtn, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.joinRideBtnText}>
                {currentUserId && post.trip?.driver_id === currentUserId
                  ? 'View My Ride'
                  : post.trip?.status === 'open'
                  ? 'Click here to join my ride'
                  : 'View Ride'}
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </View>
          </View>
        </Pressable>
      )}

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
        <Text style={[styles.locationText, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]} numberOfLines={1}>
          {locationLabel || post.location_label || `${post.location_lat.toFixed(4)}, ${post.location_lng.toFixed(4)}`}
        </Text>
      </View>

      {/* Actions Row */}
      {(onLike || onReaction || onCommentClick) && (
        <View style={[styles.actionsRow, { borderTopColor: theme.colors.border }]}>
          {(onLike || onReaction) && (
            <Pressable
              style={styles.actionBtn}
              onPress={handleLikePress}
              onLongPress={() => setReactionPickerVisible(true)}
              delayLongPress={280}
              hitSlop={8}
            >
              <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                <Ionicons
                  name={reactionIcon}
                  size={18}
                  color={reactionColor}
                />
              </Animated.View>
              <Text style={[styles.actionText, { color: reactionColor }]}>
                {post.likes_count || 0}
              </Text>

              {/* Reaction breakdown icons */}
              {topReactions.length > 0 && (
                <View style={styles.topReactionsRow}>
                  {topReactions.map((r, i) => (
                    <Ionicons
                      key={i}
                      name={r!.icon as any}
                      size={11}
                      color={r!.color}
                      style={{ marginLeft: i > 0 ? -3 : 2 }}
                    />
                  ))}
                </View>
              )}
            </Pressable>
          )}

          {onCommentClick && (
            <Pressable style={styles.actionBtn} onPress={() => onCommentClick(post)} hitSlop={8}>
              <Ionicons name="chatbubble-outline" size={16} color={theme.colors.textMuted} />
              <Text style={[styles.actionText, { color: theme.colors.textMuted }]}>
                {post.comments_count || 0}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Inline Recent Comments Preview */}
      {post.recent_comments && post.recent_comments.length > 0 && (
        <View
          style={[
            styles.recentCommentsBox,
            { backgroundColor: `${theme.colors.background}88`, borderColor: `${theme.colors.border}80` },
          ]}
        >
          {post.recent_comments.slice(0, 2).map((comment) => (
            <View key={comment.id} style={styles.recentCommentItem}>
              <Text style={[styles.recentCommentAuthor, { color: theme.colors.text }]}>
                {comment.author?.full_name?.split(' ')[0] || 'User'}:
              </Text>
              <Text style={[styles.recentCommentText, { color: theme.colors.textMuted }]} numberOfLines={1}>
                {comment.content}
              </Text>
            </View>
          ))}
          {onCommentClick && (post.comments_count || 0) > 2 && (
            <Pressable onPress={() => onCommentClick(post)} style={styles.viewMoreBtn}>
              <Text style={[styles.viewMoreText, { color: theme.colors.primary }]}>
                View all {post.comments_count} comments
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Reaction Picker Popover */}
      <ReactionPicker
        visible={reactionPickerVisible}
        currentReaction={post.user_reaction}
        onSelect={handleReactionSelect}
        onClose={() => setReactionPickerVisible(false)}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 1,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 11,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  imageGallery: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  imageCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  singleImageCard: {
    width: '100%',
    height: 180,
  },
  multiImageCard: {
    flex: 1,
    height: 140,
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 24,
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  topReactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  recentCommentsBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
    marginTop: 2,
  },
  recentCommentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recentCommentAuthor: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
  },
  recentCommentText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  viewMoreBtn: {
    marginTop: 2,
  },
  viewMoreText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },

  /* Shared Ride Card Styles */
  sharedRideCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginVertical: 4,
    gap: 10,
  },
  sharedRideTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  rideTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rideTypeBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
  },
  rideTimeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rideTimeText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  rideStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rideStatusText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  routeIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeLine: {
    width: 2,
    height: 16,
    marginVertical: 2,
  },
  routeLabels: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 8,
  },
  routeText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  sharedRideFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  fareContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  fareAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  fareSub: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
  },
  joinRideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  joinRideBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
});

export default React.memo(HubPostCard);
