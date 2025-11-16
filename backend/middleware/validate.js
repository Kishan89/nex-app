/**
 * Request Validation Middleware
 * Provides input validation for API requests
 * 
 * TODO: Install a validation library for production use:
 * - Option 1: npm install joi
 * - Option 2: npm install express-validator
 * 
 * For now, this provides basic manual validation helpers
 */

const { BadRequestError } = require('../utils/errors');

/**
 * Validates required fields in request body
 * @param {Array<string>} fields - Array of required field names
 * @returns {Function} Express middleware
 */
const validateRequired = (fields) => {
  return (req, res, next) => {
    const missing = fields.filter(field => !req.body[field]);
    
    if (missing.length > 0) {
      throw new BadRequestError(`Missing required fields: ${missing.join(', ')}`);
    }
    
    next();
  };
};

/**
 * Validates that a field is a valid UUID
 * @param {string} field - Field name to validate
 * @param {string} location - Location of field ('body', 'params', 'query')
 * @returns {Function} Express middleware
 */
const validateUUID = (field, location = 'params') => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  return (req, res, next) => {
    const value = req[location][field];
    
    if (!value || !uuidRegex.test(value)) {
      throw new BadRequestError(`Invalid ${field}: must be a valid UUID`);
    }
    
    next();
  };
};

/**
 * Validates that a field is a non-empty string
 * @param {string} field - Field name to validate
 * @param {number} minLength - Minimum length (default: 1)
 * @param {number} maxLength - Maximum length (optional)
 * @returns {Function} Express middleware
 */
const validateString = (field, minLength = 1, maxLength = null) => {
  return (req, res, next) => {
    const value = req.body[field];
    
    if (typeof value !== 'string' || value.trim().length < minLength) {
      throw new BadRequestError(`${field} must be a string with at least ${minLength} characters`);
    }
    
    if (maxLength && value.length > maxLength) {
      throw new BadRequestError(`${field} must not exceed ${maxLength} characters`);
    }
    
    next();
  };
};

/**
 * Validates that a field is a valid email
 * @param {string} field - Field name to validate
 * @returns {Function} Express middleware
 */
const validateEmail = (field = 'email') => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return (req, res, next) => {
    const value = req.body[field];
    
    if (!value || !emailRegex.test(value)) {
      throw new BadRequestError(`Invalid ${field}: must be a valid email address`);
    }
    
    next();
  };
};

/**
 * Validates that a field is an array with minimum length
 * @param {string} field - Field name to validate
 * @param {number} minLength - Minimum array length
 * @returns {Function} Express middleware
 */
const validateArray = (field, minLength = 1) => {
  return (req, res, next) => {
    const value = req.body[field];
    
    if (!Array.isArray(value) || value.length < minLength) {
      throw new BadRequestError(`${field} must be an array with at least ${minLength} items`);
    }
    
    next();
  };
};

/**
 * Example: Chat validation schemas
 * Usage in routes: router.post('/chats/:chatId/messages', validate.sendMessage, controller.sendMessage)
 */
const chatValidation = {
  sendMessage: [
    validateRequired(['content', 'senderId']),
    validateString('content', 1, 5000),
    validateUUID('chatId', 'params')
  ],
  
  createChat: [
    validateRequired(['participantIds']),
    validateArray('participantIds', 2)
  ],
  
  markAsRead: [
    validateUUID('chatId', 'params')
  ]
};

module.exports = {
  validateRequired,
  validateUUID,
  validateString,
  validateEmail,
  validateArray,
  
  // Pre-configured validation chains
  chatValidation,
};
