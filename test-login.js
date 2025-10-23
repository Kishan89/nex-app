// Test login endpoints
const baseUrl = 'https://nex-app-production.up.railway.app';

async function testLogin() {
  console.log('🔐 Testing Login Endpoints...\n');
  
  // Test 1: Google Login with missing token
  console.log('1️⃣ Testing Google Login (missing token)...');
  try {
    const response = await fetch(`${baseUrl}/api/auth/google/mobile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);
    
    if (response.status === 400 && data.error === 'Google ID token is required.') {
      console.log('✅ Google Login endpoint working (proper validation)');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n');
  
  // Test 2: Google Login with invalid token
  console.log('2️⃣ Testing Google Login (invalid token)...');
  try {
    const response = await fetch(`${baseUrl}/api/auth/google/mobile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'invalid-test-token' })
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);
    
    if (response.status === 401 || response.status === 400) {
      console.log('✅ Google Login properly validates tokens');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n');
  
  // Test 3: Regular Login with missing credentials
  console.log('3️⃣ Testing Regular Login (missing credentials)...');
  try {
    const response = await fetch(`${baseUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);
    
    if (response.status === 400) {
      console.log('✅ Regular Login endpoint working (proper validation)');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n');
  
  // Test 4: Regular Login with invalid credentials
  console.log('4️⃣ Testing Regular Login (invalid credentials)...');
  try {
    const response = await fetch(`${baseUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'test@example.com', 
        password: 'wrongpassword' 
      })
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);
    
    if (response.status === 404 || response.status === 401) {
      console.log('✅ Regular Login properly validates credentials');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testLogin().catch(console.error);
