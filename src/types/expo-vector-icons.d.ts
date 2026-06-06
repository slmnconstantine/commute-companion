declare module '@expo/vector-icons' {
  import { ComponentType } from 'react';
  import { TextProps, ColorValue } from 'react-native';

  interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string | ColorValue;
    style?: any;
  }

  export const Ionicons: ComponentType<IconProps>;
  export const MaterialIcons: ComponentType<IconProps>;
  export const MaterialCommunityIcons: ComponentType<IconProps>;
  export const FontAwesome: ComponentType<IconProps>;
  export const FontAwesome5: ComponentType<IconProps>;
  export const Feather: ComponentType<IconProps>;
  export const AntDesign: ComponentType<IconProps>;
  export const Entypo: ComponentType<IconProps>;
}
