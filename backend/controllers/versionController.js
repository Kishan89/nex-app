const versionService = require('../services/versionService');
const { createLogger } = require('../utils/logger');
const HTTP_STATUS = require('../constants').HTTP_STATUS;

const logger = createLogger('VersionController');

/**
 * Check if app version is valid and if update is required
 * GET /api/version/check?version=1.0.11&platform=android
 */
const checkVersion = async (req, res) => {
  try {
    const { version, platform = 'android' } = req.query;

    if (!version) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'App version is required'
      });
    }

    logger.debug('Version check requested', { version, platform });

    const result = await versionService.checkVersion(version, platform);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in checkVersion:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to check app version',
      error: error.message
    });
  }
};

/**
 * Get current version info for a platform
 * GET /api/version/current?platform=android
 */
const getCurrentVersion = async (req, res) => {
  try {
    const { platform = 'android' } = req.query;

    logger.debug('Current version requested', { platform });

    const versionInfo = await versionService.getCurrentVersion(platform);

    if (!versionInfo) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Version information not found'
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: versionInfo
    });
  } catch (error) {
    logger.error('Error in getCurrentVersion:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to get current version',
      error: error.message
    });
  }
};

/**
 * Update app version (Admin only)
 * POST /api/version/update
 * Body: { version, minVersion, platform, forceUpdate, updateMessage, playStoreUrl, appStoreUrl }
 */
const updateVersion = async (req, res) => {
  try {
    const {
      version,
      minVersion,
      platform = 'android',
      forceUpdate = true,
      updateMessage,
      playStoreUrl,
      appStoreUrl
    } = req.body;

    if (!version || !minVersion) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Version and minVersion are required'
      });
    }

    logger.info('Version update requested', { 
      version, 
      minVersion, 
      platform,
      userId: req.user?.id 
    });

    const result = await versionService.updateVersion(
      version,
      minVersion,
      platform,
      {
        forceUpdate,
        updateMessage,
        playStoreUrl,
        appStoreUrl
      }
    );

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'App version updated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in updateVersion:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update app version',
      error: error.message
    });
  }
};

module.exports = {
  checkVersion,
  getCurrentVersion,
  updateVersion
};
