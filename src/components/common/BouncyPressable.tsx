import React from 'react';
import {
  Pressable,
  PressableProps,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { haptics } from '@/utils/haptics';

export interface BouncyPressableProps extends PressableProps {
  children: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
  scaleTo?: number;
  hapticType?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection' | 'none';
  containerStyle?: StyleProp<ViewStyle>;
}

export default function BouncyPressable({
  children,
  style,
  scaleTo = 0.96,
  hapticType = 'light',
  containerStyle,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  ...props
}: BouncyPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = (e: any) => {
    if (!disabled) {
      scale.value = withSpring(scaleTo, { damping: 15, stiffness: 300 });
      if (hapticType !== 'none' && haptics[hapticType]) {
        haptics[hapticType]();
      }
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    if (!disabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
    onPressOut?.(e);
  };

  return (
    <Animated.View style={[animatedStyle, containerStyle]}>
      <Pressable
        style={(state) => [
          Platform.OS === 'web' && ({ cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none' } as any),
          typeof style === 'function' ? style(state) : style,
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={disabled}
        {...props}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
