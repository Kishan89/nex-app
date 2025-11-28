// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../lib/api';
import { router } from 'expo-router';
import { AppState, AppStateStatus } from 'react-native';
// import { setupPushNotifications } from '@/lib/notification'; // Removed - using clean FCM now
import { appInitialization } from '@/lib/app-initialization';
// --- Define User and Auth types ---
type User = {
  id: string;
  email?: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  isAdmin?: boolean;
  [key: string]: any;
};
type SignInPayload = {
  email: string;
  password: string;
};
type RegisterPayload = {
  username: string;
  email: string;
  password: string;
};
type AuthResponse = {
  token?: string;
  user?: User;
  message?: string;
};
// --- Define AuthContextType ---
export type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (payload: SignInPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<AuthResponse | void>;
  signOut: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>; 
  signInWithGoogle: (idToken: string) => Promise<void>; // Updated to accept idToken
};
const AUTH_TOKEN_KEY = 'authToken';
const AUTH_USER_KEY = 'authUser';
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);
        if (storedToken) {
          setToken(storedToken);
          apiService.setAuthToken(storedToken);
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch {
              setUser(null);
            }
          }
          try {
            const fetchedUser = await apiService.getAuthenticatedUserProfile();
            setUser(fetchedUser);
            
            // Check if user is banned
            if (fetchedUser?.isBanned) {
              router.replace('/banned');
              return;
            }
          } catch (fetchError) {
            // If profile fetch fails, clear the stored token as it might be invalid
            if (fetchError?.message?.includes('500') || fetchError?.message?.includes('Internal server error')) {
              await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
              await AsyncStorage.removeItem(AUTH_USER_KEY);
              setToken(null);
              setUser(null);
              apiService.clearAuthToken();
            }
          }
        } else {
          setUser(null);
          setToken(null);
          apiService.clearAuthToken();
        }
      } catch (err) {
        setUser(null);
        setToken(null);
        apiService.clearAuthToken();
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  // Check ban status when app becomes active (foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      // When app comes to foreground, check if user is banned
      if (nextAppState === 'active' && user && token) {
        try {
          // Fetch fresh user data to check ban status
          const freshUser = await apiService.getAuthenticatedUserProfile();
          
          if (freshUser?.isBanned) {
            // User was banned while logged in - update user data and redirect
            setUser(freshUser);
            router.replace('/banned');
          }
        } catch (error) {
          // If fetch fails, ignore - user may be offline
          console.log('Failed to check ban status on app resume:', error);
        }
      }
    });

    return () => subscription?.remove();
  }, [user, token]);
  const persistAuth = async (authToken: string | null, authUser: User | null) => {
    try {
      if (authToken) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, authToken);
        setToken(authToken);
        apiService.setAuthToken(authToken);
      } else {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        setToken(null);
        apiService.clearAuthToken();
      }
      if (authUser) {
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser));
        setUser(authUser);
      } else {
        await AsyncStorage.removeItem(AUTH_USER_KEY);
        setUser(null);
      }
    } catch (err) {
      }
  };
  const signIn = async ({ email, password }: SignInPayload) => {
    setLoading(true);
    try {
      const resp = await apiService.login({ email, password });
      const returnedToken = (resp as AuthResponse)?.token;
      const returnedUser = (resp as AuthResponse)?.user ?? null;
      if (!returnedToken || !returnedUser) {
        throw new Error((resp as AuthResponse)?.message || 'Authentication failed. Please check your credentials.');
      }

      // Check if user is banned
      if (returnedUser.isBanned) {
        // Still persist auth so user can see banned screen with reason
        await persistAuth(returnedToken, returnedUser);
        router.replace('/banned');
        return;
      }

      await persistAuth(returnedToken, returnedUser);
      // Request notification permission with beautiful dialog after login
      try {
        const { requestNotificationPermissionOnLogin } = await import('../lib/notificationPermissionService');
        requestNotificationPermissionOnLogin();
      } catch (permError) {
        }
      // Navigate immediately for faster login experience
      router.replace('/');
      // Initialize user-specific features in background (non-blocking)
      Promise.all([
        appInitialization.onUserLogin(returnedUser.id),
        (async () => {
          try {
            const { socketService } = await import('../lib/socketService');
            await socketService.forceReconnect();
          } catch (socketError) {
            }
        })()
      ]).catch(error => {
        });
    } catch (err: any) {
      throw new Error(err?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const register = async (payload: RegisterPayload): Promise<AuthResponse | void> => {
    setLoading(true);
    try {
      const resp = await apiService.register(payload);
      const returnedToken = (resp as AuthResponse)?.token;
      const returnedUser = (resp as AuthResponse)?.user ?? null;
      if (returnedToken && returnedUser) {
        await persistAuth(returnedToken, returnedUser);
        // Request notification permission with beautiful dialog after registration
        try {
          const { requestNotificationPermissionOnLogin } = await import('../lib/notificationPermissionService');
          requestNotificationPermissionOnLogin();
        } catch (permError) {
          }
        // Initialize user-specific features including realtime notifications
        await appInitialization.onUserLogin(returnedUser.id);
        // Force socket reconnection with new authentication
        try {
          const { socketService } = await import('../lib/socketService');
          await socketService.forceReconnect();
        } catch (socketError) {
          }
        router.replace('/');
      } else if (resp && resp.message) {
        return resp as AuthResponse;
      } else {
        throw new Error('Registration failed. Please try again.');
      }
    } catch (err: any) {
      throw new Error(err?.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };
  // Google Sign-In function that accepts idToken from the UI
  const signInWithGoogle = async (idToken: string) => {
    setLoading(true);
    try {
      // Send the ID token to backend for verification
      const resp = await apiService.googleLoginBackend(idToken);
      const returnedToken = (resp as AuthResponse)?.token;
      const returnedUser = (resp as AuthResponse)?.user ?? null;
      if (!returnedToken || !returnedUser) {
        throw new Error((resp as AuthResponse)?.message || 'Google authentication failed.');
      }

      // Check if user is banned
      if (returnedUser.isBanned) {
        // Still persist auth so user can see banned screen with reason
        await persistAuth(returnedToken, returnedUser);
        router.replace('/banned');
        return;
      }

      await persistAuth(returnedToken, returnedUser);
      // Request notification permission with beautiful dialog after Google login
      try {
        const { requestNotificationPermissionOnLogin } = await import('../lib/notificationPermissionService');
        requestNotificationPermissionOnLogin();
      } catch (permError) {
        }
      // Navigate immediately for faster login experience
      router.replace('/');
      // Initialize user-specific features in background (non-blocking)
      appInitialization.onUserLogin(returnedUser.id).catch(error => {
        });
    } catch (err: any) {
      // Handle specific backend errors
      if (err?.message?.includes('HTTP 500')) {
        throw new Error('Server is experiencing issues. Please try again in a moment.');
      } else if (err?.message?.includes('HTTP 503')) {
        throw new Error('Server is busy. Please try again in a few seconds.');
      } else if (err?.message?.includes('Database connection')) {
        throw new Error('Connection issue. Please try again.');
      } else {
        throw new Error(err?.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  const signOut = async () => {
    setLoading(true);
    try {
      // Cleanup user-specific features including realtime notifications
      await appInitialization.onUserLogout();
      // Import socketService and cleanup socket connections
      const { socketService } = await import('../lib/socketService');
      socketService.cleanup();
      // Clear Google Sign-In state to force account selection on next login
      try {
        const { clearGoogleSignInState } = await import('../lib/googleSignInUtils');
        await clearGoogleSignInState();
      } catch (googleError) {
        }
      // Clear ALL chat-related cache including user-specific data
      try {
        const keys = await AsyncStorage.getAllKeys();
        const chatKeys = keys.filter(key => 
          key.startsWith('chat_messages_') || 
          key.startsWith('chat_read_counts_') ||
          key.includes('chat_') ||
          key.includes('unread_')
        );
        if (chatKeys.length > 0) {
          await AsyncStorage.multiRemove(chatKeys);
        }
      } catch (cacheError) {
        }
      await persistAuth(null, null);
      router.replace('/login');
    } catch (err) {
      } finally {
      setLoading(false);
    }
  };
  const value: AuthContextType = {
    user,
    token,
    loading,
    signIn,
    register,
    signOut,
    setUser,
    signInWithGoogle,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};