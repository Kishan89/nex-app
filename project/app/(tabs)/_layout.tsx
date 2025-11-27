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
import { socketService } from '@/lib/socketService';
import { achievementService } from '@/lib/achievementService';
import AchievementUnlockModal from '@/components/AchievementUnlockModal';
import { useFocusEffect } from 'expo-router';
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
  
  // Achievement State
  const [unlockedAchievement, setUnlockedAchievement] = useState<string | null>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);

  // Check for achievements whenever the tab layout is focused or periodically
  useFocusEffect(
    React.useCallback(() => {
      const checkAchievements = async () => {
        if (!user?.id) return;
        
        try {
          // Get unseen achievements
          const unseen = await achievementService.getUnseenAchievements(user.id);
          
          if (unseen.length > 0) {
            // Validate time-based achievements client-side
            const validAchievements = unseen.filter(id => achievementService.validateAchievementTime(id));
            
            if (validAchievements.length > 0) {
              // Show the first valid one
              setUnlockedAchievement(validAchievements[0]);
              setShowAchievementModal(true);
            }
          }
        } catch (error) {
          console.error('Error checking achievements:', error);
        }
      };

      // Check immediately
      checkAchievements();
      
      // Set up a small interval to check periodically while active (e.g. every 30 seconds)
      // This helps catch achievements unlocked by background events or other interactions
      const interval = setInterval(checkAchievements, 30000);
      
      return () => clearInterval(interval);
    }, [user?.id])
  );
  // Redirect to login if not authenticated
  if (!user) {
    return <Redirect href="/login" />;
  }
  // CRITICAL: Set current user ID in socket service for notification filtering
  useEffect(() => {
    if (user?.id) {
      console.log('🔧 [TAB LAYOUT] Setting currentUserId in socketService:', user.id);
      socketService.setCurrentUserId(user.id);
    }
  }, [user?.id]);
  
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
      
      {/* Global Achievement Modal */}
      {unlockedAchievement && (
        <AchievementUnlockModal
          visible={showAchievementModal}
          achievementId={unlockedAchievement}
          onClose={() => {
            console.log('🎉 Global achievement modal closed');
            if (unlockedAchievement && user?.id) {
              achievementService.markAsSeen(user.id, unlockedAchievement);
            }
            setShowAchievementModal(false);
            setUnlockedAchievement(null);
          }}
        />
      )}
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
    backgroundColor: '#3B8FE8',
    borderWidth: 2,
  },
});
