// Nexeed Backend Server - Direct URL Fix v2.2
require('dotenv').config();
const express = require('express');
const http = require('http');
const corsMiddleware = require('./middleware/cors');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { lightDbCheck } = require('./middleware/dbHealth');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { dbMonitor } = require('./utils/dbMonitor');
const apiRoutes = require('./routes');
const pushTokenRoutes = require('./routes/pushTokenRoutes');
const socketService = require('./services/socketService');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Global middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(corsMiddleware);
app.use('/api/push-tokens', pushTokenRoutes);
// ⭐️ Using Supabase Storage for file uploads

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
        next();
    });
}

// Health check endpoint (before API routes)
app.get('/health', async (req, res) => {
    try {
        const { prisma } = require('./config/database');
        await Promise.race([
            prisma.$queryRaw`SELECT 1`,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 10000))
        ]);
        res.json({
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString(),
            tip: 'Supabase free tier may be paused - try again in a few moments'
        });
    }
});

// Database wake-up endpoint for Supabase free tier
app.get('/wake-db', async (req, res) => {
    try {
        const { connectDatabase } = require('./config/database');
        console.log('🔄 Manual database wake-up requested...');
        const connected = await connectDatabase(0);
        if (connected) {
            res.json({
                status: 'success',
                message: 'Database connection established',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(503).json({
                status: 'failed',
                message: 'Failed to establish database connection',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Database health check middleware (lightweight)
app.use('/api', lightDbCheck);

// API routes
// ⭐️ All API routes are now handled by a single entry point
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Nexeed Social Media API Server',
        version: '2.1.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            api: '/api',
            posts: '/api/posts',
            chats: '/api/chats',
            users: '/api/users'
        }
    });
});


// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    dbMonitor.stopMonitoring();
    await disconnectDatabase();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    dbMonitor.stopMonitoring();
    await disconnectDatabase();
    process.exit(0);
});

// Start server
async function startServer() {
    try {
        // Create HTTP server FIRST (for Render port detection)
        const server = http.createServer(app);
        
        // Initialize Socket.IO with enhanced logging
        console.log('🔌 Initializing Socket.IO service...');
        socketService.initialize(server);
        console.log('✅ Socket.IO service initialized successfully');
        
        // Start HTTP server IMMEDIATELY (non-blocking)
        server.listen(PORT, HOST, () => {
            console.log('🚀 Social Media API Server started successfully!');
            console.log(`📍 Server running on http://${HOST}:${PORT}`);
            console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
            console.log(`📝 API endpoints: http://${HOST}:${PORT}/api/*`);
            console.log(`🔌 Socket.IO: ✅ Enabled and ready for connections`);
            console.log(`💬 Chat WebSocket: ws://${HOST}:${PORT}/socket.io/`);
            console.log(`🗄️ Database: ✅ Connected`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
            console.log('');
            console.log('📱 Mobile apps can now connect to Socket.IO for real-time chat');
        });

        // Connect to database AFTER server starts (async)
        connectDatabase().then((dbConnected) => {
            if (!dbConnected) {
                console.log('⚠️ Database connection delayed, but server is running');
            } else {
                console.log('✅ Database connected and verified successfully');
                // Start database monitoring
                dbMonitor.startMonitoring();
            }
        }).catch((error) => {
            console.error('❌ Database connection failed:', error);
            console.log('⚠️ Server running without database connection');
        });

        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use`);
            } else {
                console.error('❌ Server error:', error);
            }
            process.exit(1);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();