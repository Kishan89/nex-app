import React from 'react';
import { Platform, ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
interface KeyboardWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  scrollEnabled?: boolean;
  extraScrollHeight?: number;
  extraHeight?: number;
  enableOnAndroid?: boolean;
  enableAutomaticScroll?: boolean;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  showsVerticalScrollIndicator?: boolean;
  enableResetScrollToCoords?: boolean;
}
/**
 * Global KeyboardWrapper component that handles keyboard behavior consistently
 * across all screens for all mobile devices (iOS and Android)
 */
export default function KeyboardWrapper({
  children,
  style,
  contentContainerStyle,
  scrollEnabled = true,
  extraScrollHeight,
  extraHeight,
  enableOnAndroid = true,
  enableAutomaticScroll = true,
  keyboardShouldPersistTaps = 'handled',
  showsVerticalScrollIndicator = false,
  enableResetScrollToCoords = false,
}: KeyboardWrapperProps) {
  const { colors } = useTheme();
  return (
    <KeyboardAwareScrollView
      style={[
        {
          flex: 1,
          backgroundColor: colors.background,
        },
        style,
      ]}
      contentContainerStyle={[
        {
          flexGrow: 1,
          backgroundColor: colors.background,
        },
        contentContainerStyle,
      ]}
      enableOnAndroid={enableOnAndroid}
      enableAutomaticScroll={enableAutomaticScroll}
      extraScrollHeight={extraScrollHeight ?? (Platform.OS === 'ios' ? 10 : 0)}
      extraHeight={extraHeight ?? (Platform.OS === 'android' ? 50 : 0)}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardOpeningTime={0}
      enableResetScrollToCoords={enableResetScrollToCoords}
      scrollEnabled={scrollEnabled}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      keyboardDismissMode="interactive"
      bounces={false}
      overScrollMode="never"
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
