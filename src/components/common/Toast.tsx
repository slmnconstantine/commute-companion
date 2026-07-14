/**
 * Toast Notification System
 *
 * Provides a ToastProvider and useToast() hook for showing
 * animated slide-down toast notifications instead of Alert.alert().
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Platform } from 'react-native';
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
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const config = VARIANT_CONFIG[toast.variant];
  const accentColor = (theme.colors as any)[config.colorKey];

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    const timer = setTimeout(() => {
      dismiss();
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(toast.id));
  };

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          transform: [{ translateY }],
          opacity,
          top: insets.top + 8,
        },
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
