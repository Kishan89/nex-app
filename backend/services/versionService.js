const prisma = require('../lib/prisma');
const { createLogger } = require('../utils/logger');

const logger = createLogger('VersionService');

class VersionService {
  /**
   * Check if app version is valid and if update is required
   * @param {string} currentVersion - Current app version from client
   * @param {string} platform - 'android' or 'ios'
   * @returns {Object} - Version check result
   */
  async checkVersion(currentVersion, platform = 'android') {
    try {
      logger.debug('Checking app version', { currentVersion, platform });

      // Check if prisma is available
      if (!prisma) {
        logger.warn('Database not available for version check');
        return {
          updateRequired: false,
          forceUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
          message: 'Version check unavailable'
        };
      }

      // Get latest version info from database
      const versionInfo = await prisma.$queryRaw`
        SELECT version, min_version, force_update, update_message, 
               play_store_url, app_store_url
        FROM app_version
        WHERE platform = ${platform}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (!versionInfo || versionInfo.length === 0) {
        logger.warn('No version info found in database', { platform });
        // If no version info, allow app to work
        return {
          updateRequired: false,
          forceUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
          message: 'Version check unavailable'
        };
      }

      const latestVersionInfo = versionInfo[0];
      const { 
        version: requiredVersion,
        update_message: updateMessage,
        play_store_url: playStoreUrl,
        app_store_url: appStoreUrl
      } = latestVersionInfo;

      logger.debug('Version info retrieved', { 
        requiredVersion,
        currentVersion
      });

      // Simple exact match - if versions don't match, force update required
      const versionsMatch = currentVersion === requiredVersion;
      const updateRequired = !versionsMatch;

      const result = {
        updateRequired,
        forceUpdate: updateRequired, // Always force update on mismatch
        isLatestVersion: versionsMatch,
        currentVersion,
        latestVersion: requiredVersion,
        requiredVersion,
        message: updateRequired 
          ? (updateMessage || `Please update to version ${requiredVersion}`)
          : 'App is up to date',
        storeUrl: platform === 'android' ? playStoreUrl : appStoreUrl
      };

      logger.debug('Version check result', result);

      return result;
    } catch (error) {
      logger.error('Error checking app version:', error);
      // On error, allow app to work to avoid blocking users
      return {
        updateRequired: false,
        forceUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        message: 'Version check failed'
      };
    }
  }

  /**
   * Compare two semantic version strings
   * @param {string} version1 - First version (e.g., "1.0.11")
   * @param {string} version2 - Second version (e.g., "1.0.12")
   * @returns {number} - Returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  compareVersions(version1, version2) {
    try {
      const v1Parts = version1.split('.').map(Number);
      const v2Parts = version2.split('.').map(Number);

      for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const v1Part = v1Parts[i] || 0;
        const v2Part = v2Parts[i] || 0;

        if (v1Part < v2Part) return -1;
        if (v1Part > v2Part) return 1;
      }

      return 0; // Versions are equal
    } catch (error) {
      logger.error('Error comparing versions:', error);
      return 0; // Assume equal on error
    }
  }

  /**
   * Update app version in database (Admin only)
   * @param {string} version - New version number
   * @param {string} minVersion - Minimum required version
   * @param {string} platform - 'android' or 'ios'
   * @param {Object} options - Additional options
   * @returns {Object} - Updated version info
   */
  async updateVersion(version, minVersion, platform = 'android', options = {}) {
    try {
      const {
        forceUpdate = true,
        updateMessage = 'Please update the app to continue',
        playStoreUrl,
        appStoreUrl
      } = options;

      logger.info('Updating app version', { 
        version, 
        minVersion, 
        platform, 
        forceUpdate 
      });

      // Check if prisma is available
      if (!prisma) {
        throw new Error('Database not available');
      }

      // Update or insert version info
      const result = await prisma.$executeRaw`
        INSERT INTO app_version (version, min_version, platform, force_update, update_message, play_store_url, app_store_url)
        VALUES (${version}, ${minVersion}, ${platform}, ${forceUpdate}, ${updateMessage}, ${playStoreUrl}, ${appStoreUrl})
        ON CONFLICT (platform) 
        DO UPDATE SET 
          version = ${version},
          min_version = ${minVersion},
          force_update = ${forceUpdate},
          update_message = ${updateMessage},
          play_store_url = COALESCE(${playStoreUrl}, app_version.play_store_url),
          app_store_url = COALESCE(${appStoreUrl}, app_version.app_store_url),
          updated_at = NOW()
      `;

      logger.info('App version updated successfully', { version, platform });

      return {
        success: true,
        version,
        minVersion,
        platform,
        forceUpdate
      };
    } catch (error) {
      logger.error('Error updating app version:', error);
      throw error;
    }
  }

  /**
   * Get current version info for a platform
   * @param {string} platform - 'android' or 'ios'
   * @returns {Object} - Current version info
   */
  async getCurrentVersion(platform = 'android') {
    try {
      // Check if prisma is available
      if (!prisma) {
        logger.warn('Database not available for getCurrentVersion');
        return null;
      }

      const versionInfo = await prisma.$queryRaw`
        SELECT version, min_version, force_update, update_message, 
               play_store_url, app_store_url, updated_at
        FROM app_version
        WHERE platform = ${platform}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (!versionInfo || versionInfo.length === 0) {
        return null;
      }

      return versionInfo[0];
    } catch (error) {
      logger.error('Error getting current version:', error);
      throw error;
    }
  }
}

module.exports = new VersionService();
