// Utility function to handle anonymous comment display
// Using a proper anonymous avatar image with hat and glasses
export const ANONYMOUS_AVATAR = require('@/assets/images/anonymous-avatar.png');
export const DEFAULT_AVATAR = require('@/assets/images/default-avatar.png');

export const getDisplayUser = (user: any, isAnonymous: boolean) => {
  if (isAnonymous) {
    return {
      ...user,
      username: 'Anonymous',
      avatar: ANONYMOUS_AVATAR
    };
  }
  
  // For non-anonymous users, ensure we always have a valid avatar
  // Check for null, undefined, empty string, or whitespace
  const hasValidAvatar = user?.avatar && typeof user.avatar === 'string' && user.avatar.trim() !== '';
  
  console.log('🔍 [getDisplayUser] Processing avatar:', {
    inputAvatar: user?.avatar,
    avatarType: typeof user?.avatar,
    hasValidAvatar,
    willUseDefault: !hasValidAvatar
  });
  
  return {
    ...user,
    avatar: hasValidAvatar ? user.avatar : DEFAULT_AVATAR
  };
};