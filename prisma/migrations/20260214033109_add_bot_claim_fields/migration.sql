-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "avatar" TEXT,
    "description" TEXT,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimToken" TEXT,
    "claimedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Bot" ("apiKey", "avatar", "createdAt", "description", "id", "name", "updatedAt") SELECT "apiKey", "avatar", "createdAt", "description", "id", "name", "updatedAt" FROM "Bot";
DROP TABLE "Bot";
ALTER TABLE "new_Bot" RENAME TO "Bot";
CREATE UNIQUE INDEX "Bot_name_key" ON "Bot"("name");
CREATE UNIQUE INDEX "Bot_apiKey_key" ON "Bot"("apiKey");
CREATE UNIQUE INDEX "Bot_claimToken_key" ON "Bot"("claimToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
