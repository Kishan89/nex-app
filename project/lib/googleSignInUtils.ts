// lib/googleSignInUtils.ts
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
/**
 * Configure Google Sign-In with normal settings (no forced account selection)
 */
export const configureGoogleSignIn = async (): Promise<void> => {
  try {
    const extra = Constants.expoConfig?.extra || {};
    const webClientId = extra.googleWebClientId;
    const androidClientId = extra.googleAndroidClientId;
    const iosClientId = extra.googleIosClientId;
    if (!webClientId) {
      console.error('Google webClientId not found in app.json');
      throw new Error('Google webClientId not found in app.json');
    }
    console.log('Configuring Google Sign-In with:', {
      webClientId,
      androidClientId,
      iosClientId
    });
    GoogleSignin.configure({
      webClientId: webClientId, // Web Client ID for server auth
      iosClientId: iosClientId, // iOS Client ID
      offlineAccess: true, // Enable offline access
      forceCodeForRefreshToken: true,
    });
    } catch (error) {
    console.error('Google Sign-In configuration error:', error);
    throw error;
  }
};
/**
 * Perform normal Google Sign-In (no forced account selection)
 */
export const signInWithGoogle = async (): Promise<{ idToken: string; user: any }> => {
  try {
    // Check Play Services availability
    await GoogleSignin.hasPlayServices();
    // Sign in normally (will use cached account if available)
    const userInfo = await GoogleSignin.signIn();
    if (!userInfo.data?.idToken) {
      throw new Error('No ID token received from Google');
    }
    return {
      idToken: userInfo.data.idToken,
      user: userInfo.data.user
    };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error('CANCELLED');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error('Google sign-in is already in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services is not available on this device');
    } else {
      // Log detailed error information
      console.error('Detailed error:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      throw new Error(error.message || 'Google sign-in failed');
    }
  }
};
/**
 * Clear Google Sign-In state (for logout)
 */
export const clearGoogleSignInState = async (): Promise<void> => {
  try {
    // Only sign out, don't revoke access (this prevents update prompts)
    await GoogleSignin.signOut();
    } catch (error) {
    // This is expected if user is not signed in
    }
};
