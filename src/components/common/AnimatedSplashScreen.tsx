import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Image,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { APP_NAME } from '@/lib/constants';

interface AnimatedSplashScreenProps {
  /** If true, the system is ready to transition out */
  isReady?: boolean;
  /** Minimum duration in ms the splash should stay visible */
  minDurationMs?: number;
  /** Callback invoked once animation and exit transition have fully completed */
  onFinish?: () => void;
}

export default function AnimatedSplashScreen({
  isReady = true,
  minDurationMs = 1200,
  onFinish,
}: AnimatedSplashScreenProps) {
  const { theme } = useTheme();

  // Overall exit fade
  const exitOpacity = useRef(new Animated.Value(1)).current;

  // 1. Commuter dots converging from left and right
  const leftDotX = useRef(new Animated.Value(-55)).current;
  const rightDotX = useRef(new Animated.Value(55)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;

  // 2. The empty Pin dropping & blooming in
  const pinScale = useRef(new Animated.Value(0.3)).current;
  const pinTranslateY = useRef(new Animated.Value(-16)).current;
  const pinOpacity = useRef(new Animated.Value(0)).current;

  // 3. Logo container scale
  const cardScale = useRef(new Animated.Value(0.85)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  // 4. The "Face" / Companions popping in inside the pin
  const faceScale = useRef(new Animated.Value(0.2)).current;
  const faceOpacity = useRef(new Animated.Value(0)).current;

  // 5. Brand Name wordmark
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(12)).current;

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);

  useEffect(() => {
    // Stage 1 (0ms - 400ms): Commuter dots slide towards center and meet
    Animated.parallel([
      Animated.timing(dotsOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(leftDotX, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rightDotX, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Stage 2 (380ms): Dots meet -> Pin forms first (without face)
    const pinTimer = setTimeout(() => {
      try {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch {}

      // Fade out converging dots
      Animated.timing(dotsOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start();

      // Pin blooms in
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(pinOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(pinScale, {
          toValue: 1,
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.spring(pinTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        }),
      ]).start();
    }, 380);

    // Stage 3 (680ms): The "face" / companions emerge inside the pin
    const faceTimer = setTimeout(() => {
      try {
        if (Platform.OS !== 'web') {
          Haptics.selectionAsync();
        }
      } catch {}

      Animated.parallel([
        Animated.timing(faceOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(faceScale, {
          toValue: 1,
          friction: 5,
          tension: 110,
          useNativeDriver: true,
        }),
      ]).start();
    }, 680);

    // Stage 4 (920ms): Reveal brand wordmark
    const textTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }, 920);

    // Stage 5: Minimum presentation timer
    const minTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minDurationMs);

    return () => {
      clearTimeout(pinTimer);
      clearTimeout(faceTimer);
      clearTimeout(textTimer);
      clearTimeout(minTimer);
    };
  }, [minDurationMs]);

  // Handle smooth exit transition
  useEffect(() => {
    if (minTimeElapsed && isReady && !hasFinished) {
      setHasFinished(true);

      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) {
          onFinish();
        }
      });
    }
  }, [minTimeElapsed, isReady, hasFinished, onFinish]);

  const bgColor = theme.colors.background;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          opacity: exitOpacity,
        },
      ]}
    >
      <View style={styles.centerStage}>
        {/* Converging Commuter Dots (meeting in center) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.dotsContainer,
            { opacity: dotsOpacity },
          ]}
        >
          {/* Left Commuter */}
          <Animated.View
            style={[
              styles.commuterDot,
              { transform: [{ translateX: leftDotX }] },
            ]}
          />
          {/* Right Commuter */}
          <Animated.View
            style={[
              styles.commuterDot,
              { transform: [{ translateX: rightDotX }] },
            ]}
          />
        </Animated.View>

        {/* The Clean Logo Container (No white square, no glow box) */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          {/* Layer 1: Pin Outline (shows first when dots meet) */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.layerCenter,
              {
                opacity: pinOpacity,
                transform: [
                  { scale: pinScale },
                  { translateY: pinTranslateY },
                ],
              },
            ]}
          >
            <Image
              source={require('../../../assets/logo-pin-outline.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Layer 2: The "Face" / Companions (emerges inside the pin after) */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.layerCenter,
              {
                opacity: faceOpacity,
                transform: [{ scale: faceScale }],
              },
            ]}
          >
            <Image
              source={require('../../../assets/logo-faces.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>
        </Animated.View>

        {/* Clean Brand Wordmark */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {APP_NAME}
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 180,
  },
  dotsContainer: {
    position: 'absolute',
    top: 36,
    width: 140,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  commuterDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0057FF',
    shadowColor: '#0057FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  cardContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  layerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 62,
    height: 62,
  },
  textContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 23,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
});
