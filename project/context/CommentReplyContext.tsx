import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Comment } from '@/types';
import CommentReplyPanel from '@/components/CommentReplyPanel';
interface CommentReplyContextType {
  openCommentReplies: (comment: Comment, postId: string, commentY?: number) => void;
  closeReplies: () => void;
  isVisible: boolean;
  onReplyAdded?: (commentId: string) => void;
}
const CommentReplyContext = createContext<CommentReplyContextType | undefined>(undefined);
interface CommentReplyProviderProps {
  children: ReactNode;
  currentUserId: string;
  currentUserAvatar?: string;
}
export function CommentReplyProvider({ 
  children, 
  currentUserId, 
  currentUserAvatar 
}: CommentReplyProviderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [postId, setPostId] = useState<string>('');
  const [commentY, setCommentY] = useState<number>(0);
  const openCommentReplies = (comment: Comment, postId: string, commentY?: number) => {
    setSelectedComment(comment);
    setPostId(postId);
    setCommentY(commentY || 0);
    setIsVisible(true);
  };
  const closeReplies = () => {
    setIsVisible(false);
    // Delay clearing data to allow animation to complete
    setTimeout(() => {
      setSelectedComment(null);
      setPostId('');
    }, 300);
  };
  const contextValue: CommentReplyContextType = {
    openCommentReplies,
    closeReplies,
    isVisible,
    onReplyAdded: undefined, // Can be extended later if needed
  };
  return (
    <CommentReplyContext.Provider value={contextValue}>
      {children}
      <CommentReplyPanel
        visible={isVisible}
        onClose={closeReplies}
        parentComment={selectedComment}
        postId={postId}
        currentUserId={currentUserId}
        currentUserAvatar={currentUserAvatar}
        commentY={commentY}
      />
    </CommentReplyContext.Provider>
  );
}
export function useCommentReply() {
  const context = useContext(CommentReplyContext);
  if (context === undefined) {
    throw new Error('useCommentReply must be used within a CommentReplyProvider');
  }
  return context;
}
// Convenience function for programmatic access
export function openCommentReplies(comment: Comment, postId: string) {
  // This will be implemented by the context consumer
  }