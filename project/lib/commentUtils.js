// Utility function to handle anonymous comment display
// Using a proper anonymous avatar image with hat and glasses
export const ANONYMOUS_AVATAR = require('@/assets/images/anonymous-avatar.png');
export const DEFAULT_AVATAR = require('@/assets/images/default-avatar.png');

export const getDisplayUser = (user, isAnonymous) => {
  if (isAnonymous) {
    return {
      ...user,
      username: 'Anonymous',
      avatar: ANONYMOUS_AVATAR
    };
  }
  
  // For non-anonymous users, ensure we always have a valid avatar and username
  const hasValidAvatar = user?.avatar && typeof user.avatar === 'string' && user.avatar.trim() !== '';
  const hasValidUsername = user?.username && typeof user.username === 'string' && user.username.trim() !== '';
  
  return {
    ...user,
    username: hasValidUsername ? user.username : 'User',
    avatar: hasValidAvatar ? user.avatar : DEFAULT_AVATAR
  };
};