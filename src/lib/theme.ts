/**
 * Sakura Zen Design System Tokens (Stitch Design Specification)
 * Serene, Organic Modernism, Luxury Kiosk Theme
 */

export const SAKURA_ZEN_TOKENS = {
  colors: {
    surface: '#FBF9F9', // Warm Petal White
    surfaceContainerLowest: '#FFFFFF', // Pure White Card
    surfaceContainerLow: '#F5F3F3', // Recessed Container
    surfaceContainer: '#EFEDED', // Border / Neutral Surface
    surfaceContainerHigh: '#E9E8E8',
    surfaceContainerHighest: '#E4E2E2',

    onSurface: '#1B1C1C', // Dark Text
    onSurfaceVariant: '#4F4448', // Muted Text

    primary: '#795465', // Sakura Dusty Rose Pink
    onPrimary: '#FFFFFF',
    primaryContainer: '#F8C8DC', // Soft Sakura Pink Container
    onPrimaryContainer: '#765162',
    primaryFixedDim: '#E9BACD',

    secondary: '#4E635A', // Sage Green
    onSecondary: '#FFFFFF',
    secondaryContainer: '#CEE5DA', // Soft Sage Green Container
    onSecondaryContainer: '#52675E',
    secondaryFixed: '#D1E8DD',

    tertiary: '#6F5A4F', // Branch Brown
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#ECCFC1',
    onTertiaryContainer: '#6D574C',

    error: '#BA1A1A', // Emergency Red
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#93000A',

    outline: '#817478',
    outlineVariant: '#D2C3C7',
    surfaceTint: '#795465',
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  shadows: {
    mainCard: '0px 20px 50px rgba(78, 59, 49, 0.05)',
    primaryButton: '0px 10px 30px rgba(121, 84, 101, 0.3)',
    header: '0px 4px 30px rgba(78, 59, 49, 0.03)',
  },
  rounded: {
    card: '2rem', // 32px
    inner: '1rem', // 16px
    button: '0.75rem', // 12px
    full: '9999px',
  },
};

// Legacy Theme Mapping for Tailwind Utility Classes
export const TOKUYO_THEME = {
  bgBase: 'bg-[#FBF9F9]',
  bgCard: 'bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(78,59,49,0.05)] border border-[#EFEDED]',
  textPrimary: 'text-[#1B1C1C]',
  textSecondary: 'text-[#4F4448]',
  brandOrange: 'text-[#795465]',
  brandOrangeBg: 'bg-[#795465]',
  brandOrangeBorder: 'border-[#795465]',
};
