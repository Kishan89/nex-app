// backend/send-warning.js
const fetch = require('node-fetch');
const readline = require('readline');

const API_URL = 'https://nex-app-production.up.railway.app/api';
// Replace with your admin credentials or set via environment variables
const ADMIN_EMAIL = 'nexapp8@gmail.com'; 
const ADMIN_PASSWORD = 'YOUR_PASSWORD_HERE'; // ⚠️ Edit this before running!

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function sendWarning() {
    console.log('⚠️  NexApp Warning Notification Tool ⚠️\n');

    // 1. Login
    console.log('Logging in...');
    try {
        const loginRes = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });
        
        const loginData = await loginRes.json();
        
        if (!loginData.token) {
            console.error('❌ Login failed:', loginData);
            process.exit(1);
        }
        console.log('✅ Login successful!\n');

        // 2. Get User ID
        rl.question('Enter User ID to warn: ', (userId) => {
            if (!userId) {
                console.error('User ID is required!');
                process.exit(1);
            }

            // 3. Get Warning Message
            rl.question('Enter Warning Message: ', async (message) => {
                if (!message) {
                    console.error('Message is required!');
                    process.exit(1);
                }

                console.log(`\nSending warning to ${userId}...`);
                
                try {
                    const warnRes = await fetch(`${API_URL}/notifications/warning`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${loginData.token}` // Although this endpoint might not strictly require auth in code, it's good practice
                        },
                        body: JSON.stringify({ 
                            userIds: [userId], 
                            message: message,
                            title: '⚠️ Official Warning'
                        })
                    });
                    
                    const warnData = await warnRes.json();
                    
                    if (warnRes.ok) {
                        console.log('✅ Warning sent successfully!');
                        console.log('Response:', warnData);
                    } else {
                        console.error('❌ Failed to send warning:', warnData);
                    }
                } catch (err) {
                    console.error('Error sending warning:', err);
                } finally {
                    rl.close();
                }
            });
        });

    } catch (err) {
        console.error('Login error:', err);
        rl.close();
    }
}

console.log('Please ensure you have set the ADMIN_PASSWORD in this file before running.');
sendWarning();
