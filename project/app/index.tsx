// app/index.tsx
import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useSplash } from '@/context/SplashContext';
import { View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
export default function Index() {
  const { user, loading } = useAuth();
  const { isInitialLoad } = useSplash();
  const { colors } = useTheme();
  // Only show loading during initial app load, not after login
  if (loading && isInitialLoad) {
    // Return minimal view - splash screen will handle the loading animation
    return (
      <View style={{ 
        flex: 1, 
        backgroundColor: colors.background
      }} />
    );
  }
  // Instant redirect based on authentication state
  if (user) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/login" />;
  }
}
