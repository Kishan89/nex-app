/**
 * Logger Utility
 * Provides consistent logging with levels and formatting
 * Can be extended to use winston or pino in the future
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

const COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[90m', // Gray
  RESET: '\x1b[0m',
};

const ICONS = {
  ERROR: '❌',
  WARN: '⚠️',
  INFO: 'ℹ️',
  DEBUG: '🔍',
};

class Logger {
  constructor(context = 'App') {
    this.context = context;
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  _log(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const color = COLORS[level] || '';
    const icon = ICONS[level] || '';
    const reset = COLORS.RESET;

    // Skip DEBUG logs in production
    if (this.isProduction && level === LOG_LEVELS.DEBUG) {
      return;
    }

    const formattedMessage = `${color}${icon} [${timestamp}] [${level}] [${this.context}]${reset} ${message}`;

    if (level === LOG_LEVELS.ERROR) {
      console.error(formattedMessage, ...args);
    } else if (level === LOG_LEVELS.WARN) {
      console.warn(formattedMessage, ...args);
    } else {
      console.log(formattedMessage, ...args);
    }
  }

  error(message, ...args) {
    this._log(LOG_LEVELS.ERROR, message, ...args);
  }

  warn(message, ...args) {
    this._log(LOG_LEVELS.WARN, message, ...args);
  }

  info(message, ...args) {
    this._log(LOG_LEVELS.INFO, message, ...args);
  }

  debug(message, ...args) {
    this._log(LOG_LEVELS.DEBUG, message, ...args);
  }

  // Convenience methods for common use cases
  request(method, path) {
    this.debug(`${method} ${path}`);
  }

  database(operation, details = '') {
    this.debug(`DB: ${operation} ${details}`);
  }

  socket(event, details = '') {
    this.debug(`Socket: ${event} ${details}`);
  }
}

// Factory function to create logger instances
const createLogger = (context) => new Logger(context);

// Default logger instance
const logger = new Logger('App');

module.exports = {
  Logger,
  createLogger,
  logger,
};
