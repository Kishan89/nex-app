// This file is deprecated - use config/database.js instead
// Redirecting to the singleton instance to prevent conflicts
const { prisma } = require('../config/database');

module.exports = prisma;