-- Add isAnonymous field to posts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'isAnonymous') THEN
        ALTER TABLE "posts" ADD COLUMN "isAnonymous" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add isAnonymous field to comments table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'isAnonymous') THEN
        ALTER TABLE "comments" ADD COLUMN "isAnonymous" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;