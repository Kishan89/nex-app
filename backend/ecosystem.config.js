// PM2 Production Configuration for Nexeed Backend
module.exports = {
  apps: [{
    name: 'nexeed-backend',
    script: 'server.js',
    instances: 1, 
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 3000,
      HOST: '0.0.0.0'
    },
    // Production optimizations
    max_memory_restart: '400M', // Restart if memory exceeds 400MB
    node_args: '--max-old-space-size=512', // Limit Node.js memory
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Auto-restart settings
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    
    // Health monitoring
    min_uptime: '10s',
    max_restarts: 5,
    
    // Environment-specific settings
    env_production: {
      NODE_ENV: 'production',
      ENABLE_LOGGING: 'false'
    }
  }]
};
