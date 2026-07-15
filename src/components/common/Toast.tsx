/**
 * Toast Notification System
 *
 * Provides a ToastProvider and useToast() hook for showing
 * animated slide-down toast notifications instead of Alert.alert().
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, Easing } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastData {
  id: number;
  variant: ToastVariant;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (variant: ToastVariant, title: string, message?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>');
  }
  return ctx;
}

const VARIANT_CONFIG: Record<ToastVariant, { icon: string; colorKey: string; haptic: any }> = {
  success: { icon: 'checkmark-circle', colorKey: 'success', haptic: Haptics.NotificationFeedbackType.Success },
  error: { icon: 'close-circle', colorKey: 'error', haptic: Haptics.NotificationFeedbackType.Error },
  info: { icon: 'information-circle', colorKey: 'info', haptic: Haptics.NotificationFeedbackType.Warning },
  warning: { icon: 'warning', colorKey: 'warning', haptic: Haptics.NotificationFeedbackType.Warning },
};

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: number) => void }) {
  const { theme, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  const config = VARIANT_CONFIG[toast.variant];
  const accentColor = (theme.colors as any)[config.colorKey];

  const dismiss = useCallback(() => {
    translateY.value = withTiming(-100, { duration: 250, easing: Easing.in(Easing.cubic) });
    opacity.value = withTiming(0, { duration: 250, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) {
        runOnJS(onDismiss)(toast.id);
      }
    });
  }, [onDismiss, toast.id]);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 15, stiffness: 300, mass: 0.5 });
    opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });

    const timer = setTimeout(() => {
      dismiss();
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [dismiss, toast.duration]);

  const pan = Gesture.Pan()
    .onChange((event) => {
      if (event.translationY < 0) {
        translateY.value = event.translationY;
      } else {
        // Rubber banding when dragging down
        translateY.value = event.translationY * 0.2;
      }
    })
    .onEnd((event) => {
      if (event.translationY < -20 || event.velocityY < -500) {
        runOnJS(dismiss)();
      } else {
        translateY.value = withSpring(0, { damping: 15, stiffness: 300 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.toastContainer,
          animatedStyle,
          { top: insets.top + 8 },
        ]}
      >
        <Pressable onPress={dismiss} style={styles.toastPressable}>
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint={mode === 'dark' ? 'dark' : 'light'}
              style={[styles.toastContent, { borderColor: `${accentColor}30` }]}
            >
              <ToastInner theme={theme} accentColor={accentColor} config={config} toast={toast} />
            </BlurView>
          ) : (
            <View
              style={[
                styles.toastContent,
                {
                  backgroundColor: mode === 'dark' ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  borderColor: `${accentColor}30`,
                },
              ]}
            >
              <ToastInner theme={theme} accentColor={accentColor} config={config} toast={toast} />
            </View>
          )}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

function ToastInner({ theme, accentColor, config, toast }: any) {
  return (
    <>
      <View style={[styles.iconWrap, { backgroundColor: `${accentColor}15` }]}>
        <Ionicons name={config.icon as any} size={22} color={accentColor} />
      </View>
      <View style={styles.textWrap}>
        <Text
          style={[styles.title, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}
          numberOfLines={1}
        >
          {toast.title}
        </Text>
        {toast.message ? (
          <Text
            style={[styles.message, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}
            numberOfLines={2}
          >
            {toast.message}
          </Text>
        ) : null}
      </View>
    </>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const idCounter = useRef(0);

  const showToast = useCallback((variant: ToastVariant, title: string, message?: string, duration?: number) => {
    const id = ++idCounter.current;
    const config = VARIANT_CONFIG[variant];
    Haptics.notificationAsync(config.haptic);
    setToasts(prev => [...prev, { id, variant, title, message, duration }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  toastPressable: {
    width: '100%',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
});
