import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { configureGoogleSignIn, signInWithGoogle as signInWithGoogleUtil } from '../lib/googleSignInUtils';
import { trackUserLogin, trackScreenView } from '../lib/firebase';
export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const { colors, isDark } = useTheme();
  const [googleLoading, setGoogleLoading] = useState(false);
  // Track screen view when component mounts
  useEffect(() => {
    trackScreenView('login_screen');
  }, []);
  // Configure Google Sign-In
  useEffect(() => {
    configureGoogleSignIn().catch(error => {
      });
  }, []);
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      // Use normal Google Sign-In (no forced account selection)
      const { idToken } = await signInWithGoogleUtil();
      await signInWithGoogle(idToken);
      trackUserLogin('google');
    } catch (error: any) {
      if (error.message === 'CANCELLED') {
        return; // Don't show error for cancellation
      } else if (error.message?.includes('HTTP 500')) {
        Alert.alert('Server Error', 'Our servers are experiencing issues. Please try again in a moment.');
      } else if (error.message?.includes('HTTP 503')) {
        Alert.alert('Server Busy', 'Server is busy. Please try again in a few seconds.');
      } else {
        Alert.alert('Google Sign-In Failed', `Error: ${error.message || 'Unknown error'}. Please try again.`);
      }
    } finally {
      setGoogleLoading(false);
    }
  };
  return (
    <LinearGradient colors={isDark ? ['#004aad', '#e385ec'] : ['#004aad', '#e385ec']} style={styles.safeArea}>
      <View style={styles.outer}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Welcome to Nexeed</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in with your Google account to continue
          </Text>
          {/* Google Sign In Button */}
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            activeOpacity={0.85}
            style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
          >
            {googleLoading ? (
              <View style={styles.googleButtonContent}>
                <ActivityIndicator color="#4285f4" size="small" />
                <Text style={styles.googleButtonText}>Signing in...</Text>
              </View>
            ) : (
              <View style={styles.googleButtonContent}>
                <Image
                  source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </View>
            )}
          </TouchableOpacity>
          {/* Terms and Privacy */}
          <Text style={[styles.terms, { color: colors.textMuted }]}>
            By continuing, you agree to our{' '}
            <Text style={[styles.link, { color: colors.primary }]}>Terms of Service</Text> and{' '}
            <Text style={[styles.link, { color: colors.primary }]}>Privacy Policy</Text>
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  outer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 20,
    padding: 32,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  googleButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#dadce0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 24,
  },
  googleButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3c4043',
    letterSpacing: 0.25,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  terms: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  link: {
    fontWeight: '600',
  },
});
