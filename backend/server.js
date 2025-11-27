// Nexeed Backend Server - Direct URL Fix v2.2
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const corsMiddleware = require('./middleware/cors');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { lightDbCheck } = require('./middleware/dbHealth');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { dbMonitor } = require('./utils/dbMonitor');
const apiRoutes = require('./routes');
const pushTokenRoutes = require('./routes/pushTokenRoutes');
const socketService = require('./services/socketService');
const queueService = require('./services/queueService');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Global middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(corsMiddleware);

// Serve static files for deep link redirect page
app.use(express.static(path.join(__dirname, 'public')));

// Deep link redirect routes for web -> app (MUST be before API routes)
app.get('/post/:postId', (req, res) => {
    console.log('📱 Redirect request for post:', req.params.postId);
    res.sendFile(path.join(__dirname, 'public', 'redirect.html'));
});
app.get('/profile/:userId', (req, res) => {
    console.log('📱 Redirect request for profile:', req.params.userId);
    res.sendFile(path.join(__dirname, 'public', 'redirect.html'));
});
app.get('/p/:postId', (req, res) => {
    console.log('📱 Redirect request for short post:', req.params.postId);
    res.sendFile(path.join(__dirname, 'public', 'redirect.html'));
});

app.use('/api/push-tokens', pushTokenRoutes);
// ⭐️ Using Supabase Storage for file uploads

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
        next();
    });
}

// Health check endpoint (before API routes) - Railway compatible
app.get('/health', async (req, res) => {
    console.log('🔍 Health check requested');
    
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'production',
        port: PORT,
        host: HOST
    };

    // Check if DATABASE_URL exists
    if (!process.env.DATABASE_URL) {
        console.log('⚠️ DATABASE_URL not configured');
        healthStatus.database = 'not_configured';
        healthStatus.message = 'Server running but database not configured';
        return res.status(200).json(healthStatus);
    }

    // Try database connection (with timeout)
    try {
        const { prisma } = require('./config/database');
        await Promise.race([
            prisma.$queryRaw`SELECT 1`,
            new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 5000))
        ]);
        healthStatus.database = 'connected';
        console.log('✅ Health check passed - database connected');
    } catch (error) {
        console.log('⚠️ Database check failed:', error.message);
        healthStatus.database = 'disconnected';
        healthStatus.database_error = error.message;
        // Still return 200 OK for Railway health check
    }

    res.status(200).json(healthStatus);
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
            console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
            console.log(`📝 API endpoints: http://${HOST}:${PORT}/api/*`);
            console.log(`🔌 Socket.IO: ✅ Enabled and ready for connections`);
            console.log(`💬 Chat WebSocket: ws://${HOST}:${PORT}/socket.io/`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
            console.log('');
            console.log('📱 Mobile apps can now connect to Socket.IO for real-time chat');
        });

        // Connect to database AFTER server starts (async)
        connectDatabase().then(async (dbConnected) => {
            if (!dbConnected) {
                console.log('⚠️ Database connection delayed, but server is running');
            } else {
                console.log('✅ Database connected and verified successfully');
                
                // Seed achievement definitions
                try {
                    const achievementService = require('./services/achievementService');
                    await achievementService.seedAchievements();
                    console.log('✅ Achievement definitions seeded');
                } catch (error) {
                    console.error('⚠️ Failed to seed achievements:', error.message);
                }
                
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