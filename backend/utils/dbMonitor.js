const { prisma } = require('../config/database');

class DatabaseMonitor {
  constructor() {
    this.connectionCount = 0;
    this.lastHealthCheck = null;
    this.healthCheckInterval = null;
  }

  startMonitoring() {
    // Monitor database health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const duration = Date.now() - start;
        
        this.lastHealthCheck = {
          success: true,
          duration,
          timestamp: new Date()
        };
        
        // Only log if response is slow (>5 seconds)
        if (duration > 5000) {
          console.log(`⚠️ Slow database response: ${duration}ms`);
        }
      } catch (error) {
        this.lastHealthCheck = {
          success: false,
          error: error.message,
          timestamp: new Date()
        };
        
        console.error('❌ Database health check failed:', error.message);
        
        // If it's a connection pool error, try to recover
        if (error.code === 'P2024' || error.message?.includes('connection pool')) {
          console.log('🔄 Attempting database recovery...');
          try {
            await prisma.$disconnect();
            await new Promise(resolve => setTimeout(resolve, 2000));
            await prisma.$queryRaw`SELECT 1`;
            console.log('✅ Database recovery successful');
          } catch (recoveryError) {
            console.error('❌ Database recovery failed:', recoveryError.message);
          }
        }
      }
    }, 30000); // 30 seconds

    console.log('📊 Database monitoring started');
  }

  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('📊 Database monitoring stopped');
    }
  }

  getStatus() {
    return {
      connectionCount: this.connectionCount,
      lastHealthCheck: this.lastHealthCheck,
      isHealthy: this.lastHealthCheck?.success || false
    };
  }

  // Middleware to track active connections
  trackConnection(req, res, next) {
    this.connectionCount++;
    
    const cleanup = () => {
      this.connectionCount--;
    };
    
    res.on('finish', cleanup);
    res.on('close', cleanup);
    res.on('error', cleanup);
    
    next();
  }
}

const dbMonitor = new DatabaseMonitor();

module.exports = {
  dbMonitor,
  trackConnection: (req, res, next) => dbMonitor.trackConnection(req, res, next)
};
