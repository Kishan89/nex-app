// Railway deployment checker
const RAILWAY_URL = 'https://nex-app-production.up.railway.app';

async function checkRailwayDeployment() {
  console.log('🚂 Checking Railway Deployment...');
  console.log('URL:', RAILWAY_URL);
  console.log('=' .repeat(50));
  
  let attempts = 0;
  const maxAttempts = 10;
  const delay = 30000; // 30 seconds
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`\n🔄 Attempt ${attempts}/${maxAttempts}`);
    
    try {
      const response = await fetch(`${RAILWAY_URL}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Railway deployment is LIVE!');
        console.log('📊 Health data:', JSON.stringify(data, null, 2));
        
        // Test database connection
        if (data.database === 'connected') {
          console.log('✅ Database connection: SUCCESS');
        } else {
          console.log('⚠️ Database connection:', data.database || 'unknown');
        }
        
        return true;
      } else {
        console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      if (error.name === 'TimeoutError') {
        console.log('⏰ Request timeout (15s)');
      } else if (error.message.includes('fetch failed')) {
        console.log('🔌 Connection failed - deployment not ready');
      } else {
        console.log('❌ Error:', error.message);
      }
    }
    
    if (attempts < maxAttempts) {
      console.log(`⏳ Waiting ${delay/1000} seconds before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.log('\n❌ Railway deployment failed to come online');
  console.log('🔍 Possible issues:');
  console.log('  - Build failed');
  console.log('  - Database connection issues');
  console.log('  - Environment variables missing');
  console.log('  - Railway service down');
  
  return false;
}

// Run the checker
checkRailwayDeployment().catch(console.error);
