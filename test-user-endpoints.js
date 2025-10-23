// Test user endpoints
const baseUrl = 'https://nex-app-production.up.railway.app';

async function testUserEndpoints() {
  console.log('👤 Testing User Endpoints...\n');
  
  // Test 1: Register endpoint
  console.log('1️⃣ Testing User Registration (missing data)...');
  try {
    const response = await fetch(`${baseUrl}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);
    
    if (response.status === 400) {
      console.log('✅ Registration endpoint working (proper validation)');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n');
  
  // Test 2: Search users endpoint
  console.log('2️⃣ Testing User Search...');
  try {
    const response = await fetch(`${baseUrl}/api/search/users?q=test`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);
    
    if (response.status === 200) {
      console.log('✅ User search endpoint working');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n');
  
  // Test 3: Get user profile (invalid user)
  console.log('3️⃣ Testing User Profile (invalid user)...');
  try {
    const response = await fetch(`${baseUrl}/api/users/nonexistent/profile`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);
    
    if (response.status === 404) {
      console.log('✅ User profile endpoint working (proper validation)');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n');
  
  // Test 4: Get authenticated user profile (no token)
  console.log('4️⃣ Testing Authenticated Profile (no token)...');
  try {
    const response = await fetch(`${baseUrl}/api/users/me/profile`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);
    
    if (response.status === 401) {
      console.log('✅ Auth protection working properly');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testUserEndpoints().catch(console.error);
