import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { HubPostWithAuthor } from '@/types/database';
import { formatRelativeTime } from '@/utils/dateFormatter';
import Avatar from '@/components/common/Avatar';
import Skeleton from '@/components/common/Skeleton';

interface HubPostCardProps {
  post?: HubPostWithAuthor;
  locationLabel?: string;
  currentUserId?: string;
  onPress?: () => void;
  onLike?: (postId: string, currentlyLiked: boolean) => void;
  onCommentClick?: (post: HubPostWithAuthor) => void;
  onDelete?: (postId: string) => void;
  onEditClick?: (post: HubPostWithAuthor) => void;
  loading?: boolean;
}

type StatusTag = 'traffic' | 'tip' | 'alert' | 'question' | 'delay' | 'full' | 'clear' | 'other';

export const STATUS_CONFIG: Record<StatusTag, { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
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

export default function HubPostCard({
  post,
  locationLabel,
  currentUserId,
  onPress,
  onLike,
  onCommentClick,
  onDelete,
  onEditClick,
  loading = false,
}: HubPostCardProps) {
  const { theme } = useTheme();

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

  const getTagConfig = (tag: string): TagConfig => {
    switch (tag.toLowerCase() as StatusTag) {
      case 'traffic': return { icon: 'car-outline', color: theme.colors.error || '#EF4444' };
      case 'tip': return { icon: 'bulb-outline', color: theme.colors.success || '#10B981' };
      case 'alert':
      case 'delay': return { icon: 'warning-outline', color: theme.colors.warning || '#F59E0B' };
      case 'question': return { icon: 'help-circle-outline', color: theme.colors.info || '#3B82F6' };
      case 'full': return { icon: 'people-outline', color: '#8B5CF6' };
      case 'clear': return { icon: 'checkmark-circle-outline', color: theme.colors.success || '#10B981' };
      default: return { icon: 'chatbubble-outline', color: theme.colors.textMuted };
    }
  };

  const tagConfig = getTagConfig(post.status_tag);

  const likeScale = useRef(new Animated.Value(1)).current;

  const handleLikePress = () => {
    if (!onLike) return;
    Animated.sequence([
      Animated.timing(likeScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, friction: 3, useNativeDriver: true })
    ]).start();
    onLike(post.id, !!post.user_has_liked);
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: pressed && onPress ? 0.95 : 1,
          transform: [{ scale: pressed && onPress ? 0.98 : 1 }],
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={styles.authorRow}>
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
            <Text style={[styles.timestamp, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
              {formatRelativeTime(post.created_at)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.tagBadge, { backgroundColor: hexToRgba(tagConfig.color, 0.12) }]}>
            <Ionicons name={tagConfig.icon} size={12} color={tagConfig.color} />
            <Text style={[styles.tagText, { color: tagConfig.color, fontFamily: 'Inter-SemiBold' }]}>
              {post.status_tag.charAt(0).toUpperCase() + post.status_tag.slice(1)}
            </Text>
          </View>

          {currentUserId && post.author_id === currentUserId && (
            <View style={{ flexDirection: 'row', gap: 4 }}>
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
        </View>
      </View>

      <Text style={[styles.message, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]}>
        {post.message}
      </Text>

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
        <Text style={[styles.locationText, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]} numberOfLines={1}>
          {locationLabel || post.location_label || `${post.location_lat.toFixed(4)}, ${post.location_lng.toFixed(4)}`}
        </Text>
      </View>

      {(onLike || onCommentClick) && (
        <View style={[styles.actionsRow, { borderTopColor: theme.colors.border }]}>
          {onLike && (
            <Pressable style={styles.actionBtn} onPress={handleLikePress} hitSlop={8}>
              <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                <Ionicons
                  name={post.user_has_liked ? "heart" : "heart-outline"}
                  size={18}
                  color={post.user_has_liked ? theme.colors.error : theme.colors.textMuted}
                />
              </Animated.View>
              <Text style={[styles.actionText, { color: post.user_has_liked ? theme.colors.error : theme.colors.textMuted }]}>
                {post.likes_count || 0}
              </Text>
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
});
