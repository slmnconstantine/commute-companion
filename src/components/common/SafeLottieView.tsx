import React, { Component, ReactNode, useState } from 'react';
import { View, UIManager, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface SafeLottieViewProps {
  source: any;
  autoPlay?: boolean;
  loop?: boolean;
  style?: any;
  fallbackIcon?: React.ComponentProps<typeof Ionicons>['name'];
  fallbackColor?: string;
}

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class LottieErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn('LottieView render error, falling back:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default function SafeLottieView({
  source,
  autoPlay = true,
  loop = true,
  style,
  fallbackIcon = 'sparkles',
  fallbackColor,
}: SafeLottieViewProps) {
  const { theme } = useTheme();
  const [hasFailed, setHasFailed] = useState(false);

  // Check if native Lottie view manager is registered in the current runtime environment
  const isLottieNativeAvailable =
    !!UIManager.getViewManagerConfig?.('LottieAnimationView') ||
    !!(UIManager as any).getConstants?.()?.ViewManagerNames?.includes?.('LottieAnimationView');

  const flattenedStyle = StyleSheet.flatten(style) || {};
  const widthVal = typeof flattenedStyle.width === 'number' ? flattenedStyle.width : 40;
  const heightVal = typeof flattenedStyle.height === 'number' ? flattenedStyle.height : 40;
  const iconSize = Math.max(16, Math.min(widthVal * 0.75, heightVal * 0.75, 120));
  const activeColor = fallbackColor || theme.colors.primary;

  const fallbackElement = (
    <View style={[styles.fallbackContainer, { width: widthVal, height: heightVal }, style]}>
      <Ionicons
        name={fallbackIcon}
        size={iconSize}
        color={activeColor}
      />
    </View>
  );

  if (!isLottieNativeAvailable || hasFailed || !source) {
    return fallbackElement;
  }

  return (
    <LottieErrorBoundary fallback={fallbackElement}>
      <LottieView
        source={source}
        autoPlay={autoPlay}
        loop={loop}
        style={style}
        onAnimationFailure={() => setHasFailed(true)}
      />
    </LottieErrorBoundary>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
