#!/usr/bin/env node

// Database Wake-up Script for Supabase Free Tier
const https = require('https');

const BACKEND_URL = 'https://nex-app-production.up.railway.app';

async function wakeDatabase() {
    return new Promise((resolve) => {
        console.log('🔄 Attempting to wake up Supabase database...');
        
        const req = https.get(`${BACKEND_URL}/wake-db`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode === 200) {
                        console.log('✅ Database wake-up successful!');
                        console.log(`   Status: ${parsed.status}`);
                        console.log(`   Message: ${parsed.message}`);
                        resolve(true);
                    } else {
                        console.log(`❌ Database wake-up failed (${res.statusCode})`);
                        console.log(`   Status: ${parsed.status}`);
                        console.log(`   Message: ${parsed.message}`);
                        resolve(false);
                    }
                } catch (e) {
                    console.log(`❌ Invalid response: ${data}`);
                    resolve(false);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`❌ Network error: ${error.message}`);
            resolve(false);
        });
        
        req.setTimeout(30000, () => {
            req.destroy();
            console.log('⏰ Wake-up request timeout (30s)');
            resolve(false);
        });
    });
}

async function checkHealth() {
    return new Promise((resolve) => {
        console.log('🩺 Checking database health...');
        
        const req = https.get(`${BACKEND_URL}/health`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.database === 'connected') {
                        console.log('✅ Database is now connected!');
                        resolve(true);
                    } else {
                        console.log(`❌ Database still disconnected: ${parsed.error || 'Unknown error'}`);
                        resolve(false);
                    }
                } catch (e) {
                    console.log(`❌ Health check failed: ${data}`);
                    resolve(false);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`❌ Health check error: ${error.message}`);
            resolve(false);
        });
        
        req.setTimeout(15000, () => {
            req.destroy();
            console.log('⏰ Health check timeout');
            resolve(false);
        });
    });
}

async function main() {
    console.log('🚀 Nexeed Database Wake-up Tool');
    console.log('===============================');
    
    // Try to wake up database
    const wakeResult = await wakeDatabase();
    
    if (wakeResult) {
        console.log('\n⏳ Waiting 5 seconds for database to fully initialize...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check if database is actually connected
        const healthResult = await checkHealth();
        
        if (healthResult) {
            console.log('\n🎉 Success! Database is now active and ready.');
            console.log('💡 You can now try logging into the app.');
        } else {
            console.log('\n⚠️ Database wake-up initiated but connection not confirmed.');
            console.log('💡 Try again in a few minutes or check Supabase dashboard.');
        }
    } else {
        console.log('\n❌ Failed to wake up database.');
        console.log('💡 Possible solutions:');
        console.log('   1. Wait a few minutes and try again');
        console.log('   2. Check Supabase dashboard for database status');
        console.log('   3. Verify environment variables on Render');
    }
}

main().catch(console.error);
