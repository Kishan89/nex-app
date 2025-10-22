import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, FontSizes, FontWeights } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
}
export default function Avatar({
  uri,
  name,
  size = 40,
  showOnlineStatus = false,
  isOnline = false,
}: AvatarProps) {
  const { colors } = useTheme();
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };
  const textStyle = {
    fontSize: size * 0.3,
  };
  return (
    <View style={[styles.container, containerStyle]}>
      {uri ? (
        <Image source={{ uri }} style={[styles.image, containerStyle, { backgroundColor: colors.backgroundSecondary }]} />
      ) : (
        <View style={[styles.placeholder, containerStyle, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.placeholderText, textStyle, { color: colors.text }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}
      {showOnlineStatus && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: size * 0.25,
              height: size * 0.25,
              borderRadius: (size * 0.25) / 2,
              bottom: size * 0.05,
              right: size * 0.05,
              borderColor: colors.background,
              backgroundColor: isOnline ? colors.success : colors.textMuted,
            },
          ]}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    // backgroundColor handled dynamically
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontWeight: FontWeights.semibold,
  },
  onlineIndicator: {
    position: 'absolute',
    borderWidth: 2,
  },
});
