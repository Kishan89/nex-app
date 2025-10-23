// Debug login endpoint mismatch
const baseUrl = 'https://nex-app-production.up.railway.app';

async function debugLogin() {
  console.log('🔍 Debugging Login Endpoint Mismatch...\n');
  
  // Test the exact endpoint from frontend
  const frontendEndpoint = '/auth/google/mobile';
  const fullUrl = `${baseUrl}/api${frontendEndpoint}`;
  
  console.log('Frontend expects:', fullUrl);
  
  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const data = await response.json();
    console.log(`✅ Endpoint exists! Status: ${response.status}`);
    console.log(`Response:`, data);
    
    if (response.status === 400 && data.error === 'Google ID token is required.') {
      console.log('✅ Google Login endpoint working correctly');
    }
  } catch (error) {
    console.log('❌ Endpoint error:', error.message);
  }
  
  console.log('\n🔍 Checking backend routes...');
  
  // Check what routes are actually available
  try {
    const response = await fetch(`${baseUrl}/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    const data = await response.json();
    console.log('Available endpoints:', data.endpoints);
  } catch (error) {
    console.log('❌ Could not get endpoint list:', error.message);
  }
  
  console.log('\n🔍 Testing alternative login endpoints...');
  
  // Test regular login
  try {
    const response = await fetch(`${baseUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const data = await response.json();
    console.log(`Regular login endpoint: ${response.status} - ${data.error || data.message}`);
  } catch (error) {
    console.log('❌ Regular login error:', error.message);
  }
}

debugLogin().catch(console.error);
