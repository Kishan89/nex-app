// controllers/userController.js
const userService = require('../services/userService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library'); 
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'm+5c3lHjzF70C3+AM6qQB4EgIi1T2ixSCviE8ywNv/9K3jZLxMLbR9UFn9+TdK7Ko0AqyL9xHqH0NPyJThvKzA==';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; 

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const register = async (req, res, next) => {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
        return res.status(400).json({ error: 'Please fill in all fields.' });
    }

    try {
        const existingUser = await userService.findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'Email already in use.' });
        }

        const existingUsername = await userService.findUserByUsername(username);
        if (existingUsername) {
            return res.status(409).json({ error: 'Username already taken.' });
        }

        const newUser = await userService.createUser({ email, username, password });
        
        res.status(201).json({
            message: 'User registered successfully.',
            user: {
                id: newUser.id,
                email: newUser.email,
                username: newUser.username,
                bio: newUser.bio || '',
                avatar_url: newUser.avatar || 'https://via.placeholder.com/150',
                banner_url: newUser.banner_url || 'https://via.placeholder.com/600x200',
            },
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        console.error('❌ Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack?.split('\n')[0]
        });
        
        // Provide more specific error messages
        if (error.code === 'P2002') {
            return res.status(409).json({ 
                error: 'User already exists with this email or username.' 
            });
        }
        
        if (error.message?.includes('prepared statement')) {
            return res.status(503).json({ 
                error: 'Database connection issue. Please try again.' 
            });
        }
        
        next(error);
    }
};

const login = async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Please enter both email and password.' });
    }

    try {
        const user = await userService.findUserByEmail(email);
        if (!user) {
            return res.status(404).json({ error: 'User not found. Please register first.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { userId: user.id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            message: 'Login successful.',
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                bio: user.bio || '',
                avatar_url: user.avatar || 'https://via.placeholder.com/150',
                banner_url: user.banner_url || 'https://via.placeholder.com/600x200',
            },
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        console.error('❌ Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack?.split('\n')[0]
        });
        
        // Provide more specific error messages
        if (error.message?.includes('prepared statement')) {
            return res.status(503).json({ 
                error: 'Database connection issue. Please try again.' 
            });
        }
        
        next(error);
    }
};

