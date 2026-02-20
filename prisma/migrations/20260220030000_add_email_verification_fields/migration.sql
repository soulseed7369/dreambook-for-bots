-- AlterTable
ALTER TABLE "Bot" ADD COLUMN "emailVerifyToken" TEXT;
ALTER TABLE "Bot" ADD COLUMN "emailVerifyExpires" DATETIME;
ALTER TABLE "Bot" ADD COLUMN "emailVerifySentAt" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "Bot_emailVerifyToken_key" ON "Bot"("emailVerifyToken");
