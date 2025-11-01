// lib/firebaseAdmin.js
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Try to load service account key from environment or file
    let serviceAccount;
    
    console.log('🔥 Firebase Admin SDK Initialization Started');
    console.log('🔍 Environment Check:');
    console.log('  - FIREBASE_SERVICE_ACCOUNT_KEY exists:', !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    console.log('  - FIREBASE_PRIVATE_KEY exists:', !!process.env.FIREBASE_PRIVATE_KEY);
    console.log('  - FIREBASE_CLIENT_EMAIL exists:', !!process.env.FIREBASE_CLIENT_EMAIL);
    console.log('  - FIREBASE_PROJECT_ID exists:', !!process.env.FIREBASE_PROJECT_ID);
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Load from environment variable (recommended for production)
      console.log('🔧 Using FIREBASE_SERVICE_ACCOUNT_KEY (JSON format)');
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      console.log('🔧 Parsed Project ID:', serviceAccount.project_id);
      console.log('🔧 Parsed Client Email:', serviceAccount.client_email);
    } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
      // Load from individual environment variables
      console.log('🔧 Using individual Firebase environment variables');
      console.log('🔧 Project ID:', process.env.FIREBASE_PROJECT_ID);
      console.log('🔧 Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
      console.log('🔧 Private Key Length:', process.env.FIREBASE_PRIVATE_KEY?.length);
      serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
      };
    } else {
      // Load from file (for development)
      console.log('🔧 Using local Firebase service account file');
      const serviceAccountPath = path.join(__dirname, '..', 'config', 'firebase-service-account-key.json');
      console.log('🔧 File path:', serviceAccountPath);
      try {
        serviceAccount = require(serviceAccountPath);
        console.log('🔧 File Project ID:', serviceAccount.project_id);
        console.log('🔧 File Client Email:', serviceAccount.client_email);
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
