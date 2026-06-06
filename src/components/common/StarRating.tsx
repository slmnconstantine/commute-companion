/**
 * StarRating
 *
 * Renders 1–5 star icons (filled, half-filled, or outline) to display
 * a numeric rating.  In interactive mode each star is pressable so
 * users can set their own rating.  An optional numeric value is shown
 * alongside the stars.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

type StarSize = 'sm' | 'md' | 'lg';

interface StarRatingProps {
  /** Current rating (0 – 5, supports halves e.g. 3.5) */
  rating: number;
  /** Icon size preset */
  size?: StarSize;
  /** Allow the user to tap stars to change the rating */
  interactive?: boolean;
  /** Called with the new rating when a star is tapped (requires interactive) */
  onRatingChange?: (rating: number) => void;
  /** Show the numeric value beside the stars */
  showValue?: boolean;
}

const SIZE_MAP: Record<StarSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
};

export default function StarRating({
  rating,
  size = 'md',
  interactive = false,
  onRatingChange,
  showValue = false,
}: StarRatingProps) {
  const { theme } = useTheme();
  const iconSize = SIZE_MAP[size];
  const starColor = theme.colors.accent;

  /**
   * Determine the icon name for a given 1-indexed star position.
   */
  const getIconName = (index: number): React.ComponentProps<typeof Ionicons>['name'] => {
    if (rating >= index) return 'star';
    if (rating >= index - 0.5) return 'star-half';
    return 'star-outline';
  };

  const handlePress = (index: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(index);
    }
  };

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((i) => {
        const icon = (
          <Ionicons
            key={i}
            name={getIconName(i)}
            size={iconSize}
            color={starColor}
          />
        );

        if (interactive) {
          return (
            <Pressable
              key={i}
              onPress={() => handlePress(i)}
              hitSlop={4}
              style={styles.star}
            >
              {icon}
            </Pressable>
          );
        }

        return (
          <View key={i} style={styles.star}>
            {icon}
          </View>
        );
      })}

      {showValue && (
        <Text
          style={[
            styles.value,
            size === 'sm' ? theme.typography.small : theme.typography.caption,
            { color: theme.colors.text },
          ]}
        >
          {rating.toFixed(1)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 2,
  },
  value: {
    marginLeft: 6,
  },
});
