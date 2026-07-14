/**
 * AnimatedListItem
 *
 * Wrapper component that animates list items with a staggered
 * fade+slide entrance based on their index position.
 * Only animates on initial mount.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

interface AnimatedListItemProps {
  /** Position in the list, used to calculate stagger delay */
  index: number;
  /** Delay per item in ms (default: 60) */
  staggerMs?: number;
  children: React.ReactNode;
}

export default function AnimatedListItem({ index, staggerMs = 60, children }: AnimatedListItemProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const delay = index * staggerMs;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}
