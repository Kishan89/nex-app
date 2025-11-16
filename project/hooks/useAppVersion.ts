import { useState, useEffect } from 'react';
import { checkAppVersion, VersionInfo } from '@/lib/versionCheck';

/**
 * Hook to check app version on mount
 * Returns version info if update is required
 */
export function useAppVersion() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkVersion();
  }, []);

  const checkVersion = async () => {
    try {
      setIsChecking(true);
      const info = await checkAppVersion();
      
      if (info && info.updateRequired) {
        console.log('🚨 App update required:', info);
        setVersionInfo(info);
      } else if (info) {
        console.log('✅ App is up to date:', info);
      }
    } catch (error) {
      console.error('Error checking app version:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const dismissUpdate = () => {
    // Only allow dismissing if update is not forced
    if (versionInfo && !versionInfo.forceUpdate) {
      setVersionInfo(null);
    }
  };

  return {
    versionInfo,
    isChecking,
    dismissUpdate,
    recheckVersion: checkVersion,
  };
}
