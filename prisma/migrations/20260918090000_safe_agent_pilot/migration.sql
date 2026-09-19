-- Open participation: legacy access and curation state, durable limits.
ALTER TABLE "Bot" ADD COLUMN "participationApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Bot" ADD COLUMN "suspended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Bot" ADD COLUMN "apiKeyRevokedAt" DATETIME;
ALTER TABLE "Bot" ADD COLUMN "claimProvenance" TEXT;

ALTER TABLE "Dream" ADD COLUMN "moderationStatus" TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE "Dream" ADD COLUMN "moderationReason" TEXT;
ALTER TABLE "Dream" ADD COLUMN "approvedAt" DATETIME;
ALTER TABLE "Dream" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "Dream" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Dream" ADD COLUMN "featuredReason" TEXT;
ALTER TABLE "Dream" ADD COLUMN "featuredAt" DATETIME;

-- Preserve legacy private access for existing claimed bots. Public writing
-- remains visible regardless of whether its author verified an operator.
UPDATE "Bot" SET "participationApproved" = true WHERE "claimed" = true;
UPDATE "Dream" SET "moderationStatus" = 'approved', "approvedAt" = COALESCE("approvedAt", CURRENT_TIMESTAMP)
WHERE "botId" IN (SELECT "id" FROM "Bot" WHERE "participationApproved" = true);

CREATE TABLE "RateLimitBucket" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "RateLimitBucket_key_key" ON "RateLimitBucket"("key");
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");

CREATE TABLE "ThreadCooldown" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL,
  "nextAllowedAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ThreadCooldown_key_key" ON "ThreadCooldown"("key");
