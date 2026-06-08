import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HubPostWithAuthor } from '@/types/database';

export const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  traffic: { label: 'Traffic', color: '#EF4444', icon: 'car-outline' },
  delay: { label: 'Delay', color: '#F59E0B', icon: 'warning-outline' },
  full: { label: 'Full', color: '#8B5CF6', icon: 'people-outline' },
  clear: { label: 'Clear', color: '#10B981', icon: 'checkmark-circle-outline' },
  other: { label: 'Other', color: '#3B82F6', icon: 'chatbubble-outline' },
};

interface HubPostCardProps {
  post: HubPostWithAuthor;
  theme: any;
  currentUserId?: string;
  onLike: (postId: string, currentlyLiked: boolean) => void;
  onCommentClick: (post: HubPostWithAuthor) => void;
  onDelete: (postId: string) => void;
  onEditClick: (post: HubPostWithAuthor) => void;
}

export default function HubPostCard({
  post,
  theme,
  currentUserId,
  onLike,
  onCommentClick,
  onDelete,
  onEditClick
}: HubPostCardProps) {
  const config = STATUS_CONFIG[post.status_tag] || STATUS_CONFIG.other;

  // Format date loosely
  const date = new Date(post.created_at);
  const timeAgo = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const displayTime = `${dateStr}, ${timeAgo}`;

  // Micro-animations
  const scale = useRef(new Animated.Value(1)).current;
  const likeScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();

  const handleLikePress = () => {
    Animated.sequence([
      Animated.timing(likeScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, friction: 3, useNativeDriver: true })
    ]).start();
    onLike(post.id, !!post.user_has_liked);
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <View style={[styles.postCard, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
      <View style={styles.authorRow}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary, overflow: 'hidden' }]}>
          {post.author?.avatar_url ? (
            <Image source={{ uri: post.author.avatar_url }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Text style={[styles.avatarText, { color: theme.colors.white }]}>
              {post.author?.full_name?.charAt(0).toUpperCase() || '?'}
            </Text>
          )}
        </View>
        <View style={styles.authorInfo}>
          <Text style={[theme.typography.caption, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
            {post.author?.full_name || 'Anonymous'}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={11} color={theme.colors.textMuted} />
            <Text style={[theme.typography.small, { color: theme.colors.textMuted, marginLeft: 3 }]}>
              {displayTime}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.statusBadge, { backgroundColor: `${config.color}18` }]}>
            <Ionicons name={config.icon} size={11} color={config.color} />
            <Text style={[theme.typography.small, { fontSize: 10, color: config.color, fontFamily: 'Inter-Medium', marginLeft: 4 }]}>
              {config.label}
            </Text>
          </View>
          
          {post.author_id === currentUserId && (
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Pressable onPress={() => onEditClick(post)} style={{ padding: 4 }}>
                <Ionicons name="pencil-outline" size={16} color={theme.colors.primary} />
              </Pressable>
              <Pressable onPress={() => onDelete(post.id)} style={{ padding: 4 }}>
                <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
              </Pressable>
            </View>
          )}
        </View>
      </View>

      <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 12 }]}>
        {post.message}
      </Text>

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={13} color={theme.colors.textMuted} />
        <Text style={[theme.typography.small, { color: theme.colors.textMuted, marginLeft: 4 }]} numberOfLines={1}>
          {post.location_label || `${post.location_lat.toFixed(4)}, ${post.location_lng.toFixed(4)}`}
        </Text>
      </View>

      <View style={[styles.actionsRow, { borderTopColor: theme.colors.border }]}>
        <Pressable 
          style={styles.actionBtn} 
          onPress={handleLikePress}
          hitSlop={8}
        >
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <Ionicons
              name={post.user_has_liked ? "heart" : "heart-outline"}
              size={18}
              color={post.user_has_liked ? theme.colors.error : theme.colors.textMuted}
            />
          </Animated.View>
          <Text style={[theme.typography.small, { color: post.user_has_liked ? theme.colors.error : theme.colors.textMuted, marginLeft: 5 }]}>
            {post.likes_count || 0}
          </Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => onCommentClick(post)}>
          <Ionicons name="chatbubble-outline" size={16} color={theme.colors.textMuted} />
          <Text style={[theme.typography.small, { color: theme.colors.textMuted, marginLeft: 5 }]}>
            {post.comments_count || 0}
          </Text>
        </Pressable>
      </View>
    </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  postCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  authorInfo: {
    flex: 1,
    marginLeft: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
});
