// Test script for backend and Google login
const fetch = require('node-fetch');

const BACKEND_URL = 'https://nex-app-production.up.railway.app';

async function testBackend() {
  console.log('🧪 Testing Backend Health...');
  
  try {
    // Test 1: Health Check
    console.log('📊 Testing health endpoint...');
    const healthResponse = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      timeout: 10000
    });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health Check Success:', healthData);
    } else {
      console.log('❌ Health Check Failed:', healthResponse.status, healthResponse.statusText);
    }
    
  } catch (error) {
    console.error('❌ Backend connection failed:', error.message);
    
    // Try alternative URLs
    console.log('🔄 Trying alternative Railway URLs...');
    
    const alternativeUrls = [
      'https://web-production-4d1a.up.railway.app',
      'https://nexeed-backend.up.railway.app',
      'https://nex-app-backend.up.railway.app'
    ];
    
    for (const url of alternativeUrls) {
      try {
        console.log(`🔄 Trying: ${url}`);
        const response = await fetch(`${url}/health`, { timeout: 5000 });
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Found working URL: ${url}`, data);
          return url;
        }
      } catch (err) {
        console.log(`❌ ${url} failed`);
      }
    }
  }
}

async function testGoogleLogin() {
  console.log('\n🔐 Testing Google Login Endpoint...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/google/mobile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idToken: 'test-token'
      }),
      timeout: 10000
    });
    
    const data = await response.json();
    
    if (response.status === 400 && data.error?.includes('Google ID token is required')) {
      console.log('✅ Google login endpoint is working (expected validation error)');
    } else {
      console.log('📊 Google login response:', response.status, data);
    }
    
  } catch (error) {
    console.error('❌ Google login test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Backend Tests...\n');
  
  await testBackend();
  await testGoogleLogin();
  
  console.log('\n✅ Tests completed!');
}

runTests().catch(console.error);
