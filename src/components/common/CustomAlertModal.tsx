import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  AlertButton,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export interface CustomAlertModalProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  type?: 'error' | 'success' | 'warning' | 'info';
  onClose: () => void;
}

export default function CustomAlertModal({
  visible,
  title,
  message,
  buttons = [{ text: 'OK', style: 'default' }],
  type = 'info',
  onClose,
}: CustomAlertModalProps) {
  const { theme, mode } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(
        type === 'error'
          ? Haptics.NotificationFeedbackType.Error
          : type === 'success'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 45,
          bounciness: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  // Determine colors and icon based on alert type
  let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'information-circle';
  let badgeColor = theme.colors.primary || '#3B82F6';

  if (type === 'error') {
    iconName = 'alert-circle';
    badgeColor = theme.colors.error || '#EF4444';
  } else if (type === 'success') {
    iconName = 'checkmark-circle';
    badgeColor = theme.colors.success || '#10B981';
  } else if (type === 'warning') {
    iconName = 'warning';
    badgeColor = '#F59E0B';
  }

  const handleButtonPress = (btn?: AlertButton) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    if (btn && btn.onPress) {
      btn.onPress();
    }
  };

  const activeButtons: AlertButton[] = buttons && buttons.length > 0 ? buttons : [{ text: 'OK', style: 'default' }];
  const isVerticalStack = activeButtons.length > 2 || activeButtons.some(b => (b.text || '').length > 12);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: opacityAnim },
          ]}
        />
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: mode === 'dark' ? '#1A2235' : '#FFFFFF',
              borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : '#E8E6DF',
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Header Icon Badge */}
          <View style={[styles.iconCircle, { backgroundColor: `${badgeColor}18` }]}>
            <Ionicons name={iconName} size={36} color={badgeColor} />
          </View>

          {/* Title & Message */}
          <Text style={[styles.title, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
            {title}
          </Text>
          {message ? (
            <Text style={[styles.message, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
              {message}
            </Text>
          ) : null}

          {/* Action Buttons */}
          <View
            style={[
              styles.buttonsContainer,
              !isVerticalStack && activeButtons.length === 2 && styles.multiButtonsRow,
            ]}
          >
            {activeButtons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';

              let btnBg = theme.colors.primary;
              let textColor = '#FFFFFF';
              let borderWidth = 0;
              let borderColor = 'transparent';

              if (isCancel) {
                btnBg = mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#F0EFEA';
                textColor = mode === 'dark' ? '#94A3B8' : '#475569';
                borderWidth = mode === 'dark' ? 0 : 1;
                borderColor = mode === 'dark' ? 'transparent' : '#E8E6DF';
              } else if (isDestructive) {
                btnBg = theme.colors.error || '#EF4444';
                textColor = '#FFFFFF';
              }

              return (
                <Pressable
                  key={index.toString()}
                  style={({ pressed }) => [
                    styles.button,
                    !isVerticalStack && activeButtons.length === 2 ? { flex: 1 } : { width: '100%' },
                    { backgroundColor: btnBg, borderWidth, borderColor },
                    !isCancel && !isDestructive && styles.primaryButtonShadow,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                  ]}
                  onPress={() => handleButtonPress(btn)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: textColor, fontFamily: isCancel ? 'Inter-Medium' : 'Inter-SemiBold' },
                    ]}
                    numberOfLines={1}
                  >
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  card: {
    width: Math.min(width - 48, 360),
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  buttonsContainer: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  multiButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonShadow: {
    shadowColor: '#0057FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 15,
    textAlign: 'center',
  },
});
