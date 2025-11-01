-- AlterTable
ALTER TABLE "public"."comments" ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "public"."posts" ADD COLUMN     "reportsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "youtubeAuthor" TEXT,
ADD COLUMN     "youtubeDuration" TEXT,
ADD COLUMN     "youtubeThumbnail" TEXT,
ADD COLUMN     "youtubeTitle" TEXT,
ADD COLUMN     "youtubeUrl" TEXT,
ADD COLUMN     "youtubeVideoId" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."fcm_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'unknown',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fcm_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_blocks" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fcm_tokens_token_key" ON "public"."fcm_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "user_blocks_blockerId_blockedId_key" ON "public"."user_blocks"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "chat_participants_userId_idx" ON "public"."chat_participants"("userId");

-- CreateIndex
CREATE INDEX "chat_participants_chatId_idx" ON "public"."chat_participants"("chatId");

-- CreateIndex
CREATE INDEX "messages_chatId_createdAt_idx" ON "public"."messages"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "public"."messages"("senderId");

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fcm_tokens" ADD CONSTRAINT "fcm_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_blocks" ADD CONSTRAINT "user_blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_blocks" ADD CONSTRAINT "user_blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
