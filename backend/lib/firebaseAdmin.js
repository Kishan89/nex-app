// lib/firebaseAdmin.js
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Try to load service account key from environment or file
    let serviceAccount;
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Load from environment variable (recommended for production)
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } else {
      // Load from file (for development)
      const serviceAccountPath = path.join(__dirname, '..', 'config', 'firebase-service-account-key.json');
      try {
        serviceAccount = require(serviceAccountPath);
      } catch (error) {
        console.warn('⚠️ Firebase service account key not found. FCM notifications will not work.');
        console.warn('Please add firebase-service-account-key.json to backend/config/ or set FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
        
        // Create a mock admin object to prevent crashes
        module.exports = {
          messaging: () => ({
            sendEachForMulticast: async () => ({ successCount: 0, failureCount: 0, responses: [] }),
            send: async () => ({ messageId: 'mock' }),
          }),
          apps: [],
        };
        return;
      }
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || 'nexeed-627c6',
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error);
    
    // Create a mock admin object to prevent crashes
    module.exports = {
      messaging: () => ({
        sendEachForMulticast: async () => ({ successCount: 0, failureCount: 0, responses: [] }),
        send: async () => ({ messageId: 'mock' }),
      }),
      apps: [],
    };
    return;
  }
}

module.exports = admin;