// NEW CONTROLLER FOR GOOGLE LOGIN
const googleLogin = async (req, res, next) => {
    const { idToken } = req.body; 

    // Validate input parameters
    if (!idToken) {
        return res.status(400).json({ error: 'Google ID token is required.' });
    }

    // Verify server configuration
    if (!GOOGLE_CLIENT_ID) {
        console.error('❌ Backend GOOGLE_CLIENT_ID is not configured.');
        return res.status(500).json({ error: 'Server configuration error. Google login is unavailable.' });
    }

    console.log('🔍 Starting Google ID token verification...');
    console.log('🔑 Using Web Client ID:', GOOGLE_CLIENT_ID);
    console.log('🎫 ID Token length:', idToken.length);

    try {
        // Step 1: Verify the Google ID token with proper audience configuration
        // Use both Web Client ID and Android Client ID as valid audiences
        const webClientId = '775891172931-b6r8as807ahbuiclek3lvqmv2aqqolsa.apps.googleusercontent.com';
        const androidClientId = '775891172931-ncpt427eouiuf45eb918nfgdh73njcjn.apps.googleusercontent.com';
        
        console.log('🔍 Attempting token verification with multiple audiences...');
        
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            // Accept both Web and Android client IDs as valid audiences
            audience: [webClientId, androidClientId]
        });

        // Step 2: Extract user information from the verified token
        const payload = ticket.getPayload();
        const googleEmail = payload.email;
        const googleName = payload.name;
        const googlePicture = payload.picture;
        const googleSub = payload.sub; // Google's unique user identifier

        console.log('✅ Google token verification successful!');
        console.log('📧 Email:', googleEmail);
        console.log('👤 Name:', googleName);
        console.log('🆔 Google ID:', googleSub);

        // Step 3: Validate essential user data
        if (!googleEmail) {
            console.error('❌ No email found in Google token payload');
            return res.status(400).json({ error: 'Could not retrieve email from Google token.' });
        }

        // Step 4: Find or create user in our database
        console.log('🔍 Finding or creating user in database...');
        const user = await userService.findOrCreateUserByGoogleEmail(googleEmail, { 
            name: googleName, 
            picture: googlePicture,
            googleId: googleSub 
        });

        console.log('✅ User found/created:', { id: user.id, email: user.email, username: user.username });

        // Step 5: Generate JWT token for our application
        const token = jwt.sign(
            { userId: user.id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('✅ JWT token generated successfully');

        // Step 6: Return successful response with user data and auth token
        res.status(200).json({
            message: 'Google login successful.',
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                bio: user.bio || '',
                avatar_url: user.avatar || googlePicture || 'https://via.placeholder.com/150', 
                banner_url: user.banner_url || 'https://via.placeholder.com/600x200',
            },
        });

    } catch (error) {
        console.error('❌ Google login error:', error.message);
        console.error('❌ Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack?.split('\n')[0]
        });
        
        // Handle specific Google authentication errors
        if (error.message?.includes('Wrong recipient') || error.message?.includes('audience')) {
            console.error('❌ Audience mismatch error - token was issued for different client');
            return res.status(401).json({ 
                error: 'Invalid Google authentication token. Please try signing in again.' 
            });
        }
        
        if (error.message?.includes('Invalid ID token') || error.message?.includes('Token used too late')) {
            console.error('❌ Invalid or expired token');
            return res.status(401).json({ 
                error: 'Google authentication token is invalid or expired. Please try signing in again.' 
            });
        }

        // Handle network/connectivity issues
        if (error.message?.includes('fetch') || error.message?.includes('network')) {
            console.error('❌ Network error during token verification');
            return res.status(503).json({ 
                error: 'Unable to verify Google token due to network issues. Please try again.' 
            });
        }
        
        // Handle database connection issues with retry mechanism
        if (error.message?.includes('prepared statement') || error.code === 'P2024' || 
            error.message?.includes('connection pool') || error.code === 'P2010') {
            console.error('❌ Database connection issue detected:', error.code, error.message);
            
            // Try to reset database connection
            try {
                const { resetConnection } = require('../config/database');
                console.log('🔄 Attempting to reset database connection...');
                await resetConnection();
                
                // Retry the user creation/lookup once after connection reset
                console.log('🔄 Retrying user operation after connection reset...');
                const retryUser = await userService.findOrCreateUserByGoogleEmail(googleEmail, { 
                    name: googleName, 
                    picture: googlePicture,
                    googleId: googleSub 
                });
                
                if (retryUser) {
                    console.log('✅ Retry successful after connection reset');
                    const retryToken = jwt.sign({ userId: retryUser.id }, JWT_SECRET, { expiresIn: '7d' });
                    
                    return res.status(200).json({
                        message: 'Google login successful.',
                        token: retryToken,
                        user: {
                            id: retryUser.id,
                            email: retryUser.email,
                            username: retryUser.username,
                            bio: retryUser.bio || '',
                            avatar_url: retryUser.avatar || googlePicture || 'https://via.placeholder.com/150', 
                            banner_url: retryUser.banner_url || 'https://via.placeholder.com/600x200',
                        },
                    });
                }
            } catch (retryError) {
                console.error('❌ Retry after connection reset failed:', retryError.message);
            }
            
            return res.status(503).json({ 
                error: 'Database connection issue. Please try again in a moment.' 
            });
        }

        // Handle user creation/database errors
        if (error.code === 'P2002') {
            console.error('❌ User already exists with conflicting data');
            return res.status(409).json({ 
                error: 'Account with this email already exists.' 
            });
        }
        
        // Generic server error - don't expose internal details
        console.error('❌ Unexpected error during Google login:', error);
        return res.status(500).json({ 
            error: 'An unexpected error occurred during Google sign-in. Please try again.' 
        });
    }
};

// Return the current authenticated user's profile
const getMeProfile = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        const user = await userService.findUserById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Get follow counts for the current user
        const followService = require('../services/followService');
        let followCounts = { followers: 0, following: 0 };
        
        try {
            followCounts = await followService.getFollowCounts(user.id);
            console.log('📊 Follow counts for current user:', { userId: user.id, counts: followCounts });
        } catch (countError) {
            console.error('❌ Error getting follow counts for current user:', countError);
            // Continue with default counts if error
        }

        const userProfile = {
            id: user.id,
            email: user.email,
            username: user.username,
            bio: user.bio || '',
            avatar_url: user.avatar || 'https://via.placeholder.com/150',
            banner_url: user.banner_url || 'https://via.placeholder.com/600x200',
            xp: user.xp || 0,
            followers_count: followCounts.followers,
            following_count: followCounts.following
        };

        res.status(200).json(userProfile);
    } catch (error) {
        console.error('Error fetching current user profile:', error);
        next(error);
    }
};


const getUserProfile = async (req, res, next) => {
    try {
        const { userId } = req.params;
        
        console.log('🔍 getUserProfile called with userId:', userId);
        
        // Try to find user by ID first, then by username if ID lookup fails
        let user;
        
        // Check if userId looks like a CUID (starts with 'c' and has the right length)
        if (userId.startsWith('c') && userId.length > 20) {
            console.log('🔍 Looking up user by ID:', userId);
            user = await userService.findUserById(userId);
        } else {
            console.log('🔍 Looking up user by username:', userId);
            // If it doesn't look like an ID, treat it as username
            user = await userService.findUserByUsername(userId);
        }

        if (!user) {
            console.log('❌ User not found for:', userId);
            return res.status(404).json({ error: 'User not found.' });
        }

        console.log('✅ User found:', { id: user.id, username: user.username });

        // Get follow counts for the user
        const followService = require('../services/followService');
        let followCounts = { followers: 0, following: 0 };
        
        try {
            followCounts = await followService.getFollowCounts(user.id);
            console.log('📊 Follow counts for user:', { userId: user.id, counts: followCounts });
        } catch (countError) {
            console.error('❌ Error getting follow counts:', countError);
            // Continue with default counts if error
        }

        const userProfile = {
            id: user.id,
            email: user.email,
            username: user.username,
            bio: user.bio || '',
            avatar_url: user.avatar || 'https://via.placeholder.com/150',
            banner_url: user.banner_url || 'https://via.placeholder.com/600x200',
            website: user.website || '',
            location: user.location || '',
            verified: user.verified || false,
            xp: user.xp || 0,
            followers_count: followCounts.followers,
            following_count: followCounts.following
        };

        res.status(200).json(userProfile);
    } catch (error) {
        console.error('❌ Error fetching user profile:', error);
        next(error);
    }
};

