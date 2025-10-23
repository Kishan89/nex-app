// Test script for new backend connection
const testBackendConnection = async () => {
  const newBackendUrl = 'https://nex-app-production.up.railway.app';
  
  console.log('🔍 Testing new backend connection...');
  console.log('Backend URL:', newBackendUrl);
  
  try {
    // Test health endpoint
    console.log('\n📡 Testing health endpoint...');
    const healthResponse = await fetch(`${newBackendUrl}/health`);
    console.log('Health Status:', healthResponse.status);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.text();
      console.log('Health Response:', healthData);
    } else {
      console.log('❌ Health check failed:', healthResponse.statusText);
    }
    
    // Test API endpoint
    console.log('\n📡 Testing API endpoint...');
    const apiResponse = await fetch(`${newBackendUrl}/api/health`);
    console.log('API Status:', apiResponse.status);
    
    if (apiResponse.ok) {
      const apiData = await apiResponse.text();
      console.log('API Response:', apiData);
    } else {
      console.log('❌ API check failed:', apiResponse.statusText);
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.log('\n💡 Possible reasons:');
    console.log('- Backend is still starting up (Render cold start)');
    console.log('- Backend deployment is not complete');
    console.log('- Network connectivity issues');
    console.log('\n🔄 Try again in a few minutes...');
  }
};

// Run the test
testBackendConnection();
