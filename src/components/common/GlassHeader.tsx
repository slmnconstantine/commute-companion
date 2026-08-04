import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import BouncyPressable from './BouncyPressable';

export interface GlassHeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export default function GlassHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  style,
}: GlassHeaderProps) {
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }, style]}>
      <View
        style={[
          styles.content,
          {
            borderBottomColor: theme.colors.border,
            backgroundColor: isDark ? 'rgba(17, 24, 39, 0.85)' : 'rgba(255, 255, 255, 0.90)',
          },
        ]}
      >
        <View style={styles.leftRow}>
          {onBack && (
            <BouncyPressable
              onPress={onBack}
              hapticType="light"
              style={[
                styles.backBtn,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
            </BouncyPressable>
          )}

          {(title || subtitle) && (
            <View style={styles.titleCol}>
              {title && (
                <Text
                  style={[
                    styles.title,
                    { color: theme.colors.text, fontFamily: 'Inter-SemiBold' },
                  ]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text
                  style={[
                    styles.subtitle,
                    { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' },
                  ]}
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              )}
            </View>
          )}
        </View>

        {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    zIndex: 100,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
  },
  title: {
    fontSize: 18,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  rightAction: {
    marginLeft: 12,
  },
});
