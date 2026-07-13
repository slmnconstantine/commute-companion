/**
 * AnimatedSegmentControl — Premium segmented control with sliding pill
 *
 * Replaces plain background-color-change segment controls with a
 * smooth sliding pill indicator using Animated.spring.
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, LayoutChangeEvent } from 'react-native';

interface AnimatedSegmentControlProps<T extends string> {
  segments: readonly T[];
  activeSegment: T;
  onSegmentChange: (segment: T) => void;
  /** Theme colors */
  primaryColor?: string;
  backgroundColor?: string;
  activeTextColor?: string;
  inactiveTextColor?: string;
  /** Custom style */
  style?: any;
}

export default function AnimatedSegmentControl<T extends string>({
  segments,
  activeSegment,
  onSegmentChange,
  primaryColor = '#10B981',
  backgroundColor = '#F1F5F9',
  activeTextColor = '#FFFFFF',
  inactiveTextColor = '#64748B',
  style,
}: AnimatedSegmentControlProps<T>) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [segmentWidth, setSegmentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const activeIndex = segments.indexOf(activeSegment);

  useEffect(() => {
    if (containerWidth > 0) {
      const width = containerWidth / segments.length;
      setSegmentWidth(width);
    }
  }, [containerWidth, segments.length]);

  useEffect(() => {
    if (segmentWidth > 0) {
      Animated.spring(slideAnim, {
        toValue: activeIndex * segmentWidth,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [activeIndex, segmentWidth]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      style={[styles.container, { backgroundColor }, style]}
      onLayout={handleLayout}
    >
      {/* Sliding pill indicator */}
      {segmentWidth > 0 && (
        <Animated.View
          style={[
            styles.pill,
            {
              width: segmentWidth - 6,
              backgroundColor: primaryColor,
              transform: [{ translateX: Animated.add(slideAnim, 3) }],
              shadowColor: primaryColor,
            },
          ]}
        />
      )}

      {/* Segment buttons */}
      {segments.map((segment, index) => (
        <Pressable
          key={segment}
          style={styles.segment}
          onPress={() => onSegmentChange(segment)}
        >
          <Text
            style={[
              styles.segmentText,
              {
                color: activeIndex === index ? activeTextColor : inactiveTextColor,
                fontFamily: activeIndex === index ? 'Inter-SemiBold' : 'Inter-Medium',
              },
            ]}
          >
            {segment}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    borderRadius: 11,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    zIndex: 1,
  },
  segmentText: {
    fontSize: 14,
    letterSpacing: 0.1,
  },
});
