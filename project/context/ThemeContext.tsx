import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';
export type ThemeMode = 'light' | 'dark' | 'auto';
interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  colors: typeof lightColors | typeof darkColors;
}
// Light theme colors
const lightColors = {
  // Primary colors - Premium purple accent (same for both themes)
  primary: '#e385ec',
  primaryDark: '#c060c8',
  primaryLight: '#f0a5f4',
  primaryAlpha: 'rgba(227, 133, 236, 0.1)',
  // Secondary colors
  secondary: '#6a00f4',
  secondaryDark: '#5500cc',
  // Background colors - Light theme
  background: '#ffffff',           // Pure white for main background
  backgroundSecondary: '#f8f9fa',  // Light grey for cards/containers
  backgroundTertiary: '#f1f3f4',   // Slightly darker for elevated elements
  backgroundQuaternary: '#e8eaed', // Darker for inputs/buttons
  // Surface colors for different elevations
  surface: '#ffffff',
  surfaceElevated: '#f8f9fa',
  surfaceHighlight: '#f1f3f4',
  // Text colors - High contrast for readability
  text: '#1a1a1a',           // Dark text for primary text
  textSecondary: '#3c4043',  // Darker grey for secondary text (better contrast)
  textMuted: '#5f6368',      // Medium grey for muted text (darker than before)
  textDisabled: '#9aa0a6',   // Medium grey for disabled text (darker than before)
  textPlaceholder: '#80868b', // Darker placeholder text (better visibility)
  // Border colors
  border: '#e8eaed',
  borderLight: '#f1f3f4',
  borderFocus: '#e385ec',
  borderError: '#d93025',
  // Status colors
  success: '#137333',
  error: '#d93025',
  warning: '#ea8600',
  info: '#1967d2',
  // Social interaction colors
  like: '#e385ec',      // Purple for likes
  repost: '#137333',    // Green for reposts
  bookmark: '#1967d2',  // Blue for bookmarks
  comment: '#e385ec',   // Purple for comments
  // Gradient colors
  gradientStart: '#6a00f4',
  gradientEnd: '#e385ec',
  // Additional utility colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.8)',
  // Notification colors
  notificationBackground: '#f8f9fa',
  notificationBorder: '#e8eaed',
};
// Dark theme colors (existing)
const darkColors = {
  // Primary colors - Premium purple accent
  primary: '#e385ec',
  primaryDark: '#c060c8',
  primaryLight: '#f0a5f4',
  primaryAlpha: 'rgba(227, 133, 236, 0.1)',
  // Secondary colors
  secondary: '#6a00f4',
  secondaryDark: '#5500cc',
  // Background colors - Pure black to dark grey hierarchy
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
  info: '#2196f3',
  // Social interaction colors
  like: '#e385ec',      // Purple for likes
  repost: '#4caf50',    // Green for reposts
  bookmark: '#004aad',  // Blue for bookmarks
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
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_STORAGE_KEY = '@nexeed_theme_mode';
interface ThemeProviderProps {
  children: ReactNode;
}
export function ThemeProvider({ children }: ThemeProviderProps) {
  // Get initial system theme immediately
  const initialSystemTheme = Appearance.getColorScheme();
  // Try to get saved theme synchronously on first load
  const getSavedThemeSync = (): ThemeMode => {
    try {
      // This is a fallback - AsyncStorage is async, but we need immediate theme
      return 'auto'; // Default to auto to respect system theme
    } catch {
      return 'auto';
    }
  };
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getSavedThemeSync());
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    initialSystemTheme
  );
  // Determine if current theme should be dark
  const isDark = themeMode === 'dark' || (themeMode === 'auto' && systemColorScheme === 'dark');
  // Get current colors based on theme
  const colors = isDark ? darkColors : lightColors;
  // Load saved theme preference on app start
  useEffect(() => {
    loadThemePreference();
  }, []);
  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });
    return () => subscription?.remove();
  }, []);
  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        setThemeModeState(savedTheme as ThemeMode);
      }
    } catch (error) {
      }
  };
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      }
  };
  const value: ThemeContextType = {
    themeMode,
    isDark,
    setThemeMode,
    colors,
  };
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
// Export theme colors for backward compatibility
export { lightColors, darkColors };
