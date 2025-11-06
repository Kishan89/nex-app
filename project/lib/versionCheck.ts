import { Platform, Linking, Alert } from 'react-native';
import Constants from 'expo-constants';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

// This would be stored in your backend/Supabase
const VERSION_CHECK_URL = 'https://your-api.com/api/version/check';

export interface VersionInfo {
  latestVersion: string;
  minimumVersion: string;
  updateRequired: boolean;
  updateUrl: string;
  releaseNotes?: string;
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
    // For now, return mock data - replace with actual API call
    // const response = await fetch(VERSION_CHECK_URL);
    // const data = await response.json();
    
    // Mock data - replace with actual API response
    const mockData: VersionInfo = {
      latestVersion: '1.0.0',
      minimumVersion: '1.0.0',
      updateRequired: false,
      updateUrl: Platform.OS === 'android' 
        ? 'https://play.google.com/store/apps/details?id=com.yourapp'
        : 'https://apps.apple.com/app/your-app/id123456789',
      releaseNotes: 'Bug fixes and performance improvements'
    };
    
    // Check if current version is below minimum required
    const needsUpdate = compareVersions(APP_VERSION, mockData.minimumVersion) < 0;
    
    return {
      ...mockData,
      updateRequired: needsUpdate
    };
  } catch (error) {
    console.error('Error checking app version:', error);
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
