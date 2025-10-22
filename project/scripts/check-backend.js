#!/usr/bin/env node

// Backend Health Check Script for Nexeed App
const https = require('https');

const BACKEND_URL = 'https://nexeed-t2wb.onrender.com';

async function checkEndpoint(path, description) {
    return new Promise((resolve) => {
        const url = `${BACKEND_URL}${path}`;
        console.log(`🔍 Checking ${description}: ${url}`);
        
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    console.log(`✅ ${description}: Status ${res.statusCode}`);
                    if (parsed.status) console.log(`   Status: ${parsed.status}`);
                    if (parsed.database) console.log(`   Database: ${parsed.database}`);
                    if (parsed.message) console.log(`   Message: ${parsed.message}`);
                    resolve(true);
                } catch (e) {
                    console.log(`✅ ${description}: Status ${res.statusCode} (Non-JSON response)`);
                    resolve(true);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`❌ ${description}: ${error.message}`);
            resolve(false);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            console.log(`⏰ ${description}: Timeout (10s)`);
            resolve(false);
        });
    });
}

async function main() {
    console.log('🚀 Nexeed Backend Health Check');
    console.log('================================');
    
    const checks = [
        ['/', 'Root Endpoint'],
        ['/health', 'Health Check'],
        ['/wake-db', 'Database Wake-up'],
        ['/api', 'API Base']
    ];
    
    let allPassed = true;
    
    for (const [path, description] of checks) {
        const result = await checkEndpoint(path, description);
        if (!result) allPassed = false;
        console.log(''); // Empty line
    }
    
    console.log('================================');
    if (allPassed) {
        console.log('✅ All checks passed! Backend is healthy.');
    } else {
        console.log('❌ Some checks failed. Backend may be down or starting up.');
        console.log('💡 Try again in a few minutes if deployment is in progress.');
    }
}

main().catch(console.error);
