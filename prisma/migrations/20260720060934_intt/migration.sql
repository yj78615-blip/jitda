-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_DELETION', 'DELETED');

-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'APPLE');

-- CreateEnum
CREATE TYPE "ViewerMode" AS ENUM ('SCROLL', 'PAGE');

-- CreateEnum
CREATE TYPE "SeriesStatus" AS ENUM ('ONGOING', 'COMPLETED', 'HIATUS');

-- CreateEnum
CREATE TYPE "ContentTargetType" AS ENUM ('EPISODE', 'POST', 'COMMENT', 'SALON', 'USER');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'CANCELED', 'PAST_DUE', 'FAILED');

-- CreateEnum
CREATE TYPE "TipStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'HEART', 'FIRE', 'SAD', 'WOW');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_EPISODE', 'NEW_COMMENT', 'COMMENT_REPLY', 'NEW_FOLLOWER', 'NEW_SUBSCRIBER', 'TIP_RECEIVED', 'PAYMENT_FAILED', 'PAYOUT_COMPLETED', 'REPORT_RESOLVED');

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('COPYRIGHT', 'ADULT', 'VIOLENCE', 'SPAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'INVESTIGATING', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportAction" AS ENUM ('NONE', 'TAKEDOWN', 'STRIKE', 'ACCOUNT_SUSPEND');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "ImageStatus" AS ENUM ('AWAITING_UPLOAD', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "RankingKind" AS ENUM ('SERIES', 'POST', 'AUTHOR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordHash" TEXT,
    "displayName" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "avatarImageId" TEXT,
    "bannerImageId" TEXT,
    "bio" TEXT,
    "externalLinks" JSONB,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isAdultVerified" BOOLEAN NOT NULL DEFAULT false,
    "strikes" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT NOT NULL DEFAULT 'ko',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "scheduledDeletionAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorProfile" (
    "userId" TEXT NOT NULL,
    "subscriptionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionPrice" INTEGER,
    "subscriptionCurrency" TEXT NOT NULL DEFAULT 'KRW',
    "payoutAccountRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerId" TEXT NOT NULL,
    "emailAtLink" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "parentId" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "emailTried" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Series" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImageId" TEXT,
    "viewerModeDefault" "ViewerMode" NOT NULL DEFAULT 'SCROLL',
    "status" "SeriesStatus" NOT NULL DEFAULT 'ONGOING',
    "isAdult" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "viewsTotal" INTEGER NOT NULL DEFAULT 0,
    "likesTotal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "viewerMode" "ViewerMode" NOT NULL,
    "isSubscriberOnly" BOOLEAN NOT NULL DEFAULT false,
    "isAdult" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "viewerMode" "ViewerMode" NOT NULL DEFAULT 'SCROLL',
    "isSubscriberOnly" BOOLEAN NOT NULL DEFAULT false,
    "isAdult" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "ownerType" "ContentTargetType",
    "ownerId" TEXT,
    "uploaderId" TEXT NOT NULL,
    "url" TEXT,
    "status" "ImageStatus" NOT NULL DEFAULT 'AWAITING_UPLOAD',
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER,
    "contentType" TEXT,
    "purpose" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "episodeId" TEXT,
    "postId" TEXT,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isGenre" BOOLEAN NOT NULL DEFAULT false,
    "nameKo" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeriesTag" (
    "seriesId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "SeriesTag_pkey" PRIMARY KEY ("seriesId","tagId")
);

-- CreateTable
CREATE TABLE "PostTag" (
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "PostTag_pkey" PRIMARY KEY ("postId","tagId")
);

-- CreateTable
CREATE TABLE "Follow" (
    "followerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId","authorId")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tip" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "message" TEXT,
    "messagePublic" BOOLEAN NOT NULL DEFAULT false,
    "status" "TipStatus" NOT NULL DEFAULT 'PENDING',
    "contextType" "ContentTargetType",
    "contextId" TEXT,
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "targetType" "ContentTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" "ContentTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentId" TEXT,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "payload" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSetting" (
    "userId" TEXT NOT NULL,
    "newEpisodeInApp" BOOLEAN NOT NULL DEFAULT true,
    "newEpisodeEmail" TEXT NOT NULL DEFAULT 'instant',
    "newCommentInApp" BOOLEAN NOT NULL DEFAULT true,
    "newCommentEmail" TEXT NOT NULL DEFAULT 'daily',
    "newFollowerInApp" BOOLEAN NOT NULL DEFAULT true,
    "newFollowerEmail" TEXT NOT NULL DEFAULT 'off',
    "tipReceivedInApp" BOOLEAN NOT NULL DEFAULT true,
    "tipReceivedEmail" TEXT NOT NULL DEFAULT 'instant',
    "paymentFailedInApp" BOOLEAN NOT NULL DEFAULT true,
    "paymentFailedEmail" TEXT NOT NULL DEFAULT 'instant',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ContentTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "category" "ReportCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "action" "ReportAction",
    "noteInternal" TEXT,
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "gross" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL,
    "stripeFee" INTEGER NOT NULL,
    "refundReserve" INTEGER NOT NULL,
    "net" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "stripePayoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingSnapshot" (
    "id" TEXT NOT NULL,
    "kind" "RankingKind" NOT NULL,
    "targetId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "reason" TEXT,
    "requestId" TEXT,
    "outcome" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_provider_providerId_key" ON "OAuthAccount"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_emailTried_ip_createdAt_idx" ON "LoginAttempt"("emailTried", "ip", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_ip_createdAt_idx" ON "LoginAttempt"("ip", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerification_tokenHash_key" ON "EmailVerification"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");

-- CreateIndex
CREATE INDEX "Series_authorId_idx" ON "Series"("authorId");

-- CreateIndex
CREATE INDEX "Series_status_idx" ON "Series"("status");

-- CreateIndex
CREATE INDEX "Series_updatedAt_idx" ON "Series"("updatedAt");

-- CreateIndex
CREATE INDEX "Series_viewsTotal_idx" ON "Series"("viewsTotal");

-- CreateIndex
CREATE INDEX "Episode_publishedAt_idx" ON "Episode"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_seriesId_order_key" ON "Episode"("seriesId", "order");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_publishedAt_idx" ON "Post"("publishedAt");

-- CreateIndex
CREATE INDEX "Image_uploaderId_idx" ON "Image"("uploaderId");

-- CreateIndex
CREATE INDEX "Image_status_idx" ON "Image"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "SeriesTag_tagId_idx" ON "SeriesTag"("tagId");

-- CreateIndex
CREATE INDEX "PostTag_tagId_idx" ON "PostTag"("tagId");

-- CreateIndex
CREATE INDEX "Follow_authorId_idx" ON "Follow"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_authorId_status_idx" ON "Subscription"("authorId", "status");

-- CreateIndex
CREATE INDEX "Subscription_currentPeriodEnd_idx" ON "Subscription"("currentPeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_subscriberId_authorId_key" ON "Subscription"("subscriberId", "authorId");

-- CreateIndex
CREATE UNIQUE INDEX "Tip_stripePaymentIntentId_key" ON "Tip"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Tip_authorId_createdAt_idx" ON "Tip"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "Tip_senderId_createdAt_idx" ON "Tip"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_targetType_targetId_createdAt_idx" ON "Comment"("targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Reaction_targetType_targetId_idx" ON "Reaction"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_targetType_targetId_type_key" ON "Reaction"("userId", "targetType", "targetId", "type");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_category_status_idx" ON "Report"("category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_stripePayoutId_key" ON "Payout"("stripePayoutId");

-- CreateIndex
CREATE INDEX "Payout_period_idx" ON "Payout"("period");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_authorId_period_key" ON "Payout"("authorId", "period");

-- CreateIndex
CREATE INDEX "RankingSnapshot_kind_period_rank_idx" ON "RankingSnapshot"("kind", "period", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "RankingSnapshot_kind_period_targetId_key" ON "RankingSnapshot"("kind", "period", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_ts_idx" ON "AuditLog"("ts");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_ts_idx" ON "AuditLog"("actorUserId", "ts");

-- CreateIndex
CREATE INDEX "AuditLog_action_ts_idx" ON "AuditLog"("action", "ts");

-- CreateIndex
CREATE INDEX "StripeEvent_type_idx" ON "StripeEvent"("type");

-- AddForeignKey
ALTER TABLE "AuthorProfile" ADD CONSTRAINT "AuthorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesTag" ADD CONSTRAINT "SeriesTag_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesTag" ADD CONSTRAINT "SeriesTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSetting" ADD CONSTRAINT "NotificationSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
