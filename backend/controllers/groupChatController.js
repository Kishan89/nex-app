const chatService = require('../services/chatService');
const { successResponse } = require('../utils/helpers');
const { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants');
const { BadRequestError, UnauthorizedError } = require('../utils/errors');

class GroupChatController {
  /**
   * Get all group chats for the authenticated user
   */
  async getMyGroups(req, res, next) {
    try {
      const { userId } = req.user || {};

      if (!userId) {
        throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED || 'Unauthorized');
      }

      const groups = await chatService.getUserGroupChats(userId);

      // Follow pattern of getUserChats: return raw array for optimal perf
      return res.status(HTTP_STATUS.OK).json(groups);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new group chat
   */
  async createGroup(req, res, next) {
    try {
      const { userId } = req.user || {};
      const { name, description, memberIds, avatar } = req.body || {};

      if (!userId) {
        throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED || 'Unauthorized');
      }

      if (!name || typeof name !== 'string' || !name.trim()) {
        throw new BadRequestError('Group name is required');
      }

      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        throw new BadRequestError('At least one member is required to create a group');
      }

      // Ensure current user is always part of the group
      const uniqueMemberIds = Array.from(new Set([...memberIds, userId]));

      if (uniqueMemberIds.length < 2) {
        throw new BadRequestError('Group must contain at least two members');
      }

      const chat = await chatService.createChat({
        name: name.trim(),
        description: description || null,
        avatar: avatar || null,
        isGroup: true,
        participantIds: uniqueMemberIds,
        currentUserId: userId,
      });

      // Wrap in successResponse for consistency with createChat
      return res
        .status(HTTP_STATUS.CREATED)
        .json(successResponse(chat, SUCCESS_MESSAGES?.CHAT_CREATED || 'Group created successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add a member to a group chat
   */
  async addMember(req, res, next) {
    try {
      const { userId: actingUserId } = req.user || {};
      const { groupId } = req.params;
      const { userId } = req.body || {};

      if (!actingUserId) {
        throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED || 'Unauthorized');
      }

      if (!groupId) {
        throw new BadRequestError('Group ID is required');
      }

      if (!userId) {
        throw new BadRequestError('User ID is required to add to group');
      }

      const updatedChat = await chatService.addParticipantToChat(groupId, userId, actingUserId);

      return res
        .status(HTTP_STATUS.OK)
        .json(successResponse(updatedChat, 'Member added to group'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove a member from a group chat
   */
  async removeMember(req, res, next) {
    try {
      const { userId: actingUserId } = req.user || {};
      const { groupId, userId } = req.params;

      if (!actingUserId) {
        throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED || 'Unauthorized');
      }

      if (!groupId) {
        throw new BadRequestError('Group ID is required');
      }

      if (!userId) {
        throw new BadRequestError('User ID is required to remove from group');
      }

      const updatedChat = await chatService.removeParticipantFromChat(groupId, userId, actingUserId);

      return res
        .status(HTTP_STATUS.OK)
        .json(successResponse(updatedChat, 'Member removed from group'));
    } catch (error) {
      next(error);
    }
  }

  async getGroupDetails(req, res, next) {
    try {
      const { userId } = req.user || {};
      const { groupId } = req.params;

      if (!userId) {
        throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED || 'Unauthorized');
      }

      const groupDetails = await chatService.getChatById(groupId, userId);
      return res.status(HTTP_STATUS.OK).json(successResponse(groupDetails, 'Group details retrieved'));
    } catch (error) {
      next(error);
    }
  }

  async updateGroupAvatar(req, res, next) {
    try {
      const { userId } = req.user || {};
      const { groupId } = req.params;
      const { avatar } = req.body || {};

      if (!userId) {
        throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED || 'Unauthorized');
      }

      // Admin check already done by middleware
      const updatedChat = await chatService.updateGroupAvatar(groupId, avatar, userId);
      return res.status(HTTP_STATUS.OK).json(successResponse(updatedChat, 'Group avatar updated'));
    } catch (error) {
      next(error);
    }
  }

  async updateGroupName(req, res, next) {
    try {
      const { userId } = req.user || {};
      const { groupId } = req.params;
      const { name } = req.body || {};

      if (!userId) {
        throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED || 'Unauthorized');
      }

      // Admin check already done by middleware
      const updatedChat = await chatService.updateGroupName(groupId, name, userId);
      return res.status(HTTP_STATUS.OK).json(successResponse(updatedChat, 'Group name updated'));
    } catch (error) {
      next(error);
    }
  }

  async updateGroupDescription(req, res, next) {
    try {
      const { userId } = req.user || {};
      const { groupId } = req.params;
      const { description } = req.body || {};

      if (!userId) {
        throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED || 'Unauthorized');
      }

      // Admin check already done by middleware
      const updatedChat = await chatService.updateGroupDescription(groupId, description, userId);
      return res.status(HTTP_STATUS.OK).json(successResponse(updatedChat, 'Group description updated'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new GroupChatController();
