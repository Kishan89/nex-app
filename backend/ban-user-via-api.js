// backend/ban-user-via-api.js
const fetch = require('node-fetch');

const API_URL = 'https://nex-app-production.up.railway.app/api';
// Replace with your admin credentials
const ADMIN_EMAIL = 'nexapp8@gmail.com'; 
const ADMIN_PASSWORD = 'YOUR_PASSWORD_HERE'; // You need to enter this
const USER_TO_BAN = 'cmih86hme001bqr0f6nf1e30b'; // The user ID from your logs

async function banUser() {
    console.log('1. Logging in as Admin...');
    
    // 1. Login
    const loginRes = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    
    const loginData = await loginRes.json();
    
    if (!loginData.token) {
        console.error('❌ Login failed:', loginData);
        return;
    }
    
    console.log('✅ Login successful. Token received.');
    
    // 2. Ban User
    console.log(`2. Banning user ${USER_TO_BAN}...`);
    
    const banRes = await fetch(`${API_URL}/admin/users/ban`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify({ 
            userId: USER_TO_BAN, 
            reason: 'Banned via API Script' 
        })
    });
    
    const banData = await banRes.json();
    console.log('Response:', banData);
    
    if (banRes.ok) {
        console.log('✅ User banned successfully via API!');
        console.log('👉 Now check your app, it should redirect.');
    } else {
        console.error('❌ Ban failed:', banData);
    }
}

// Note: You need to edit this file and add your password before running
console.log('Please edit this file and add your admin password first!');
// banUser(); 
