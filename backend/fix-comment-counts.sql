-- Update commentsCount for all posts based on actual comment count
UPDATE posts 
SET "commentsCount" = (
  SELECT COUNT(*) 
  FROM comments 
  WHERE comments."postId" = posts.id
);