const updateUserProfile = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const updates = req.body;

        // Map avatar_url → avatar
        if (updates.avatar_url) {
            updates.avatar = updates.avatar_url;
            delete updates.avatar_url;
        }

        if (updates.banner_url) {
        }

        if (updates.password) {
            delete updates.password;
        }

        const updatedUser = await userService.updateUser(userId, updates);

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Return updated user profile details
        const userProfile = {
            id: updatedUser.id,
            email: updatedUser.email,
            username: updatedUser.username,
            bio: updatedUser.bio || '',
            avatar_url: updatedUser.avatar || 'https://via.placeholder.com/150',
            banner_url: updatedUser.banner_url || 'https://via.placeholder.com/600x200',
        };

        res.status(200).json({ message: 'Profile updated successfully.', user: userProfile });
    } catch (error) {
        console.error('Error updating user profile:', error);
        
        // Handle username taken error specifically
        if (error.message && error.message.includes('Username is already taken')) {
            return res.status(400).json({ 
                error: 'Username is already taken. Please choose a different username.',
                code: 'USERNAME_TAKEN'
            });
        }
        
        // Handle user not found
        if (error.message && error.message.includes('User not found')) {
            return res.status(404).json({ error: 'User not found.' });
        }
        
        // Generic error
        res.status(500).json({ error: 'Failed to update profile. Please try again.' });
    }
};

const getBookmarks = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const bookmarks = await userService.getBookmarks(userId);
        res.status(200).json(bookmarks);
    } catch (error) {
        console.error('Error fetching bookmarks:', error);
        next(error);
    }
};

// Add a search function for users
const searchUsers = async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.status(400).json({ 
                error: 'Search query parameter "q" is required and must be at least 2 characters long.' 
            });
        }
        
        // Call the new service function to perform the search
        const users = await userService.searchUsersByUsername(q);
        
        // Send a success response with the search results
        res.status(200).json({ users });
    } catch (error) {
        console.error('Error searching for users:', error);
        next(error);
    }
};

const deleteAvatar = async (req, res, next) => {
    try {
        const { userId } = req.params;

        // Use the updateUserService to set avatar to null
        const updatedUser = await userService.updateUser(userId, { avatar: null });

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json({ message: 'Avatar deleted successfully.' });
    } catch (error) {
        console.error('Error deleting avatar:', error);
        next(error);
    }
};

const deleteBanner = async (req, res, next) => {
    try {
        const { userId } = req.params;

        // Use the updateUserService to set banner_url to null
        const updatedUser = await userService.updateUser(userId, { banner_url: null });

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json({ message: 'Banner deleted successfully.' });
    } catch (error) {
        console.error('Error deleting banner:', error);
        next(error);
    }
};

// Block a user
const blockUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const blockerId = req.user.userId;

        if (userId === blockerId) {
            return res.status(400).json({ error: 'You cannot block yourself.' });
        }

        // Check if user exists
        const userToBlock = await userService.getUserById(userId);
        if (!userToBlock) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Create block relationship
        const { prisma } = require('../config/database');
        await prisma.userBlock.create({
            data: {
                blockerId: blockerId,
                blockedId: userId
            }
        });

        console.log(`✅ User ${blockerId} blocked user ${userId}`);
        res.status(200).json({ 
            success: true, 
            message: `User ${userToBlock.username} has been blocked.` 
        });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'User is already blocked.' });
        }
        console.error('❌ Error blocking user:', error);
        next(error);
    }
};

// Unblock a user
const unblockUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const blockerId = req.user.userId;

        // Remove block relationship
        const { prisma } = require('../config/database');
        const deletedBlock = await prisma.userBlock.deleteMany({
            where: {
                blockerId: blockerId,
                blockedId: userId
            }
        });

        if (deletedBlock.count === 0) {
            return res.status(404).json({ error: 'User is not blocked.' });
        }

        console.log(`✅ User ${blockerId} unblocked user ${userId}`);
        res.status(200).json({ 
            success: true, 
            message: 'User has been unblocked.' 
        });
    } catch (error) {
        console.error('❌ Error unblocking user:', error);
        next(error);
    }
};

module.exports = {
    register,
    login,
    googleLogin,
    getMeProfile,
    getUserProfile,
    updateUserProfile,
    getBookmarks,
    searchUsers,
    deleteAvatar,
    deleteBanner,
    blockUser,
    unblockUser,
};