// app/_layout.tsx
import { Stack, Redirect } from 'expo-router';
import React, { useEffect } from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationProvider, useNotification } from '@/context/NotificationContext';
import { NotificationCountProvider } from '@/context/NotificationCountContext';
import { NotificationPermissionProvider } from '@/context/NotificationPermissionContext';
import { SocketProvider } from '@/context/SocketContext';
import { ListenContextProvider } from '@/context/ListenContext';
import { CommentReplyProvider } from '@/context/CommentReplyContext';
import { ChatProvider } from '@/context/ChatContext';
import { PollVoteProvider } from '@/context/PollVoteContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { SplashProvider, useSplash } from '@/context/SplashContext';
import NotificationManager from '@/components/notifications/NotificationManager';
import SplashScreen from '@/components/SplashScreen';
import { Colors, getThemeStyles } from '@/constants/theme';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';
import { View, ActivityIndicator, StyleSheet, AppState, AppStateStatus, Appearance, Platform } from 'react-native';
import { cleanFCMService } from '@/lib/cleanFCMService';
import * as Linking from 'expo-linking';
import { myAppDeepLinkingService } from '@/lib/myappDeepLinking';
import { notificationNavigationService } from '@/lib/notificationNavigationService';
import { fcmService } from '@/lib/fcmService';
import { ultraFastChatCache } from '@/lib/ChatCache';
// Removed imports - initialization moved to SplashContext
// Component to manage the status bar appearance
const AppStatusBar = () => {
  const { isDark, colors } = useTheme();
  const themeStyles = getThemeStyles(isDark);
  // Set system navigation bar color for Android based on theme
  useEffect(() => {
    const navBarColor = isDark ? '#000000' : '#ffffff';
    const buttonStyle = isDark ? 'light' : 'dark';
    SystemUI.setBackgroundColorAsync(navBarColor);
    // Also set navigation bar using NavigationBar API
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync(navBarColor);
      NavigationBar.setButtonStyleAsync(buttonStyle);
    }
  }, [isDark]);
  return (
    <StatusBar 
      style={isDark ? "light" : "dark"} 
      backgroundColor={isDark ? "#000000" : "#ffffff"} 
      translucent={false}
    />
  );
};
// Wrapper component to provide user context to CommentReplyProvider
function AppWithCommentReply() {
  const { user } = useAuth();
  return (
    <CommentReplyProvider 
      currentUserId={user?.id || ""} 
      currentUserAvatar={user?.avatar || ""}
    >
      <AppWithNotifications />
    </CommentReplyProvider>
  );
}
// Component that uses the notification context
function AppWithNotifications() {
  const { user, loading } = useAuth();
  const { notification, hideNotification, handleNotificationPress } = useNotification();
  const { colors } = useTheme();
  const { isAppReady, isSplashVisible, splashTrigger, hideSplash, isInitialLoad } = useSplash();
  const insets = useSafeAreaInsets();
  // Initialize notification services and ultra-fast cache
  useEffect(() => {
    if (user) {
      // ⚡ Initialize ultra-fast chat cache for instant message loading
      ultraFastChatCache.initialize().catch(error => {
        });
      // Initialize main FCM service only (handles Firebase push notifications)
      fcmService.initialize();
      // Disable other FCM services to prevent conflicts
      // cleanFCMService.initialize();
      // notificationNavigationService.initialize();
      // Mark navigation as ready and check pending navigations after a short delay
      setTimeout(() => {
        // notificationNavigationService.setNavigationReady(true);
        // Check main FCM service for pending navigation only
        fcmService.executePendingNavigation();
      }, 1500);
    } else {
      fcmService.cleanup();
      // notificationNavigationService.setNavigationReady(false);
      // cleanFCMService.cleanup();
      // notificationNavigationService.cleanup();
    }
    // Cleanup function
    return () => {
      fcmService.cleanup();
      // cleanFCMService.cleanup();
      // notificationNavigationService.cleanup();
    };
  }, [user]);
  // Initialize myapp:// deep linking service immediately
  useEffect(() => {
    // Initialize deep linking as soon as possible, even before user auth
    myAppDeepLinkingService.initialize();
    // Cleanup when component unmounts
    return () => {
      myAppDeepLinkingService.cleanup();
    };
  }, []); // Empty dependency array to run only once on mount
  // Execute pending navigation after user authentication
  useEffect(() => {
    if (user && !loading) {
      // Small delay to ensure navigation stack is ready
      setTimeout(() => {
        myAppDeepLinkingService.executePendingNavigation();
      }, 100);
    }
  }, [user, loading]);
  // AppState listener for handling background to foreground transitions
  useEffect(() => {
    let lastAppState: AppStateStatus = AppState.currentState;
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Only execute on background -> active transition
      if (lastAppState !== 'active' && nextAppState === 'active' && user) {
        // Execute any pending FCM navigation when app becomes active
        setTimeout(() => {
          fcmService.executePendingNavigation();
        }, 800); // Slightly longer delay for better reliability
      }
      lastAppState = nextAppState;
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription?.remove();
    };
  }, [user]);
  // Show splash screen while app is not ready or splash is visible
  if (!isAppReady || isSplashVisible) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* StatusBar is handled inside SplashScreen component */}
        <SplashScreen 
          onAnimationComplete={hideSplash} 
          trigger={splashTrigger}
        />
      </View>
    );
  }
  // No separate loading screen - splash handles all loading
  // This ensures smooth transition without any loading screens
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: colors.background,
    }}>
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.background,
        zIndex: -1,
      }} />
      <AppStatusBar />
      {/* Global notification manager - renders on top of all screens */}
      <NotificationManager />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.background },
          gestureEnabled: true,
        }}
      >
        {/* Authentication screens - always available */}
        <Stack.Screen 
          name="login" 
          options={{
            animation: 'fade',
            contentStyle: { backgroundColor: colors.background },
          }}
        />
        {/* Protected screens - only available when authenticated */}
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="create-post"
          options={{
            animation: 'slide_from_bottom',
            contentStyle: { backgroundColor: colors.background },
          }}
        />
        <Stack.Screen
          name="search"
          options={{
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: colors.background },
          }}
        />
        <Stack.Screen
          name="edit-profile"
          options={{
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: colors.background },
          }}
        />
        {/* Temporary redirect for old notification routes */}
        <Stack.Screen
          name="notifications"
          options={{
            animation: 'fade',
            contentStyle: { backgroundColor: colors.background },
          }}
        />
        <Stack.Screen
          name="post/[id]"
          options={{
            contentStyle: { backgroundColor: colors.background },
          }}
        />
        <Stack.Screen
          name="profile/[id]"
          options={{
            animation: 'slide_from_left',
            contentStyle: { backgroundColor: colors.background },
          }}
        />
        <Stack.Screen
          name="chat/[id]"
          options={{
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        />
        {/* Default redirect based on auth state */}
        <Stack.Screen 
          name="index" 
          options={{ headerShown: false }}
        />
      </Stack>
    </View>
  );
}
// Root export function for the application
export default function RootLayout() {
  // Initialization is now handled in SplashContext for better performance
  // This prevents duplicate loading and ensures smooth transitions
  // Use neutral dark grey that looks good in both modes
  const initialBgColor = '#1a1a1a';
  return (
    <View style={{ flex: 1, backgroundColor: initialBgColor }}>
      <ThemeProvider>
        <SafeAreaProvider>
          <SafeAreaProviderWithTheme />
        </SafeAreaProvider>
      </ThemeProvider>
    </View>
  );
}
// Component to handle SafeAreaProvider with theme
function SafeAreaProviderWithTheme() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SplashProvider>
        <AuthProvider>
          <PollVoteProvider>
            <ChatProvider>
              <NotificationCountProvider>
                <NotificationProvider>
                  <NotificationPermissionProvider>
                    <SocketProvider>
                      <ListenContextProvider>
                        <AppWithCommentReply />
                      </ListenContextProvider>
                    </SocketProvider>
                  </NotificationPermissionProvider>
                </NotificationProvider>
              </NotificationCountProvider>
            </ChatProvider>
          </PollVoteProvider>
        </AuthProvider>
      </SplashProvider>
    </View>
  );
}
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});