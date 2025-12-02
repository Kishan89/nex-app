/**
 * Format a date to a time ago string
 * @param {Date} date - The date to format
 * @returns {string} - Time ago string (e.g., "2h", "3d", "Jan 15, 2023")
 */
function formatTimeAgo(date) {
    const now = new Date();
    const diffInMilliseconds = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    if (diffInHours < 24) return `${diffInHours}h ago`;

    if (diffInDays < 7) return `${diffInDays}d ago`;

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;

    // ⭐️ New: Add logic for months and years for very old dates
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}mo ago`;

    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears}y ago`;
}

/**
 * Get notification action text based on type
 * @param {string} type - Notification type
 * @returns {string} - Action text
 */
function getNotificationAction(type) {
    switch (type) {
        case 'LIKE': return 'liked your post';
        case 'COMMENT': return 'comment on your post';
        case 'FOLLOW': return 'started following you';
        case 'MESSAGE': return 'sent you a message';
        default: return 'interacted with you';
    }
}

/**
 * Transform post data for API response
 * @param {Object} post - Prisma post object
 * @returns {Object} - Transformed post
 */
function transformPost(post) {
    return {
        id: post.id,
        userId: post.user.id, // ✅ Add the actual user ID
        username: post.user.username,
        avatar: post.user.avatar,
        content: post.content,
        image: post.imageUrl,
        likes: post.likesCount || 0, // Use persistent likesCount field
        comments: post._count?.comments || post.commentsCount || 0,
        bookmarks: post.bookmarksCount || post._count?.bookmarks || 0,
        reposts: 0,
        time: formatTimeAgo(post.createdAt),
        createdAt: formatTimeAgo(post.createdAt),
        // Include poll data if present
        poll: post.poll ? {
            id: post.poll.id,
            question: post.poll.question,
            options: post.poll.options?.map(option => ({
                id: option.id,
                text: option.text,
                votesCount: option.votesCount || 0,
                _count: { votes: option._count?.votes || 0 }
            })) || [],
            // Include user's vote if they have voted
            userVote: post.poll.userVote || null
        } : null,
        // Include YouTube data if present
        youtubeVideoId: post.youtubeVideoId || null,
        youtubeTitle: post.youtubeTitle || null,
        youtubeAuthor: post.youtubeAuthor || null,
        youtubeThumbnail: post.youtubeThumbnail || null,
        youtubeUrl: post.youtubeUrl || null,
        youtubeDuration: post.youtubeDuration || null,
        // Include like status for authenticated user (both formats for compatibility)
        isLiked: post.isLiked || false,
        liked: post.isLiked || false,
        isBookmarked: post.isBookmarked || false,
        bookmarked: post.isBookmarked || false,
        // Include pinned status
        isPinned: post.isPinned || false,
        // Include live status
        isLive: post.isLive || false,
        // Include anonymous status
        isAnonymous: post.isAnonymous || false,
    };
}

/**
 * Transform comment data for API response
 * @param {Object} comment - Prisma comment object
 * @returns {Object} - Transformed comment
 */
function transformComment(comment) {
    // Check if comment is anonymous first
    const isAnonymous = Boolean(comment.isAnonymous ?? false);
    
    // For anonymous comments, use placeholder data
    if (isAnonymous) {
        return {
            id: comment.id,
            username: 'Anonymous',
            avatar: null,
            text: comment.text,
            time: formatTimeAgo(comment.createdAt),
            parentId: comment.parentId,
            user: {
                id: comment.userId, // Keep real userId for backend operations
                username: 'Anonymous',
                avatar: null
            },
            userId: comment.userId, // Keep real userId for backend operations
            isAnonymous: true
        };
    }
    
    // For non-anonymous comments, use real user data
    const userObj = comment.user || comment.author || {};
    let userId = userObj.id || comment.userId || comment.authorId;
    let username = userObj.username || comment.username || 'Unknown';
    const avatar = userObj.avatar || comment.avatar || null;
    
    if (!userId && comment.userId) {
        userId = comment.userId;
    }
    
    const { createLogger } = require('./logger');
    const logger = createLogger('Helpers');
    
    if (!userId) {
        logger.warn('Comment missing userId', {
            commentId: comment.id,
            username: username
        });
    }
    
    return {
        id: comment.id,
        username: username,
        avatar: avatar,
        text: comment.text,
        time: formatTimeAgo(comment.createdAt),
        parentId: comment.parentId,
        user: {
            id: userId,
            username: username,
            avatar: avatar
        },
        userId: userId,
        isAnonymous: false
    };
}

/**
 * Transform notification data for API response
 * @param {Object} notification - Prisma notification object
 * @returns {Object} - Transformed notification
 */
function transformNotification(notification) {
    return {
        id: notification.id,
        type: notification.type.toLowerCase(),
        user: notification.fromUser?.username || 'System',
        action: getNotificationAction(notification.type),
        time: formatTimeAgo(notification.createdAt),
    };
}

/**
 * Create success response
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @returns {Object} - Success response
 */
function successResponse(data, message = 'Success') {
    return {
        success: true,
        message,
        data,
    };
}

/**
 * Format timestamp for chat messages in India timezone
 * @param {Date} date - The date to format
 * @returns {string} - Formatted time string (e.g., "14:30", "02:15")
 */
function formatChatTimestamp(date) {
    return date.toLocaleTimeString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false // Use 24-hour format for consistency
    });
}

/**
 * Create error response
 * @param {string} message - Error message
 * @param {number} code - Error code
 * @returns {Object} - Error response
 */
function errorResponse(message, code = 500) {
    return {
        success: false,
        error: message,
        code,
    };
}

module.exports = {
    formatTimeAgo,
    formatChatTimestamp,
    getNotificationAction,
    transformPost,
    transformComment,
    transformNotification,
    successResponse,
    errorResponse,
};
