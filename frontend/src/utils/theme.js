/**
 * BBEMS Design System
 * Professional white & blue palette with distinctive typography
 */

export const COLORS = {
  // Core blues
  primaryBlue: '#1A56DB',
  deepBlue: '#0F3460',
  lightBlue: '#3B82F6',
  skyBlue: '#DBEAFE',
  accentBlue: '#60A5FA',
  glowBlue: 'rgba(59, 130, 246, 0.15)',

  // Whites & grays
  white: '#FFFFFF',
  offWhite: '#F8FAFF',
  lightGray: '#F1F5F9',
  borderGray: '#E2E8F0',
  textMuted: '#94A3B8',
  textSecondary: '#64748B',
  textPrimary: '#1E293B',

  // Dark tones (for dark UI elements)
  darkBg: '#0A1628',
  darkCard: '#0F2040',
  drawerBg: '#071120',
  darkBorder: '#1A3150',

  // Status colors
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.1)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.1)',
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.1)',
  pending: '#8B5CF6',
  pendingBg: 'rgba(139, 92, 246, 0.1)',

  // Overlays
  overlay: 'rgba(10, 22, 40, 0.85)',
  cardShadow: 'rgba(26, 86, 219, 0.08)',
};

export const FONTS = {
  // Display — Gloock from Google Fonts (or fallback to serif)
  display: {
    regular: 'Gloock',
    bold: 'Gloock',
  },
  // Branding — Space Mono from Google Fonts
  branding: {
    regular: 'Space Mono',
    bold: 'Space Mono',
  },
  // Body — clean geometric sans
  body: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  // Mono — for hashes and IDs
  mono: {
    regular: 'monospace',
  }
};

// Google Fonts import (for web use @font-face)
export const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Gloock&family=Space+Mono:wght@400;700&display=swap';

export const TYPOGRAPHY = {
  hero: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5, lineHeight: 42 },
  h1: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.2, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600', letterSpacing: 0, lineHeight: 24 },
  h4: { fontSize: 15, fontWeight: '600', letterSpacing: 0.1, lineHeight: 20 },
  body: { fontSize: 14, fontWeight: '400', letterSpacing: 0.1, lineHeight: 20 },
  bodyMed: { fontSize: 14, fontWeight: '500', letterSpacing: 0.1, lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400', letterSpacing: 0.2, lineHeight: 16 },
  smallBold: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, lineHeight: 16 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, lineHeight: 14 },
  mono: { fontSize: 12, fontFamily: 'monospace', letterSpacing: 0.5, lineHeight: 18 },
};

export const SPACING = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48
};

export const RADIUS = {
  sm: 6, md: 12, lg: 16, xl: 24, full: 999
};

export const SHADOWS = {
  card: {
    shadowColor: COLORS.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: COLORS.primaryBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  }
};

// Evidence type configuration
export const EVIDENCE_TYPES = [
  { value: 'image', label: 'Image', icon: 'image', color: '#3B82F6' },
  { value: 'video', label: 'Video', icon: 'videocam', color: '#8B5CF6' },
  { value: 'document', label: 'Document', icon: 'document-text', color: '#10B981' },
  { value: 'forensic', label: 'Forensic', icon: 'flask', color: '#F59E0B' },
  { value: 'audio', label: 'Audio', icon: 'mic', color: '#EF4444' },
  { value: 'gps', label: 'GPS Data', icon: 'location', color: '#06B6D4' },
];

export const STATUS_CONFIG = {
  confirmed: { label: 'Confirmed', color: COLORS.success, bg: COLORS.successBg, icon: 'checkmark-circle' },
  pending: { label: 'Pending', color: COLORS.pending, bg: COLORS.pendingBg, icon: 'time' },
  failed: { label: 'Failed', color: COLORS.error, bg: COLORS.errorBg, icon: 'close-circle' },
};
