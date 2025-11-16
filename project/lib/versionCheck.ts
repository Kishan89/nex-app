import { Platform, Linking, Alert } from 'react-native';
import Constants from 'expo-constants';
import { apiService } from './api';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

export interface VersionInfo {
  latestVersion: string;
  minVersion?: string;
  minimumVersion: string;
  updateRequired: boolean;
  forceUpdate?: boolean;
  isLatestVersion?: boolean;
  updateUrl: string;
  storeUrl?: string;
  releaseNotes?: string;
  message?: string;
}

/**
 * Compare two version strings (e.g., "1.2.3" vs "1.2.4")
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }
  
  return 0;
}

/**
 * Check if app version needs update
 */
export async function checkAppVersion(): Promise<VersionInfo | null> {
  try {
    console.log(`📱 Checking app version: ${APP_VERSION} (Platform: ${Platform.OS})`);
    
    // Call backend API to check version
    const response = await apiService.checkAppVersion(APP_VERSION, Platform.OS) as any;
    
    if (!response || !response.success) {
      console.warn('⚠️ Failed to check app version, allowing app to continue');
      return null;
    }
    
    const data = response.data as any;
    console.log('✅ Version check result:', {
      current: APP_VERSION,
      latest: data.latestVersion,
      updateRequired: data.updateRequired,
      forceUpdate: data.forceUpdate
    });
    
    // Determine update URL
    const updateUrl = data.storeUrl || (
      Platform.OS === 'android' 
        ? 'https://play.google.com/store/apps/details?id=com.mycompany.nexeed1'
        : 'https://apps.apple.com/app/nexeed/id123456789'
    );
    
    // Simple exact match - any mismatch requires force update
    return {
      latestVersion: data.latestVersion || data.requiredVersion,
      minimumVersion: data.requiredVersion || data.latestVersion,
      updateRequired: data.updateRequired || false,
      forceUpdate: data.updateRequired || false, // Always force if update required
      isLatestVersion: data.isLatestVersion || false,
      updateUrl,
      message: data.message || 'Please update to continue',
    };
  } catch (error) {
    console.error('❌ Error checking app version:', error);
    // On error, allow app to work to avoid blocking users
    return null;
  }
}

/**
 * Show update dialog
 */
export function showUpdateDialog(versionInfo: VersionInfo, onDismiss?: () => void) {
  const title = versionInfo.updateRequired 
    ? 'Update Required' 
    : 'Update Available';
    
  const message = versionInfo.updateRequired
    ? `A new version (${versionInfo.latestVersion}) is required to continue using the app. Please update from the ${Platform.OS === 'android' ? 'Play Store' : 'App Store'}.`
    : `A new version (${versionInfo.latestVersion}) is available. Update now to get the latest features and improvements.`;
  
  const buttons = versionInfo.updateRequired
    ? [
        {
          text: 'Update Now',
          onPress: () => {
            Linking.openURL(versionInfo.updateUrl);
          }
        }
      ]
    : [
        {
          text: 'Later',
          style: 'cancel' as const,
          onPress: onDismiss
        },
        {
          text: 'Update Now',
          onPress: () => {
            Linking.openURL(versionInfo.updateUrl);
          }
        }
      ];
  
  Alert.alert(title, message, buttons, {
    cancelable: !versionInfo.updateRequired
  });
}

/**
 * Get current app version
 */
export function getCurrentVersion(): string {
  return APP_VERSION;
}
