import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle, ImageStyle, TextStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

export interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  variant?: 'full' | 'pin';
  showText?: boolean;
  showTagline?: boolean;
  textPosition?: 'right' | 'below';
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  textStyle?: TextStyle;
}

const SIZE_MAP = {
  xs: 28,
  sm: 40,
  md: 56,
  lg: 80,
  xl: 110,
};

export default function AppLogo({
  size = 'md',
  variant = 'full',
  showText = false,
  showTagline = false,
  textPosition = 'right',
  style,
  imageStyle,
  textStyle,
}: AppLogoProps) {
  const { theme } = useTheme();

  const numericSize = typeof size === 'number' ? size : SIZE_MAP[size] || 56;
  const logoSource = variant === 'pin'
    ? require('../../../assets/logo-pin.png')
    : require('../../../assets/icon.png');

  const containerDirection = textPosition === 'right' ? 'row' : 'column';
  const containerAlignment = textPosition === 'right' ? 'center' : 'center';

  return (
    <View
      style={[
        styles.container,
        { flexDirection: containerDirection, alignItems: containerAlignment },
        style,
      ]}
    >
      <Image
        source={logoSource}
        style={[
          {
            width: numericSize,
            height: numericSize,
            borderRadius: variant === 'full' ? Math.round(numericSize * 0.22) : 0,
            resizeMode: 'contain',
          },
          imageStyle,
        ]}
      />

      {showText && (
        <View
          style={[
            styles.textContainer,
            textPosition === 'right' ? { marginLeft: 12, alignItems: 'flex-start' } : { marginTop: 10, alignItems: 'center' },
          ]}
        >
          <Text
            style={[
              styles.appName,
              {
                color: theme.colors.text,
                fontSize: Math.max(16, Math.round(numericSize * 0.36)),
              },
              textStyle,
            ]}
          >
            {APP_NAME}
          </Text>
          {showTagline && (
            <Text
              style={[
                styles.tagline,
                {
                  color: theme.colors.textMuted,
                  fontSize: Math.max(11, Math.round(numericSize * 0.18)),
                },
              ]}
            >
              {APP_TAGLINE}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    justifyContent: 'center',
  },
  appName: {
    fontFamily: 'Outfit-Bold',
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
});
