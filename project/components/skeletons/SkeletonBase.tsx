import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, BorderRadius } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
export interface SkeletonBaseProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  animationType?: 'pulse' | 'wave' | 'shimmer';
  style?: any;
  children?: React.ReactNode;
}
export const SkeletonBase: React.FC<SkeletonBaseProps> = ({
  width = '100%',
  height = 20,
  borderRadius = BorderRadius.sm,
  animationType = 'pulse',
  style,
  children,
}) => {
  const { colors } = useTheme();
  return (
    <View 
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.backgroundTertiary,
          overflow: 'hidden',
        },
        style
      ]}
    >
      {children}
    </View>
  );
};
// Reusable skeleton components
export const SkeletonAvatar: React.FC<{ 
  size?: number; 
  style?: any;
  animationType?: 'pulse' | 'wave' | 'shimmer';
}> = ({ 
  size = 40, 
  style,
  animationType = 'pulse'
}) => (
  <SkeletonBase 
    width={size} 
    height={size} 
    borderRadius={size / 2} 
    animationType={animationType}
    style={style} 
  />
);
export const SkeletonText: React.FC<{ 
  width?: number | string; 
  height?: number; 
  style?: any;
  animationType?: 'pulse' | 'wave' | 'shimmer';
}> = ({ 
  width = '100%', 
  height = 16, 
  style,
  animationType = 'pulse'
}) => (
  <SkeletonBase 
    width={width} 
    height={height} 
    borderRadius={BorderRadius.sm} 
    animationType={animationType}
    style={style} 
  />
);
export const SkeletonButton: React.FC<{ 
  width?: number | string; 
  height?: number; 
  style?: any;
  animationType?: 'pulse' | 'wave' | 'shimmer';
}> = ({ 
  width = 100, 
  height = 40, 
  style,
  animationType = 'pulse'
}) => (
  <SkeletonBase 
    width={width} 
    height={height} 
    borderRadius={BorderRadius.lg} 
    animationType={animationType}
    style={style} 
  />
);
export const SkeletonImage: React.FC<{ 
  width?: number | string; 
  height?: number; 
  borderRadius?: number; 
  style?: any;
  animationType?: 'pulse' | 'wave' | 'shimmer';
}> = ({ 
  width = '100%', 
  height = 200, 
  borderRadius = BorderRadius.lg, 
  style,
  animationType = 'pulse'
}) => (
  <SkeletonBase 
    width={width} 
    height={height} 
    borderRadius={borderRadius} 
    animationType={animationType}
    style={style} 
  />
);
