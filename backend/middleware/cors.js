const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:8081', // Expo dev server
      'http://localhost:19000', // Expo dev server (alternative port)
      'http://localhost:19006', // Expo web
      'http://127.0.0.1:8081',
      'http://127.0.0.1:19000',
      'http://127.0.0.1:19006',
      process.env.FRONTEND_URL,
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
};

// For development, allow all origins
if (process.env.NODE_ENV === 'development') {
  corsOptions.origin = true;
}

module.exports = cors(corsOptions);
