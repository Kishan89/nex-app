const { prisma } = require('../config/database');

// Database health check middleware
const dbHealthCheck = async (req, res, next) => {
  try {
    // Quick health check - don't block requests
    await prisma.$queryRaw`SELECT 1`;
    next();
  } catch (error) {
    console.error('⚠️ Database health check failed:', error.message);
    
    // Handle connection pool timeout errors
    if (error.code === 'P2024' || error.message?.includes('connection pool')) {
      console.log('🔄 Connection pool issue detected, attempting recovery...');
      
      try {
        // Try to disconnect and reconnect
        await prisma.$disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Database connection recovered');
        next();
      } catch (recoveryError) {
        console.error('❌ Database recovery failed:', recoveryError.message);
        return res.status(503).json({
          success: false,
          error: 'Database temporarily unavailable',
          message: 'Please try again in a moment'
        });
      }
    } else {
      // For other errors, continue but log the issue
      console.log('⚠️ Database issue detected but continuing request');
      next();
    }
  }
};

// Lightweight health check for high-frequency endpoints
const lightDbCheck = async (req, res, next) => {
  // Skip health check for high-frequency endpoints to avoid pool exhaustion
  const skipPaths = ['/api/health', '/socket.io'];
  const shouldSkip = skipPaths.some(path => req.path.startsWith(path));
  
  if (shouldSkip) {
    return next();
  }
  
  // Only do health check occasionally (10% of requests)
  if (Math.random() > 0.1) {
    return next();
  }
  
  return dbHealthCheck(req, res, next);
};

module.exports = {
  dbHealthCheck,
  lightDbCheck
};
