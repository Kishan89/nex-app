import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext'; 
import KeyboardWrapper from '../components/ui/KeyboardWrapper';
import { trackScreenView, trackUserRegister } from '../lib/firebase';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { configureGoogleSignIn, signInWithGoogle as signInWithGoogleUtil } from '../lib/googleSignInUtils';
export default function RegisterScreen() {
  const { register, signInWithGoogle } = useAuth();
  const { colors, isDark } = useTheme();
  // Function to get eye icon color that's always visible
  const getEyeIconColor = () => {
    return isDark ? '#ffffff' : '#1a1a1a';
  };
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [hidePassword, setHidePassword] = useState(true);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  // Track screen view when component mounts
  useEffect(() => {
    trackScreenView('register_screen');
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
      // Track successful Google registration/login
      trackUserRegister('google');
    } catch (error: any) {
      if (error.message === 'CANCELLED') {
        // User cancelled the sign-in
        return;
      } else {
        Alert.alert('Google Sign-In Failed', error.message || 'Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };
  const initiateGoogleSignIn = () => {
    handleGoogleSignIn();
  };
  const validate = () => {
    if (!username.trim() || !email.trim() || !password) {
      Alert.alert('Validation', 'Please fill in all fields.');
      return false;
    }
    const emailRe = /\S+@\S+\.\S+/;
    if (!emailRe.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password should be at least 6 characters.');
      return false;
    }
    return true;
  };
  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
      });
      // Track successful registration
      trackUserRegister('email');
      Alert.alert('Success', 'Registration successful! Please log in.');
      router.replace('/login');
    } catch (err: any) {
      const message =
        (err && typeof err === 'object' && 'message' in err && String(err.message)) ||
        (typeof err === 'string' ? err : 'Could not create account. Please try again.');
      Alert.alert('Registration Failed', message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <LinearGradient
      colors={isDark ? ['#0f172a', '#1e1b4b'] : ['#f8fafc', '#e2e8f0']} 
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.safeArea}
    >
      <KeyboardWrapper>
        <View style={styles.container}>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
              {/* Username */}
              <Text style={[styles.label, { color: colors.text }]}>Username</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.backgroundSecondary, 
                  borderColor: usernameFocused ? colors.primary : colors.border,
                  borderWidth: usernameFocused ? 2 : 1,
                  color: colors.text,
                  shadowColor: usernameFocused ? colors.primary : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: usernameFocused ? 0.3 : 0,
                  shadowRadius: usernameFocused ? 4 : 0,
                  elevation: usernameFocused ? 3 : 0
                }]}
                placeholder="Enter username"
                placeholderTextColor={colors.textPlaceholder}
                value={username}
                onChangeText={setUsername}
                onFocus={() => setUsernameFocused(true)}
                onBlur={() => setUsernameFocused(false)}
              />
              {/* Email */}
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.backgroundSecondary, 
                  borderColor: emailFocused ? colors.primary : colors.border,
                  borderWidth: emailFocused ? 2 : 1,
                  color: colors.text,
                  shadowColor: emailFocused ? colors.primary : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: emailFocused ? 0.3 : 0,
                  shadowRadius: emailFocused ? 4 : 0,
                  elevation: emailFocused ? 3 : 0
                }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.textPlaceholder}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {/* Password with eye toggle */}
              <Text style={[styles.label, { color: colors.text }]}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, { 
                    flex: 1, 
                    backgroundColor: colors.backgroundSecondary, 
                    borderColor: passwordFocused ? colors.primary : colors.border,
                    borderWidth: passwordFocused ? 2 : 1,
                    color: colors.text,
                    shadowColor: passwordFocused ? colors.primary : 'transparent',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: passwordFocused ? 0.3 : 0,
                    shadowRadius: passwordFocused ? 4 : 0,
                    elevation: passwordFocused ? 3 : 0
                  }]}
                  placeholder="Choose a secure password"
                  placeholderTextColor={colors.textPlaceholder}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={hidePassword}
                />
                <TouchableOpacity
                  onPress={() => setHidePassword(!hidePassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={hidePassword ? 'eye-off' : 'eye'}
                    size={22}
                    color={getEyeIconColor()}
                  />
                </TouchableOpacity>
              </View>
              {/* Sign Up button */}
              <TouchableOpacity
                onPress={handleRegister}
                disabled={loading || googleLoading}
                style={styles.gradientButton}
              >
                <LinearGradient
                  colors={[colors.gradientStart, colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.gradientBackground, (loading || googleLoading) && styles.buttonDisabled]}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Sign Up</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <View style={styles.separatorContainer}>
                <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.separatorText, { color: colors.textMuted }]}>or</Text>
                <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
              </View>
              <TouchableOpacity
                onPress={initiateGoogleSignIn}
                disabled={loading || googleLoading}
                activeOpacity={0.85}
                style={[styles.googleButton, (loading || googleLoading) && styles.buttonDisabled]}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#4285f4" size="small" />
                ) : (
                  <>
                    <Image
                      source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                      style={styles.googleIcon}
                    />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={styles.row}>
                <Text style={[styles.small, { color: colors.textSecondary }]}>Already have an account?</Text>
                <TouchableOpacity onPress={() => router.push('/login')} disabled={loading || googleLoading}>
                  <Text style={[styles.link, { color: colors.primary }, (loading || googleLoading) && styles.linkDisabled]}> Log In</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={[styles.footNote, { color: colors.textMuted }]}>
              By creating an account you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>
        </KeyboardWrapper>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: 'rgba(30, 27, 46, 0.9)',
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 18,
  },
  label: {
    color: '#cbd5e1',
    marginBottom: 6,
    marginTop: 10,
    fontSize: 13,
  },
  input: {
    height: 48,
    borderRadius: 10,
    backgroundColor: '#2c2540',
    color: '#fff',
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    padding: 4,
  },
  gradientButton: {
    marginTop: 18,
    borderRadius: 10,
    overflow: 'hidden',
  },
  gradientBackground: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
  },
  small: {
    color: '#94a3b8',
  },
  link: {
    color: '#ec4899',
    fontWeight: '600',
  },
  footNote: {
    marginTop: 18,
    color: '#d1c1d8',
    textAlign: 'center',
    fontSize: 12,
    paddingHorizontal: 30,
  },
  buttonDisabled: { 
    opacity: 0.7 
  },
  separatorContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 24, 
    marginBottom: 18 
  },
  separatorLine: { 
    flex: 1, 
    height: 1 
  },
  separatorText: { 
    marginHorizontal: 10, 
    fontSize: 13, 
    fontWeight: '500' 
  },
  googleButton: {
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dadce0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  googleIcon: {
    width: 18,
    height: 18,
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3c4043',
    letterSpacing: 0.25,
  },
  linkDisabled: { 
    opacity: 0.5 
  },
});