// app/(tabs)/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Home, Bell, MessageCircle, Settings, Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { View, StatusBar, StyleSheet, Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';
import { Colors, FontSizes, FontWeights } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useChatContext } from '@/context/ChatContext';
import { useNotificationCount } from '@/context/NotificationCountContext';
const TabBarIcon = ({ focused, children, badge, colors }: { focused: boolean; children: React.ReactNode; badge?: number; colors: any }) => (
  <View style={styles.tabIconContainer}>
   
    {children}
    {badge && badge > 0 && (
      <View style={[styles.unreadDot, { backgroundColor: colors.error, borderColor: colors.background }]} />
    )}
  </View>
);
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { totalUnreadCount } = useChatContext();
  const { unreadNotificationCount } = useNotificationCount();
  // Redirect to login if not authenticated
  if (!user) {
    return <Redirect href="/login" />;
  }
  // Set system UI colors
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
    // Set navigation bar color for Android
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync(colors.background);
      NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
    }
  }, [colors.background, isDark]);
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* StatusBar is handled globally in main app layout, no need to duplicate */}
      <View style={[styles.fullBackground, { backgroundColor: colors.background }]} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopWidth: 0,
            height: 55 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 8),
            paddingTop: 6,
            elevation: 0,
            shadowOpacity: 0,
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
          },
          tabBarLabelStyle: {
            fontSize: FontSizes.xs,
            fontWeight: FontWeights.medium,
            marginTop: 2,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarBackground: () => (
            <View style={{ flex: 1, backgroundColor: colors.background }} />
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ size, color, focused }) => (
              <TabBarIcon focused={focused} colors={colors}>
                <Home
                  size={size}
                  color={color}
                  strokeWidth={focused ? 2.5 : 2}
                />
              </TabBarIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ size, color, focused }) => (
              <TabBarIcon focused={focused} colors={colors}>
                <Search
                  size={size}
                  color={color}
                  strokeWidth={focused ? 2.5 : 2}
                />
              </TabBarIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: 'Chats',
            tabBarIcon: ({ size, color, focused }) => (
              <TabBarIcon focused={focused} colors={colors}>
                <MessageCircle
                  size={size}
                  color={color}
                  strokeWidth={focused ? 2.5 : 2}
                />
              </TabBarIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ size, color, focused }) => (
              <TabBarIcon focused={focused} colors={colors}>
                <Settings
                  size={size}
                  color={color}
                  strokeWidth={focused ? 2.5 : 2}
                />
              </TabBarIcon>
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -100, // Extend well beyond the bottom edge
    zIndex: -1,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabIndicator: {
    position: 'absolute',
    top: -8,
    width: 40,
    height: 3,
    borderRadius: 2,
  },
  // Blue dot for unread messages in tab bar (bigger size)
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: -8,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#004aad',
    borderWidth: 2,
  },
});
