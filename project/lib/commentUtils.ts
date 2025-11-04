// Utility function to handle anonymous comment display
// Using a proper anonymous avatar image with hat and glasses
export const ANONYMOUS_AVATAR = require('@/assets/images/anonymous-avatar.png');

export const getDisplayUser = (user: any, isAnonymous: boolean) => {
  if (!isAnonymous) return user;
  
  return {
    ...user,
    username: 'Anonymous',
    avatar: ANONYMOUS_AVATAR
  };
};