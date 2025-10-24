// Bundle optimization utilities
import { lazy, ComponentType } from 'react';

// Lazy load heavy components
export const LazyCommentsModal = lazy(() => import('@/components/Comments'));
export const LazyImageViewer = lazy(() => import('@/components/ImageViewer'));
export const LazyChatScreen = lazy(() => import('@/components/chat/FastChatScreen'));
export const LazySearchScreen = lazy(() => import('@/app/search.tsx'));

// Lazy load screens
export const LazyProfileScreen = lazy(() => import('@/app/profile/[id].tsx'));
export const LazyPostScreen = lazy(() => import('@/app/post/[id].tsx'));
export const LazyCreatePostScreen = lazy(() => import('@/app/create-post.tsx'));

// Lazy load heavy libraries
export const lazyLoadLibrary = async <T>(importFn: () => Promise<T>): Promise<T> => {
  try {
    return await importFn();
  } catch (error) {
    console.error('Failed to lazy load library:', error);
    throw error;
  }
};

// Dynamic imports for heavy features
export const loadImageCompression = () => 
  lazyLoadLibrary(() => import('expo-image-manipulator'));

export const loadShareService = () => 
  lazyLoadLibrary(() => import('@/lib/shareService'));

export const loadNotificationService = () => 
  lazyLoadLibrary(() => import('@/lib/fcmService'));

// Component preloading
export const preloadComponents = async () => {
  const preloadPromises = [
    import('@/components/Comments'),
    import('@/components/ImageViewer'),
    import('@/components/chat/FastChatScreen'),
  ];
  
  try {
    await Promise.all(preloadPromises);
    console.log('✅ Components preloaded successfully');
  } catch (error) {
    console.error('❌ Component preloading failed:', error);
  }
};

// Tree shaking helpers
export const importOnly = <T>(module: T, keys: (keyof T)[]): Partial<T> => {
  const result: Partial<T> = {};
  keys.forEach(key => {
    if (key in module) {
      result[key] = module[key];
    }
  });
  return result;
};

// Bundle analyzer helper
export const getBundleInfo = () => {
  if (__DEV__) {
    return {
      isDev: true,
      bundleSize: 'Unknown in dev mode',
      optimizationLevel: 'Development'
    };
  }
  
  return {
    isDev: false,
    bundleSize: 'Optimized for production',
    optimizationLevel: 'Production'
  };
};
