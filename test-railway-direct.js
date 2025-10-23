// Direct Railway test with multiple URL formats
const possibleUrls = [
  'https://nex-app-production.up.railway.app',
  'https://web-production-4d1a.up.railway.app',
  'https://nexeed-backend.up.railway.app',
  'https://nex-app-backend.up.railway.app',
  'https://nex-app-production-production.up.railway.app'
];

async function testRailwayUrls() {
  console.log('🚂 Testing Railway URLs...\n');
  
  for (const url of possibleUrls) {
    console.log(`🔄 Testing: ${url}`);
    
    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ SUCCESS! Working URL: ${url}`);
        console.log('📊 Health Data:', JSON.stringify(data, null, 2));
        
        // Test Google login endpoint
        console.log('\n🔐 Testing Google Login...');
        try {
          const loginResponse = await fetch(`${url}/api/auth/google/mobile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: 'test-token' }),
            signal: AbortSignal.timeout(10000)
          });
          
          const loginData = await loginResponse.json();
          console.log('📊 Login Response:', loginResponse.status);
          console.log('📊 Login Data:', JSON.stringify(loginData, null, 2));
          
          if (loginResponse.status === 400 && loginData.error) {
            console.log('✅ Google Login endpoint is working (expected validation error)');
          }
          
        } catch (loginError) {
          console.log('❌ Google Login test failed:', loginError.message);
        }
        
        return url; // Return working URL
        
      } else {
        console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      if (error.name === 'TimeoutError') {
        console.log('⏰ Timeout (10s)');
      } else if (error.message.includes('fetch failed')) {
        console.log('🔌 Connection failed');
      } else {
        console.log('❌ Error:', error.message);
      }
    }
    
    console.log(''); // Empty line
  }
  
  console.log('❌ No working Railway URL found');
  return null;
}

// Run the test
testRailwayUrls().then(workingUrl => {
  if (workingUrl) {
    console.log(`\n🎉 Use this URL: ${workingUrl}`);
  } else {
    console.log('\n💡 Check Railway dashboard for correct URL');
  }
}).catch(console.error);
