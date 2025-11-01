const userService = require('../services/userService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library'); 
const { createLogger } = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants');
const { BadRequestError, UnauthorizedError, NotFoundError } = require('../utils/errors');
require('dotenv').config();

const logger = createLogger('UserController');

const JWT_SECRET = process.env.JWT_SECRET || 'm+5c3lHjzF70C3+AM6qQB4EgIi1T2ixSCviE8ywNv/9K3jZLxMLbR9UFn9+TdK7Ko0AqyL9xHqH0NPyJThvKzA==';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; 

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const register = async (req, res, next) => {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
        throw new BadRequestError('Please fill in all fields.');
    }

    try {
        const existingUser = await userService.findUserByEmail(email);
        if (existingUser) {
            return res.status(HTTP_STATUS.CONFLICT).json({ error: 'Email already in use.' });
        }

        const existingUsername = await userService.findUserByUsername(username);
        if (existingUsername) {
            return res.status(HTTP_STATUS.CONFLICT).json({ error: 'Username already taken.' });
        }

        const newUser = await userService.createUser({ email, username, password });
        
        res.status(HTTP_STATUS.CREATED).json({
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
        logger.error('Registration error:', error);
        
        if (error.code === 'P2002') {
            return res.status(HTTP_STATUS.CONFLICT).json({ 
                error: 'User already exists with this email or username.' 
            });
        }
        
        if (error.message?.includes('prepared statement')) {
            return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({ 
                error: 'Database connection issue. Please try again.' 
            });
        }
        
        next(error);
    }
};

const login = async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new BadRequestError('Please enter both email and password.');
    }

    try {
        const user = await userService.findUserByEmail(email);
        if (!user) {
            throw new NotFoundError('User not found. Please register first.');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new UnauthorizedError('Invalid credentials.');
        }

        const token = jwt.sign(
            { userId: user.id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(HTTP_STATUS.OK).json({
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
        logger.error('Login error:', error);
        
        if (error.message?.includes('prepared statement')) {
            return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({ 
                error: 'Database connection issue. Please try again.' 
            });
        }
        
        next(error);
    }
};

const googleLogin = async (req, res, next) => {
    const { idToken } = req.body; 

    if (!idToken) {
        throw new BadRequestError('Google ID token is required.');
    }

    if (!GOOGLE_CLIENT_ID) {
        logger.error('Backend GOOGLE_CLIENT_ID is not configured.');
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Server configuration error. Google login is unavailable.' });
    }

    logger.debug('Starting Google ID token verification...');
    logger.debug('Using Web Client ID:', GOOGLE_CLIENT_ID);
    logger.debug('ID Token length:', idToken.length);

    try {
        const webClientId = '775891172931-b6r8as807ahbuiclek3lvqmv2aqqolsa.apps.googleusercontent.com';
        const androidClientId = '775891172931-ncpt427eouiuf45eb918nfgdh73njcjn.apps.googleusercontent.com';
        
        logger.debug('Attempting token verification with multiple audiences...');
        
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: [webClientId, androidClientId]
        });

        const payload = ticket.getPayload();
        const googleEmail = payload.email;
        const googleName = payload.name;
        const googlePicture = payload.picture;
        const googleSub = payload.sub;

        logger.info('Google token verification successful');
        logger.debug('Email:', googleEmail);
        logger.debug('Name:', googleName);

        if (!googleEmail) {
            logger.error('No email found in Google token payload');
            throw new BadRequestError('Could not retrieve email from Google token.');
        }

        logger.debug('Finding or creating user in database...');
        const user = await userService.findOrCreateUserByGoogleEmail(googleEmail, { 
            name: googleName, 
            picture: googlePicture,
            googleId: googleSub 
        });

        logger.info('User found/created:', { id: user.id, email: user.email, username: user.username });

        const token = jwt.sign(
            { userId: user.id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        logger.info('JWT token generated successfully');

        res.status(HTTP_STATUS.OK).json({
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
        logger.error('Google login error:', error.message);
        
        if (error.message?.includes('Wrong recipient') || error.message?.includes('audience')) {
            logger.error('Audience mismatch error - token was issued for different client');
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                error: 'Invalid Google authentication token. Please try signing in again.' 
            });
        }
        
        if (error.message?.includes('Invalid ID token') || error.message?.includes('Token used too late')) {
            logger.error('Invalid or expired token');
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                error: 'Google authentication token is invalid or expired. Please try signing in again.' 
            });
        }

        if (error.message?.includes('fetch') || error.message?.includes('network')) {
            logger.error('Network error during token verification');
            return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
                error: 'Unable to verify Google token due to network issues. Please try again.' 
            });
        }
        
        if (error.message?.includes('prepared statement') || error.code === 'P2024' || 
            error.message?.includes('connection pool') || error.code === 'P2010') {
            logger.error('Database connection issue detected:', error.code, error.message);
            
            try {
                const { resetConnection } = require('../config/database');
                logger.info('Attempting to reset database connection...');
                await resetConnection();
                
                logger.info('Retrying user operation after connection reset...');
                const retryUser = await userService.findOrCreateUserByGoogleEmail(googleEmail, { 
                    name: googleName, 
                    picture: googlePicture,
                    googleId: googleSub 
                });
                
                if (retryUser) {
                    logger.info('Retry successful after connection reset');
                    const retryToken = jwt.sign({ userId: retryUser.id }, JWT_SECRET, { expiresIn: '7d' });
                    
                    return res.status(HTTP_STATUS.OK).json({
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
                logger.error('Retry after connection reset failed:', retryError.message);
            }
            
            return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
                error: 'Database connection issue. Please try again in a moment.' 
            });
        }

        if (error.code === 'P2002') {
            logger.error('User already exists with conflicting data');
            return res.status(HTTP_STATUS.CONFLICT).json({
                error: 'Account with this email already exists.' 
            });
        }
        
        logger.error('Unexpected error during Google login:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: 'An unexpected error occurred during Google sign-in. Please try again.' 
        });
    }
};

