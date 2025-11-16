/**
 * Group Permission Utilities
 * Helper functions for checking group admin permissions
 */

interface Participant {
  userId: string;
  isAdmin: boolean;
  user?: {
    id: string;
    username: string;
    avatar?: string;
  };
}

interface GroupData {
  id: string;
  isGroup: boolean;
  createdById?: string;
  participants?: Participant[];
}

/**
 * Check if a user is an admin of a group
 */
export function isGroupAdmin(userId: string, groupData: GroupData): boolean {
  if (!groupData.isGroup) return false;
  if (!groupData.participants) return false;

  const participant = groupData.participants.find((p) => p.userId === userId);
  return participant?.isAdmin || false;
}

/**
 * Check if a user is the creator of a group
 */
export function isGroupCreator(userId: string, groupData: GroupData): boolean {
  if (!groupData.isGroup) return false;
  return groupData.createdById === userId;
}

/**
 * Check if a user can modify group settings
 */
export function canModifyGroup(userId: string, groupData: GroupData): boolean {
  return isGroupAdmin(userId, groupData);
}

/**
 * Check if a user can add members to a group
 */
export function canAddMembers(userId: string, groupData: GroupData): boolean {
  return isGroupAdmin(userId, groupData);
}

/**
 * Check if a user can remove a specific member from a group
 */
export function canRemoveMember(
  userId: string,
  targetUserId: string,
  groupData: GroupData
): boolean {
  // Admins can remove non-admin members
  if (!isGroupAdmin(userId, groupData)) return false;

  // Can't remove yourself (use leave group instead)
  if (userId === targetUserId) return false;

  // Check if target is admin
  const targetParticipant = groupData.participants?.find(
    (p) => p.userId === targetUserId
  );
  
  // Can't remove other admins (only creator can do that)
  if (targetParticipant?.isAdmin && !isGroupCreator(userId, groupData)) {
    return false;
  }

  return true;
}

/**
 * Check if a user can leave a group
 */
export function canLeaveGroup(userId: string, groupData: GroupData): boolean {
  if (!groupData.isGroup) return false;
  
  const participant = groupData.participants?.find((p) => p.userId === userId);
  if (!participant) return false;

  // Creator can leave if there are other admins
  if (isGroupCreator(userId, groupData)) {
    const otherAdmins = groupData.participants?.filter(
      (p) => p.isAdmin && p.userId !== userId
    );
    return (otherAdmins?.length || 0) > 0;
  }

  return true;
}

/**
 * Get admin count in a group
 */
export function getAdminCount(groupData: GroupData): number {
  if (!groupData.participants) return 0;
  return groupData.participants.filter((p) => p.isAdmin).length;
}

/**
 * Get member count in a group
 */
export function getMemberCount(groupData: GroupData): number {
  return groupData.participants?.length || 0;
}

/**
 * Get list of admins in a group
 */
export function getAdmins(groupData: GroupData): Participant[] {
  if (!groupData.participants) return [];
  return groupData.participants.filter((p) => p.isAdmin);
}

/**
 * Get list of non-admin members in a group
 */
export function getMembers(groupData: GroupData): Participant[] {
  if (!groupData.participants) return [];
  return groupData.participants.filter((p) => !p.isAdmin);
}

/**
 * Check if a message mentions the current user
 */
export function isMentioned(username: string, messageContent: string): boolean {
  const mentionRegex = new RegExp(`@${username}\\b`, 'i');
  return mentionRegex.test(messageContent);
}

/**
 * Extract all mentions from a message
 */
export function extractMentions(messageContent: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(messageContent)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}

/**
 * Check if user has permission to perform an action
 */
export function hasPermission(
  userId: string,
  action: 'edit' | 'add_member' | 'remove_member' | 'delete_group',
  groupData: GroupData,
  targetUserId?: string
): boolean {
  switch (action) {
    case 'edit':
      return canModifyGroup(userId, groupData);
    
    case 'add_member':
      return canAddMembers(userId, groupData);
    
    case 'remove_member':
      return targetUserId
        ? canRemoveMember(userId, targetUserId, groupData)
        : false;
    
    case 'delete_group':
      return isGroupCreator(userId, groupData);
    
    default:
      return false;
  }
}

/**
 * Get permission error message
 */
export function getPermissionError(action: string): string {
  const messages: Record<string, string> = {
    edit: 'Only group admins can edit group settings',
    add_member: 'Only group admins can add members',
    remove_member: 'Only group admins can remove members',
    delete_group: 'Only the group creator can delete the group',
  };

  return messages[action] || 'You do not have permission to perform this action';
}

export default {
  isGroupAdmin,
  isGroupCreator,
  canModifyGroup,
  canAddMembers,
  canRemoveMember,
  canLeaveGroup,
  getAdminCount,
  getMemberCount,
  getAdmins,
  getMembers,
  isMentioned,
  extractMentions,
  hasPermission,
  getPermissionError,
};
