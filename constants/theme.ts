// PATH Design System — Black-first, Whisper-Lavender Palette
// Practice-admin operating system for self-employed therapists. Near-black
// surfaces with a hidden purple undertone; lavender is almost imperceptible —
// used only for small accents, highlights and focus. Never overtly purple.
//
// RULE: black first, purple second. Calm, confidential, quiet.
export const Colors = {
  // Surfaces — near-black with a hidden purple undertone
  bg: '#0F0F10',
  surface: '#141216',
  surfaceAlt: '#17131E',   // the hidden purple undertone
  card: '#1A181E',
  cardAlt: '#242430',      // toward dark slate
  slate: '#353640',        // dark slate — elevated inputs / dividers
  border: '#2B2B31',       // soft graphite
  borderSubtle: '#211F26',

  // Brand — accent lavender (whisper only)
  primary: '#7B6C91',
  primaryLight: '#9A8CB0',
  primaryDim: '#1C1722',   // very dark lavender-tinted fill for chips/cards
  primaryGlow: '#A796BE',

  // Off-white wordmark text (matches the logo)
  logoText: '#F2F0EC',

  // Text
  textPrimary: '#F2F0EC',
  textSecondary: '#A7A6B0',
  textMuted: '#6D7284',    // secondary text
  textInverse: '#F5F3EF',  // text sitting on the lavender primary

  // Semantic — muted, never louder than the lavender
  success: '#5B8A6F',
  successDim: '#15211A',
  warning: '#B79A6A',
  warningDim: '#221C13',
  error: '#B56A6A',
  errorDim: '#241618',
  info: '#6E7597',
  infoDim: '#181925',

  // Tabs & Nav
  tabActive: '#A796BE',
  tabInactive: '#5A5A64',
  tabBg: '#0F0F10',

  // Financial (Tax Pot)
  income: '#5B8A6F',
  expense: '#B56A6A',
  taxPot: '#7B6C91',
};

export const Typography = {
  // Brand / Headings — quiet, tight, considered
  brandXL: { fontSize: 32, fontWeight: '700' as const, color: Colors.textPrimary, letterSpacing: 0.5 },
  brandLG: { fontSize: 26, fontWeight: '700' as const, color: Colors.textPrimary, letterSpacing: 0.4 },
  brandMD: { fontSize: 21, fontWeight: '700' as const, color: Colors.textPrimary, letterSpacing: 0.2 },
  brandSM: { fontSize: 17, fontWeight: '600' as const, color: Colors.textPrimary, letterSpacing: 0.2 },

  // Utility
  labelXS: { fontSize: 10, fontWeight: '600' as const, color: Colors.textMuted, letterSpacing: 1.4, textTransform: 'uppercase' as const },
  labelSM: { fontSize: 12, fontWeight: '500' as const, color: Colors.textSecondary, letterSpacing: 0.6 },
  labelMD: { fontSize: 14, fontWeight: '500' as const, color: Colors.textSecondary },
  bodyMD: { fontSize: 15, fontWeight: '400' as const, color: Colors.textPrimary, lineHeight: 22 },
  bodySM: { fontSize: 13, fontWeight: '400' as const, color: Colors.textSecondary, lineHeight: 19 },
  dataMD: { fontSize: 15, fontWeight: '600' as const, color: Colors.textPrimary },
  dataLG: { fontSize: 22, fontWeight: '700' as const, color: Colors.textPrimary, letterSpacing: 0.2 },
  dataXL: { fontSize: 32, fontWeight: '700' as const, color: Colors.textPrimary, letterSpacing: 0.3 },
  btnMD: { fontSize: 15, fontWeight: '600' as const },
  btnSM: { fontSize: 13, fontWeight: '600' as const },
  headingMD: { fontSize: 18, fontWeight: '600' as const, color: Colors.textPrimary, letterSpacing: 0.2 },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 100,
};

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 16,
  },
};
