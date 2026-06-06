/**
 * HubPostCard
 *
 * A card for the community hub feed.  Displays an author row (avatar + name),
 * a coloured status tag badge (traffic, tip, alert, question), the post
 * message body, and a bottom row with location label and relative timestamp.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { HubPostWithAuthor } from '@/types/database';
import { formatRelativeTime } from '@/utils/dateFormatter';
import Avatar from '@/components/common/Avatar';

interface HubPostCardProps {
  /** The hub post with author profile attached */
  post: HubPostWithAuthor;
  /** Optional location label to display */
  locationLabel?: string;
  /** Called when the card is pressed */
  onPress?: () => void;
}

type StatusTag = 'traffic' | 'tip' | 'alert' | 'question';

interface TagConfig {
  icon: React.ComponentProps<typeof Ionicons>['name'];
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

export default function HubPostCard({ post, locationLabel, onPress }: HubPostCardProps) {
  const { theme } = useTheme();

  /** Resolve status tag → icon + colour */
  const getTagConfig = (tag: string): TagConfig => {
    switch (tag.toLowerCase() as StatusTag) {
      case 'traffic':
        return { icon: 'car-outline', color: theme.colors.warning };
      case 'tip':
        return { icon: 'bulb-outline', color: theme.colors.success };
      case 'alert':
        return { icon: 'warning-outline', color: theme.colors.error };
      case 'question':
        return { icon: 'help-circle-outline', color: theme.colors.info };
      default:
        return { icon: 'chatbubble-outline', color: theme.colors.textMuted };
    }
  };

  const tagConfig = getTagConfig(post.status_tag);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={onPress}
    >
      {/* Author row */}
      <View style={styles.authorRow}>
        <Avatar
          uri={post.author?.avatar_url}
          name={post.author?.full_name || 'User'}
          size="sm"
          showBadge={post.author?.verified_badge}
        />
        <View style={styles.authorInfo}>
          <Text
            style={[
              styles.authorName,
              { color: theme.colors.text, fontFamily: 'Inter-SemiBold' },
            ]}
            numberOfLines={1}
          >
            {post.author?.full_name}
          </Text>
          <Text
            style={[
              styles.timestamp,
              { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' },
            ]}
          >
            {formatRelativeTime(post.created_at)}
          </Text>
        </View>

        {/* Status tag */}
        <View
          style={[
            styles.tagBadge,
            { backgroundColor: hexToRgba(tagConfig.color, 0.12) },
          ]}
        >
          <Ionicons name={tagConfig.icon} size={12} color={tagConfig.color} />
          <Text
            style={[
              styles.tagText,
              { color: tagConfig.color, fontFamily: 'Inter-SemiBold' },
            ]}
          >
            {post.status_tag.charAt(0).toUpperCase() + post.status_tag.slice(1)}
          </Text>
        </View>
      </View>

      {/* Message body */}
      <Text
        style={[
          styles.message,
          { color: theme.colors.text, fontFamily: 'Inter-Regular' },
        ]}
      >
        {post.message}
      </Text>

      {/* Location row */}
      {locationLabel && (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
          <Text
            style={[
              styles.locationText,
              { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' },
            ]}
            numberOfLines={1}
          >
            {locationLabel}
          </Text>
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
    gap: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
});
