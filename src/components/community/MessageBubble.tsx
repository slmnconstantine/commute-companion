/**
 * MessageBubble
 *
 * A chat message bubble component.  Own messages are right-aligned with
 * a teal primary background and white text.  Messages from others are
 * left-aligned with a surface background and normal text colour, plus
 * a small sender avatar.  Alert messages receive a distinct warning style.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { MessageWithSender } from '@/types/database';
import { formatMessageTime } from '@/utils/dateFormatter';
import Avatar from '@/components/common/Avatar';

interface MessageBubbleProps {
  /** The message object with sender profile attached */
  message: MessageWithSender;
  /** Whether this message was sent by the current user */
  isOwnMessage: boolean;
}

/** Convert a hex colour to rgba with given alpha */
function hexToRgba(hex: string, alpha: number): string {
  const sanitised = hex.replace('#', '');
  const r = parseInt(sanitised.substring(0, 2), 16);
  const g = parseInt(sanitised.substring(2, 4), 16);
  const b = parseInt(sanitised.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const { theme } = useTheme();

  const isAlert = message.is_alert;

  // Resolve bubble colours
  const bubbleBg = isAlert
    ? hexToRgba(theme.colors.warning, 0.15)
    : isOwnMessage
      ? theme.colors.primary
      : theme.colors.surface;

  const bubbleBorder = isAlert
    ? hexToRgba(theme.colors.warning, 0.4)
    : isOwnMessage
      ? theme.colors.primaryDark
      : theme.colors.border;

  const textColor = isAlert
    ? theme.colors.text
    : isOwnMessage
      ? theme.colors.white
      : theme.colors.text;

  const timeColor = isAlert
    ? theme.colors.textMuted
    : isOwnMessage
      ? hexToRgba(theme.colors.white, 0.7)
      : theme.colors.textMuted;

  return (
    <View
      style={[
        styles.wrapper,
        isOwnMessage ? styles.wrapperOwn : styles.wrapperOther,
      ]}
    >
      {/* Avatar for other people's messages */}
      {!isOwnMessage && (
        <Avatar
          uri={message.sender?.avatar_url}
          name={message.sender?.full_name || 'User'}
          size="sm"
        />
      )}

      <View
        style={[
          styles.bubble,
          isOwnMessage ? styles.bubbleOwn : styles.bubbleOther,
          {
            backgroundColor: bubbleBg,
            borderColor: bubbleBorder,
          },
        ]}
      >
        {/* Alert icon row */}
        {isAlert && (
          <View style={styles.alertRow}>
            <Ionicons name="warning" size={14} color={theme.colors.warning} />
            <Text
              style={[
                styles.alertLabel,
                { color: theme.colors.warning, fontFamily: 'Inter-SemiBold' },
              ]}
            >
              Alert
            </Text>
          </View>
        )}

        {/* Sender name for other people */}
        {!isOwnMessage && !isAlert && (
          <Text
            style={[
              styles.senderName,
              { color: theme.colors.primary, fontFamily: 'Inter-SemiBold' },
            ]}
            numberOfLines={1}
          >
            {message.sender?.full_name}
          </Text>
        )}

        {/* Message content */}
        <Text
          style={[
            styles.content,
            { color: textColor, fontFamily: 'Inter-Regular' },
          ]}
        >
          {message.content}
        </Text>

        {/* Timestamp */}
        <Text
          style={[
            styles.time,
            { color: timeColor, fontFamily: 'Inter-Regular' },
            isOwnMessage ? styles.timeOwn : styles.timeOther,
          ]}
        >
          {formatMessageTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    marginVertical: 3,
    paddingHorizontal: 12,
    gap: 8,
  },
  wrapperOwn: {
    justifyContent: 'flex-end',
  },
  wrapperOther: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  bubbleOwn: {
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  alertLabel: {
    fontSize: 11,
  },
  senderName: {
    fontSize: 12,
    marginBottom: 2,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
  time: {
    fontSize: 10,
    marginTop: 4,
  },
  timeOwn: {
    textAlign: 'right',
  },
  timeOther: {
    textAlign: 'left',
  },
});
