/**
 * TRENDVOLT — Design System Tokens
 *
 * Single source of truth for the warm earthy luxury editorial palette.
 */

export const THEME_COLORS = {
  // Surface & Canvas (Warm Earthy Palette)
  background: '#F5F0E8',
  backgroundSecondary: '#EEE7DC',
  surface: '#FFFDF8',
  surfaceElevated: '#FAF7F0',

  // Typography
  textPrimary: '#1F211C',
  textSecondary: '#5F6057',
  textMuted: '#85857A',

  // Borders & Dividers
  border: '#DED7CA',
  borderSubtle: 'rgba(52, 69, 47, 0.08)',
  borderActive: 'rgba(52, 69, 47, 0.25)',

  // Primary Brand: Deep Olive Green
  brandPrimary: '#34452F',
  brandPrimaryHover: '#263722',
  softOlive: '#66745B',

  // Secondary Brand / Accent: Muted Terracotta / Rust
  accent: '#A65332',
  accentHover: '#8F452B',
  softTerracotta: '#C47A5C',

  // Semantic Feedback
  success: '#3F6B45',
  error: '#B7473A',
  warning: '#A86B2D',
}

export const THEME_BREAKPOINTS = {
  mobileSm: 375,
  mobileMd: 390,
  mobileLg: 430,
  tablet: 768,
  desktop: 1024,
  desktopWide: 1280,
  desktopUltra: 1440,
}

export const THEME_MOTION = {
  durationFast: '150ms',
  durationNormal: '250ms',
  durationSlow: '350ms',
  easeEditorial: 'cubic-bezier(0.16, 1, 0.3, 1)',
}
