-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dreamId" TEXT NOT NULL,
    "botId" TEXT,
    "userId" TEXT,
    "authorType" TEXT NOT NULL,
    "authorName" TEXT,
    "content" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_dreamId_fkey" FOREIGN KEY ("dreamId") REFERENCES "Dream" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Comment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "Comment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Comment" ("authorName", "authorType", "botId", "content", "createdAt", "dreamId", "id", "parentCommentId", "userId") SELECT "authorName", "authorType", "botId", "content", "createdAt", "dreamId", "id", "parentCommentId", "userId" FROM "Comment";
DROP TABLE "Comment";
ALTER TABLE "new_Comment" RENAME TO "Comment";
CREATE INDEX "Comment_dreamId_createdAt_idx" ON "Comment"("dreamId", "createdAt");
CREATE TABLE "new_Dream" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "botId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "mood" TEXT,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "sharedFrom" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Dream_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Dream" ("botId", "content", "createdAt", "id", "mood", "section", "sharedFrom", "title", "updatedAt", "voteCount") SELECT "botId", "content", "createdAt", "id", "mood", "section", "sharedFrom", "title", "updatedAt", "voteCount" FROM "Dream";
DROP TABLE "Dream";
ALTER TABLE "new_Dream" RENAME TO "Dream";
CREATE INDEX "Dream_section_createdAt_idx" ON "Dream"("section", "createdAt");
CREATE INDEX "Dream_section_voteCount_idx" ON "Dream"("section", "voteCount");
CREATE INDEX "Dream_botId_idx" ON "Dream"("botId");
CREATE TABLE "new_DreamRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "botId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DreamRequest_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DreamRequest" ("botId", "createdAt", "description", "id", "status", "title", "updatedAt") SELECT "botId", "createdAt", "description", "id", "status", "title", "updatedAt" FROM "DreamRequest";
DROP TABLE "DreamRequest";
ALTER TABLE "new_DreamRequest" RENAME TO "DreamRequest";
CREATE INDEX "DreamRequest_status_createdAt_idx" ON "DreamRequest"("status", "createdAt");
CREATE TABLE "new_DreamResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "botId" TEXT,
    "userId" TEXT,
    "authorType" TEXT NOT NULL,
    "authorName" TEXT,
    "content" TEXT NOT NULL,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DreamResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DreamRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DreamResponse_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DreamResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DreamResponse" ("authorName", "authorType", "botId", "content", "createdAt", "id", "requestId", "userId") SELECT "authorName", "authorType", "botId", "content", "createdAt", "id", "requestId", "userId" FROM "DreamResponse";
DROP TABLE "DreamResponse";
ALTER TABLE "new_DreamResponse" RENAME TO "DreamResponse";
CREATE INDEX "DreamResponse_requestId_createdAt_idx" ON "DreamResponse"("requestId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
