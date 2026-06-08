/**
 * Typography scale for Commutable Companion
 *
 * Uses the Inter font family across all weights.
 * Each level defines fontSize, fontFamily, and lineHeight.
 */

export const typography = {
  /** Hero / splash text — 32px Outfit-Bold */
  display: {
    fontSize: 32,
    fontFamily: 'Outfit-Bold',
    lineHeight: 40,
  },
  /** Screen headings — 24px Outfit-SemiBold */
  heading: {
    fontSize: 24,
    fontFamily: 'Outfit-SemiBold',
    lineHeight: 32,
  },
  /** Section titles — 20px Outfit-SemiBold */
  title: {
    fontSize: 20,
    fontFamily: 'Outfit-SemiBold',
    lineHeight: 28,
  },
  /** Card / list subtitles — 18px Inter-Medium */
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    lineHeight: 26,
  },
  /** Default body copy — 16px Inter-Regular */
  body: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  /** Secondary / supporting text — 14px Inter-Regular */
  caption: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  /** Labels, badges, timestamps — 12px Inter-Regular */
  small: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    lineHeight: 16,
  },
} as const;

export type Typography = typeof typography;
