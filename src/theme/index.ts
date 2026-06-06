/**
 * Unified theme barrel export
 *
 * Combines colors, typography, and spacing into cohesive
 * `lightTheme` and `darkTheme` objects consumed by ThemeContext.
 */

export { lightColors, darkColors } from './colors';
export type { Colors } from './colors';

export { typography } from './typography';
export type { Typography } from './typography';

export { spacing, borderRadius } from './spacing';
export type { Spacing, BorderRadius } from './spacing';

import { lightColors, darkColors, type Colors } from './colors';
import { typography, type Typography } from './typography';
import { spacing, borderRadius, type Spacing, type BorderRadius } from './spacing';

/** Shape of the full theme object available via `useTheme()` */
export interface Theme {
  colors: Colors;
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadius;
}

export const lightTheme: Theme = {
  colors: lightColors,
  typography,
  spacing,
  borderRadius,
};

export const darkTheme: Theme = {
  colors: darkColors,
  typography,
  spacing,
  borderRadius,
};
