import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
type SplashTrigger = 'app_open' | 'none';
interface SplashContextType {
  isAppReady: boolean;
  isSplashVisible: boolean;
  splashTrigger: SplashTrigger;
  hideSplash: () => void;
  isInitialLoad: boolean;
}
const SplashContext = createContext<SplashContextType | undefined>(undefined);
export const useSplash = () => {
  const context = useContext(SplashContext);
  if (!context) {
    throw new Error('useSplash must be used within a SplashProvider');
  }
  return context;
};
interface SplashProviderProps {
  children: React.ReactNode;
}
export const SplashProvider: React.FC<SplashProviderProps> = ({ children }) => {
  const [isAppReady, setIsAppReady] = useState(false);
  const [isSplashVisible, setIsSplashVisible] = useState(true); // Always show on app start
  const [splashTrigger, setSplashTrigger] = useState<SplashTrigger>('app_open');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const initializationRef = useRef(false);
  useEffect(() => {
    let isMounted = true;
    // Prevent multiple initializations
    if (initializationRef.current) return;
    initializationRef.current = true;
    // Initialize app with custom splash screen only
    const initializeApp = async () => {
      try {
        // No native splash screen to hide - using custom splash only
        // Essential initialization - do heavy loading during splash
        // This ensures no loading screens appear later
        await Promise.all([
          // Load critical cached data and initialize services
          (async () => {
            try {
              // Initialize Firebase and caches
              const { initFirebase } = await import('../lib/firebase');
              await initFirebase();
              // Preload notification and chat caches
              const { notificationCache } = await import('../store/notificationCache');
              const { chatCache } = await import('../store/chatCache');
              const { followSync } = await import('../store/followSync');
              await Promise.all([
                notificationCache.preloadCache(),
                chatCache.preloadCache(), 
                followSync.preloadCache(),
              ]);
              } catch (error) {
              }
          })(),
          // Minimum splash time for proper animation
          new Promise(resolve => setTimeout(resolve, 1000)),
        ]);
        if (isMounted) {
          // Mark app as ready
          setIsAppReady(true);
          // Custom splash will show automatically (isSplashVisible = true by default)
          setSplashTrigger('app_open');
        }
      } catch (error) {
        if (isMounted) {
          // Even if there's an error, we should still show the app
          setIsAppReady(true);
          setIsInitialLoad(false);
        }
      }
    };
    initializeApp();
    return () => {
      isMounted = false;
    };
  }, []);
  const hideSplash = useCallback(() => {
    setIsSplashVisible(false);
    setSplashTrigger('none');
    setIsInitialLoad(false);
  }, []);
  const value: SplashContextType = {
    isAppReady,
    isSplashVisible,
    splashTrigger,
    hideSplash,
    isInitialLoad,
  };
  return (
    <SplashContext.Provider value={value}>
      {children}
    </SplashContext.Provider>
  );
};
