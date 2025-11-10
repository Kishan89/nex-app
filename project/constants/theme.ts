// Legacy Colors export for backward compatibility
// Use useTheme() hook for dynamic theme-aware colors
export const Colors = {
  // Primary colors - Premium purple accent
  primary: '#e385ec',
  primaryDark: '#c060c8',
  primaryLight: '#f0a5f4',
  primaryAlpha: 'rgba(227, 133, 236, 0.1)',
  // Secondary colors
  secondary: '#6a00f4',
  secondaryDark: '#5500cc',
  // Background colors - Pure black to dark grey hierarchy (Dark theme default)
  background: '#000000',           // Pure black for main background
  backgroundSecondary: '#121212',  // Dark grey for cards/containers
  backgroundTertiary: '#1e1e1e',   // Slightly lighter for elevated elements
  backgroundQuaternary: '#2a2a2a', // Lightest dark for inputs/buttons
  // Surface colors for different elevations
  surface: '#121212',
  surfaceElevated: '#1e1e1e',
  surfaceHighlight: '#2a2a2a',
  // Text colors - High contrast for readability
  text: '#ffffff',           // Pure white for primary text
  textSecondary: '#e0e0e0',  // Light grey for secondary text
  textMuted: '#9e9e9e',      // Medium grey for muted text
  textDisabled: '#666666',   // Dark grey for disabled text
  textPlaceholder: '#757575', // Placeholder text
  // Border colors
  border: '#333333',
  borderLight: '#444444',
  borderFocus: '#e385ec',
  borderError: '#ff4444',
  // Status colors
  success: '#4caf50',
  error: '#f44336',
  warning: '#ff9800',
  info: '#4A9EFF',
  // Social interaction colors
  like: '#e385ec',      // Purple for likes
  repost: '#4caf50',    // Green for reposts
  bookmark: '#3B8FE8',  // Blue for bookmarks
  comment: '#e385ec',   // Purple for comments
  // Gradient colors
  gradientStart: '#6a00f4',
  gradientEnd: '#e385ec',
  // Additional utility colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.8)',
  // Notification colors
  notificationBackground: '#1e1e1e',
  notificationBorder: '#333333',
};
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 50,
};
export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};
export const FontWeights = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};
export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
};
export const Layout = {
  headerHeight: 60,
  tabBarHeight: 80,
  containerPadding: Spacing.md,
  screenPadding: Spacing.lg,
  maxContentWidth: 600,
  minTouchTarget: 44,
};
// Component-specific styles
export const ComponentStyles = {
  button: {
    height: 48,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  modal: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  avatar: {
    small: 32,
    medium: 40,
    large: 56,
    xlarge: 80,
  },
};
// Complete theme object
export const Theme = {
  colors: Colors,
  spacing: Spacing,
  borderRadius: BorderRadius,
  fontSize: FontSizes,
  fontWeight: FontWeights,
  shadows: Shadows,
  layout: Layout,
  components: ComponentStyles,
  // Dark theme specific styles
  dark: {
    statusBar: 'light-content' as const,
    navigationBar: Colors.background,
    keyboardAppearance: 'dark' as const,
  },
};
// Theme utility functions
export const getThemeStyles = (isDark: boolean) => ({
  statusBar: isDark ? 'light-content' as const : 'dark-content' as const,
  navigationBar: isDark ? '#000000' : '#ffffff',
  keyboardAppearance: isDark ? 'dark' as const : 'light' as const,
});
// Common transition styles for smooth theme changes
export const transitionStyles = {
  colors: {
    transition: 'all 0.3s ease-in-out',
  },
};
