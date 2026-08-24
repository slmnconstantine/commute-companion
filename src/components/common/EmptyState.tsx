/**
 * EmptyState
 *
 * A friendly, centred placeholder shown when a list or section
 * has no data.  Includes a large Ionicons icon, title, description,
 * and an optional action button.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SafeLottieView from './SafeLottieView';
import { useTheme } from '@/context/ThemeContext';
import Button from './Button';

interface EmptyStateProps {
  /** Ionicons icon name rendered at the top */
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Optional Lottie animation source JSON */
  lottieSource?: any;
  /** Primary headline */
  title: string;
  /** Supporting description */
  message: string;
  /** Optional button label — requires `onAction` */
  actionLabel?: string;
  /** Press handler for the action button */
  onAction?: () => void;
}

export default function EmptyState({
  icon = 'car-outline',
  lottieSource,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { theme } = useTheme();

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    let isMounted = true;

    // Entrance
    const entranceAnim = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    entranceAnim.start(() => {
      if (!isMounted) return;
      // Start floating loop after entrance
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -8,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      animLoop.start();
    });

    return () => {
      isMounted = false;
      entranceAnim.stop();
      if (animLoop) {
        animLoop.stop();
      }
    };
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
        {lottieSource ? (
          <SafeLottieView
            source={lottieSource}
            autoPlay
            loop
            fallbackIcon={icon}
            style={{ width: 140, height: 140, marginBottom: 12 }}
          />
        ) : (
          <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}12` }]}>
            <Ionicons
              name={icon}
              size={56}
              color={`${theme.colors.primary}60`}
              style={styles.icon}
            />
          </View>
        )}
      </Animated.View>

      <Text
        style={[
          styles.title,
          theme.typography.title,
          { color: theme.colors.text },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.message,
          theme.typography.body,
          { color: theme.colors.textMuted },
        ]}
      >
        {message}
      </Text>

      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button title={actionLabel} onPress={onAction} variant="primary" size="md" />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 56,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: {
    // positioned inside the circle
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  action: {
    alignSelf: 'stretch',
  },
});
