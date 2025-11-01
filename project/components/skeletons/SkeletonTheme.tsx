import React, { createContext, useContext, ReactNode } from 'react';
import { useTheme } from '../../context/ThemeContext';
export interface SkeletonTheme {
  colors: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  borderRadius: {
    small: number;
    medium: number;
    large: number;
    round: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}
const defaultTheme: SkeletonTheme = {
  colors: {
    primary: '#1a1a1a',
    secondary: '#2a2a2a',
    tertiary: '#3a3a3a',
  },
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
    round: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
};
// Light theme variant
export const lightSkeletonTheme: SkeletonTheme = {
  ...defaultTheme,
  colors: {
    primary: '#f0f0f0',
    secondary: '#e0e0e0',
    tertiary: '#d0d0d0',
  },
};
// High contrast theme
export const highContrastSkeletonTheme: SkeletonTheme = {
  ...defaultTheme,
  colors: {
    primary: '#000000',
    secondary: '#333333',
    tertiary: '#666666',
  },
};
// Fast animation theme
export const fastSkeletonTheme: SkeletonTheme = {
  ...defaultTheme,
  colors: {
    primary: '#2a2a2a',
    secondary: '#3a3a3a',
    tertiary: '#4a4a4a',
  },
};
// Slow animation theme
export const slowSkeletonTheme: SkeletonTheme = {
  ...defaultTheme,
  colors: {
    primary: '#1a1a1a',
    secondary: '#2a2a2a',
    tertiary: '#3a3a3a',
  },
};
const SkeletonThemeContext = createContext<SkeletonTheme>(defaultTheme);
interface SkeletonThemeProviderProps {
  theme?: SkeletonTheme;
  children: ReactNode;
}
export const SkeletonThemeProvider: React.FC<SkeletonThemeProviderProps> = ({
  theme = defaultTheme,
  children,
}) => {
  return (
    <SkeletonThemeContext.Provider value={theme}>
      {children}
    </SkeletonThemeContext.Provider>
  );
};
export const useSkeletonTheme = (): SkeletonTheme => {
  const context = useContext(SkeletonThemeContext);
  const { colors, isDark } = useTheme();
  if (!context) {
    // Return theme-aware skeleton colors
    return {
      ...defaultTheme,
      colors: {
        primary: colors.backgroundTertiary,
        secondary: colors.backgroundSecondary,
        tertiary: colors.backgroundQuaternary,
      }
    };
  }
  return context;
};
// Hook to get themed skeleton props (simplified)
export const useThemedSkeletonProps = () => {
  const theme = useSkeletonTheme();
  return {
    colors: [theme.colors.primary, theme.colors.secondary, theme.colors.primary] as const,
    borderRadius: theme.borderRadius,
    spacing: theme.spacing,
  };
};
