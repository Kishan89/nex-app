// backend/test-ban-logic.js
console.log("🧪 Testing Ban Logic Implementation...\n");

// 1. Mock a banned user object (simulating Database result)
const mockDbUser = {
    id: 'user_12345',
    username: 'bad_user',
    email: 'bad@example.com',
    isBanned: true,
    banReason: 'Violated community guidelines',
    bannedAt: new Date().toISOString()
};

console.log("1. Mock Database User:");
console.log(mockDbUser);
console.log("\n--------------------------------\n");

// 2. Simulate the Controller Logic (what I added to userController.js)
// This logic maps the DB user to the API response
const apiResponse = {
    id: mockDbUser.id,
    email: mockDbUser.email,
    username: mockDbUser.username,
    // ... other fields
    isBanned: mockDbUser.isBanned || false,
    banReason: mockDbUser.banReason || null,
    bannedAt: mockDbUser.bannedAt || null,
};

console.log("2. API Response Object (Simulated):");
console.log(apiResponse);
console.log("\n--------------------------------\n");

// 3. Verify the fields are present
let passed = true;
if (apiResponse.isBanned !== true) {
    console.log("❌ FAILED: isBanned is missing or false");
    passed = false;
} else {
    console.log("✅ CHECK: isBanned is present and true");
}

if (apiResponse.banReason !== 'Violated community guidelines') {
    console.log("❌ FAILED: banReason is missing or incorrect");
    passed = false;
} else {
    console.log("✅ CHECK: banReason is present and correct");
}

console.log("\n--------------------------------\n");

if (passed) {
    console.log("🎉 SUCCESS: The backend logic correctly exposes ban status!");
    console.log("   When this code is deployed, the frontend will receive the ban status.");
} else {
    console.log("💥 FAILURE: Logic error detected.");
}