// Return the current authenticated user's profile
const getMeProfile = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            throw new UnauthorizedError(ERROR_MESSAGES.AUTH_REQUIRED);
        }

        const user = await userService.findUserById(userId);

        if (!user) {
            throw new NotFoundError('User not found.');
        }

        // Get follow counts for the current user
        const followService = require('../services/followService');
        let followCounts = { followers: 0, following: 0 };
        
        try {
            followCounts = await followService.getFollowCounts(user.id);
            logger.debug('Follow counts for current user:', { userId: user.id, counts: followCounts });
        } catch (countError) {
            logger.error('Error getting follow counts for current user:', countError);
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

        res.status(HTTP_STATUS.OK).json(userProfile);
    } catch (error) {
        logger.error('Error fetching current user profile:', error);
        next(error);
    }
};


const getUserProfile = async (req, res, next) => {
    try {
        const { userId } = req.params;
        
        logger.debug('getUserProfile called with userId:', userId);
        
        // Try to find user by ID first, then by username if ID lookup fails
        let user;
        
        if (userId.startsWith('c') && userId.length > 20) {
            logger.debug('Looking up user by ID:', userId);
            user = await userService.findUserById(userId);
        } else {
            logger.debug('Looking up user by username:', userId);
            user = await userService.findUserByUsername(userId);
        }

        if (!user) {
            logger.debug('User not found for:', userId);
            throw new NotFoundError('User not found.');
        }

        logger.debug('User found:', { id: user.id, username: user.username });

        // Get follow counts for the user
        const followService = require('../services/followService');
        let followCounts = { followers: 0, following: 0 };
        
        try {
            followCounts = await followService.getFollowCounts(user.id);
            logger.debug('Follow counts for user:', { userId: user.id, counts: followCounts });
        } catch (countError) {
            logger.error('Error getting follow counts:', countError);
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

        res.status(HTTP_STATUS.OK).json(userProfile);
    } catch (error) {
        logger.error('Error fetching user profile:', error);
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
            throw new NotFoundError('User not found.');
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

        res.status(HTTP_STATUS.OK).json({ message: 'Profile updated successfully.', user: userProfile });
    } catch (error) {
        logger.error('Error updating user profile:', error);
        
        if (error.message && error.message.includes('Username is already taken')) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                error: 'Username is already taken. Please choose a different username.',
                code: 'USERNAME_TAKEN'
            });
        }
        
        if (error.message && error.message.includes('User not found')) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found.' });
        }
        
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update profile. Please try again.' });
    }
};

