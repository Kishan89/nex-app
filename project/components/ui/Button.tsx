import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}
export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const { colors } = useTheme();
  const buttonStyles = [
    styles.button,
    styles[size],
    disabled && styles.disabled,
    style,
  ];
  const getTextColor = () => {
    if (variant === 'primary') {
      return '#ffffff'; // Always white text on gradient backgrounds
    }
    return colors.text;
  };
  const textStyles = [
    styles.text,
    styles[`${size}Text`],
    { color: getTextColor() },
    textStyle,
  ];
  const handlePress = () => {
    if (!disabled && !loading) {
      onPress();
    }
  };
  const content = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </>
  );
  if (variant === 'primary') {
    return (
      <TouchableOpacity style={buttonStyles} onPress={handlePress} activeOpacity={0.8}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          style={[styles.gradient, styles[size]]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: colors.backgroundSecondary,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.primary,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      default:
        return {};
    }
  };
  return (
    <TouchableOpacity
      style={[buttonStyles, getVariantStyles()]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {content}
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
  },
  // Sizes
  small: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 44,
  },
  large: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    minHeight: 52,
  },
  // States
  disabled: {
    opacity: 0.5,
  },
  // Text styles
  text: {
    fontWeight: FontWeights.semibold,
    textAlign: 'center',
  },
  smallText: {
    fontSize: FontSizes.sm,
  },
  mediumText: {
    fontSize: FontSizes.md,
  },
  largeText: {
    fontSize: FontSizes.lg,
  },
});
