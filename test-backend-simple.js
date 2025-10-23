// Simple backend test using built-in fetch (Node 18+)
const BACKEND_URL = 'https://nex-app-production.up.railway.app';

async function testBackend() {
  console.log('🧪 Testing Backend: ' + BACKEND_URL);
  console.log('=' .repeat(50));
  
  // Test 1: Health Check
  console.log('\n📊 Test 1: Health Check');
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Health Check SUCCESS');
      console.log('📊 Status:', response.status);
      console.log('📊 Data:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Health Check FAILED');
      console.log('📊 Status:', response.status);
      console.log('📊 Status Text:', response.statusText);
    }
  } catch (error) {
    console.log('❌ Health Check ERROR:', error.message);
  }
  
  // Test 2: API Health
  console.log('\n📊 Test 2: API Health Check');
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Health Check SUCCESS');
      console.log('📊 Status:', response.status);
      console.log('📊 Data:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ API Health Check FAILED');
      console.log('📊 Status:', response.status);
    }
  } catch (error) {
    console.log('❌ API Health Check ERROR:', error.message);
  }
  
  // Test 3: Google Login Endpoint (should return validation error)
  console.log('\n🔐 Test 3: Google Login Endpoint');
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/google/mobile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        idToken: 'test-invalid-token'
      })
    });
    
    const data = await response.json();
    console.log('📊 Google Login Response Status:', response.status);
    console.log('📊 Google Login Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 400 && data.error) {
      console.log('✅ Google Login Endpoint is WORKING (expected validation error)');
    } else if (response.status === 500) {
      console.log('⚠️ Google Login has server error (database issue)');
    } else {
      console.log('🤔 Unexpected response from Google Login');
    }
  } catch (error) {
    console.log('❌ Google Login Test ERROR:', error.message);
  }
  
  // Test 4: Posts Endpoint
  console.log('\n📝 Test 4: Posts Endpoint');
  try {
    const response = await fetch(`${BACKEND_URL}/api/posts?page=1&limit=5`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log('📊 Posts Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Posts Endpoint SUCCESS');
      console.log('📊 Posts Count:', Array.isArray(data) ? data.length : 'Not an array');
    } else {
      const errorData = await response.json().catch(() => null);
      console.log('❌ Posts Endpoint FAILED');
      console.log('📊 Error:', errorData);
    }
  } catch (error) {
    console.log('❌ Posts Test ERROR:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Backend Test Complete!');
}

// Run the test
testBackend().catch(console.error);