const getBookmarks = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const bookmarks = await userService.getBookmarks(userId);
        res.status(HTTP_STATUS.OK).json(bookmarks);
    } catch (error) {
        logger.error('Error fetching bookmarks:', error);
        next(error);
    }
};

const searchUsers = async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                error: 'Search query parameter "q" is required and must be at least 2 characters long.' 
            });
        }
        
        const users = await userService.searchUsersByUsername(q);
        
        res.status(HTTP_STATUS.OK).json({ users });
    } catch (error) {
        logger.error('Error searching for users:', error);
        next(error);
    }
};

const deleteAvatar = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const updatedUser = await userService.updateUser(userId, { avatar: null });

        if (!updatedUser) {
            throw new NotFoundError('User not found.');
        }

        res.status(HTTP_STATUS.OK).json({ message: 'Avatar deleted successfully.' });
    } catch (error) {
        logger.error('Error deleting avatar:', error);
        next(error);
    }
};

const deleteBanner = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const updatedUser = await userService.updateUser(userId, { banner_url: null });

        if (!updatedUser) {
            throw new NotFoundError('User not found.');
        }

        res.status(HTTP_STATUS.OK).json({ message: 'Banner deleted successfully.' });
    } catch (error) {
        logger.error('Error deleting banner:', error);
        next(error);
    }
};

const blockUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const blockerId = req.user.userId;

        if (userId === blockerId) {
            throw new BadRequestError('You cannot block yourself.');
        }

        const userToBlock = await userService.getUserById(userId);
        if (!userToBlock) {
            throw new NotFoundError('User not found.');
        }

        const { prisma } = require('../config/database');
        await prisma.userBlock.create({
            data: {
                blockerId: blockerId,
                blockedId: userId
            }
        });

        logger.info(`User ${blockerId} blocked user ${userId}`);
        res.status(HTTP_STATUS.OK).json({
            success: true, 
            message: `User ${userToBlock.username} has been blocked.` 
        });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'User is already blocked.' });
        }
        logger.error('Error blocking user:', error);
        next(error);
    }
};

const unblockUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const blockerId = req.user.userId;

        const { prisma } = require('../config/database');
        const deletedBlock = await prisma.userBlock.deleteMany({
            where: {
                blockerId: blockerId,
                blockedId: userId
            }
        });

        if (deletedBlock.count === 0) {
            throw new NotFoundError('User is not blocked.');
        }

        logger.info(`User ${blockerId} unblocked user ${userId}`);
        res.status(HTTP_STATUS.OK).json({
            success: true, 
            message: 'User has been unblocked.' 
        });
    } catch (error) {
        logger.error('Error unblocking user:', error);
        next(error);
    }
};

const getUserPosts = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        
        logger.debug('getUserPosts called:', { userId, page, limit });
        
        const posts = await userService.getUserPosts(userId, {
            page: parseInt(page),
            limit: parseInt(limit)
        });
        
        const { transformPost } = require('../utils/helpers');
        const transformedPosts = posts.map(transformPost);
        
        logger.debug(`Found ${transformedPosts.length} posts for user ${userId}`);
        res.status(HTTP_STATUS.OK).json({ posts: transformedPosts });
    } catch (error) {
        logger.error('Error fetching user posts:', error);
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
    getUserPosts,
};