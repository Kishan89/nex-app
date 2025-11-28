const { prisma, resetConnection } = require('../config/database');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();
const { createLogger } = require('../utils/logger');

const logger = createLogger('UserService');
const HASH_SALT_ROUNDS = 10;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleOAuthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const createUser = async ({ email, username, password }) => {
  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      const hashedPassword = await bcrypt.hash(password, HASH_SALT_ROUNDS);
      const newUser = await prisma.user.create({
        data: { email, username, password: hashedPassword },
        select: { id: true, email: true, username: true, createdAt: true, avatar: true, bio: true },
      });
      return newUser;
    } catch (error) {
      logger.error('Error creating user in database', { attempt: retryCount + 1, error: error.message });
      
      // Handle prepared statement conflicts with retry
      if ((error.message?.includes('prepared statement') || error.code === 'P2010') && retryCount < maxRetries) {
        logger.warn('Retrying user creation after prepared statement error', { attempt: retryCount + 1 });
        await resetConnection();
        retryCount++;
        continue;
      }
      
      if (error.code === 'P2002') {
        throw new Error(error.message.includes('email') ? 'Email already in use.' : 'Username already taken.');
      }
      throw new Error('User creation failed. Please try again.');
    }
  }
};

const findUserByEmail = async (email) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, username: true, password: true, avatar: true, bio: true, banner_url: true, xp: true, isBanned: true, banReason: true, bannedAt: true },
    });
    return user;
  } catch (error) {
    logger.error('Error finding user by email:', error);
    throw new Error('Could not retrieve user data.');
  }
};

const findUserByUsername = async (username) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, email: true, avatar: true, bio: true, website: true, location: true, verified: true, banner_url: true, xp: true, isBanned: true, banReason: true, bannedAt: true },
    });
    return user;
  } catch (error) {
    logger.error('Error finding user by username:', error);
    throw new Error('Could not retrieve user data.');
  }
};

const updateBanner = async (userId, bannerUrl) => {
  return await updateUser(userId, { banner_url: bannerUrl });
};

const findUserById = async (id) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, username: true, avatar: true, bio: true, website: true, location: true, verified: true, banner_url: true, xp: true, isBanned: true, banReason: true, bannedAt: true },
    });
    return user;
  } catch (error) {
    logger.error('Error finding user by ID:', error);
    throw new Error('Could not retrieve user data.');
  }
};

const updateUser = async (id, updates) => {
  try {
    if (updates.password) delete updates.password;
    
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updates,
      select: { id: true, email: true, username: true, avatar: true, bio: true, banner_url: true, xp: true },
    });
    return updatedUser;
  } catch (error) {
    logger.error('Error updating user in database:', error);
    if (error.code === 'P2025') throw new Error('User not found.');
    throw new Error('User update failed. Please try again.');
  }
};

const getBookmarks = async (userId) => {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      include: {
        post: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
            _count: { select: { likes: true, comments: true, bookmarks: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookmarks
      .filter(b => b.post)
      .map(b => ({
        ...b.post,
        likes_count: b.post._count.likes,
        comments_count: b.post._count.comments,
        reposts_count: b.post._count.bookmarks,
        author: b.post.user,
      }));
  } catch (error) {
    logger.error('Error fetching bookmarks:', error);
    throw new Error('Could not retrieve bookmarks.');
  }
};

const searchUsersByUsername = async (query) => {
  try {
    const users = await prisma.user.findMany({
      where: { username: { contains: query, mode: 'insensitive' } },
      select: { id: true, username: true, bio: true, avatar: true },
      take: 20,
    });

    return users.map(user => ({ ...user, avatar_url: user.avatar, avatar: undefined }));
  } catch (error) {
    logger.error('Error searching for users:', error);
    throw new Error('Could not search for users.');
  }
};

const findOrCreateUserByGoogleEmail = async (googleEmail, googleProfile = {}) => {
  try {
    let user = await findUserByEmail(googleEmail);

    if (user) {
      logger.info('Existing user found', { id: user.id, email: user.email, username: user.username });
      // Don't set Google profile picture - let user upload their own to incentivize profile completion
      return user;
    } else {
      const tempPassword = `google_temp_${Date.now()}`;
      let baseUsername = googleProfile.name ? googleProfile.name.replace(/\s+/g, '_') : googleEmail.split('@')[0];
      
      // Generate unique username with retry logic
      let uniqueUsername = baseUsername;
      let attempt = 0;
      const maxAttempts = 10;
      
      while (attempt < maxAttempts) {
        try {
          logger.debug('Attempting to create user with username', { username: uniqueUsername });
          const newUser = await createUser({ email: googleEmail, username: uniqueUsername, password: tempPassword });
          
          logger.info('User created successfully', { id: newUser.id, email: newUser.email, username: newUser.username });
          
          let createdUser = await findUserById(newUser.id);
          // Don't set Google profile picture - leave avatar as null to show default avatar
          // This incentivizes users to upload their own profile picture
          return createdUser;
        } catch (createError) {
          if (createError.message?.includes('Username already taken')) {
            attempt++;
            uniqueUsername = `${baseUsername}_${attempt}`;
            logger.warn('Username taken, trying new username', { username: uniqueUsername });
            continue;
          } else {
            throw createError;
          }
        }
      }
      
      throw new Error('Could not generate unique username after multiple attempts');
    }
  } catch (error) {
    logger.error('Error finding or creating user by Google email:', error);
    throw new Error('Failed to find or create user account via Google.');
  }
};

const getUserPosts = async (userId, options = {}) => {
  try {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const posts = await prisma.post.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            verified: true,
          },
        },
        poll: {
          select: {
            id: true,
            question: true,
            options: {
              select: {
                id: true,
                text: true,
                votesCount: true,
                _count: { select: { votes: true } }
              }
            }
          }
        },
        likes: false,
        bookmarks: false,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return posts;
  } catch (error) {
    logger.error('Error fetching user posts:', error);
    throw new Error('Could not retrieve user posts.');
  }
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserByUsername,
  findUserById,
  updateUser,
  getBookmarks,
  searchUsersByUsername,
  updateBanner,
  findOrCreateUserByGoogleEmail,
  getUserPosts,
};
