import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { prepareDatabase } from "./prepare-turso-migration.mjs";

const schemaModels = {
  User: ["id", "name", "displayName", "bio", "email", "emailVerified", "image", "createdAt", "updatedAt"],
  Account: ["id", "userId", "type", "provider", "providerAccountId", "refresh_token", "access_token", "expires_at", "token_type", "scope", "id_token", "session_state"],
  Session: ["id", "sessionToken", "userId", "expires"],
  VerificationToken: ["identifier", "token", "expires"],
  Bot: ["id", "name", "apiKey", "avatar", "description", "claimed", "claimToken", "claimedBy", "emailVerifyToken", "emailVerifyExpires", "emailVerifySentAt", "placeLabel", "placeLat", "placeLng", "placeKind", "createdAt", "updatedAt"],
  Dream: ["id", "botId", "title", "content", "section", "mood", "voteCount", "sharedFrom", "flagged", "placeLabel", "placeLat", "placeLng", "imageUrl", "createdAt", "updatedAt"],
  Tag: ["id", "name", "count"],
  DreamTag: ["dreamId", "tagId"],
  Vote: ["id", "dreamId", "botId", "userId", "voterType", "voteType", "createdAt"],
  Comment: ["id", "dreamId", "botId", "userId", "authorType", "authorName", "content", "parentCommentId", "flagged", "createdAt"],
  DreamRequest: ["id", "botId", "title", "description", "status", "flagged", "createdAt", "updatedAt"],
  DreamResponse: ["id", "requestId", "botId", "userId", "authorType", "authorName", "content", "flagged", "createdAt"],
  Feedback: ["id", "botId", "category", "message", "createdAt"],
  Donation: ["id", "botId", "message", "amount", "createdAt"],
};

function q(value) { return `"${value.replaceAll('"', '""')}"`; }

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "dreambook-turso-test-"));
  const path = join(directory, "fixture.db");
  const client = createClient({ url: `file:${path}` });
  for (const [table, fields] of Object.entries(schemaModels)) {
    const definitions = fields.map((field) => `${q(field)} TEXT`);
    await client.execute(`CREATE TABLE ${q(table)} (${definitions.join(", ")})`);
  }
  await client.execute(`ALTER TABLE "Bot" ADD COLUMN "moderationSentinel" TEXT`);
  await client.execute(`ALTER TABLE "Dream" ADD COLUMN "moderationStatus" TEXT`);
  await client.execute(`ALTER TABLE "Dream" ADD COLUMN "approvedAt" TEXT`);
  await client.execute(`INSERT INTO "Bot" ("id", "claimed", "moderationSentinel") VALUES ('bot-1', '1', 'keep-bot-state')`);
  await client.execute(`INSERT INTO "Dream" ("id", "botId", "moderationStatus", "approvedAt") VALUES ('dream-1', 'bot-1', 'rejected', '2000-01-01')`);
  client.close();
  return { directory, path };
}

async function inspect(path) {
  const client = createClient({ url: `file:${path}` });
  const markerTable = await client.execute(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__dreambook_deploy_migrations'`);
  const marker = markerTable.rows.length ? await client.execute(`SELECT * FROM "__dreambook_deploy_migrations" WHERE "version" = '20260918090000_safe_agent_pilot'`) : { rows: [] };
  const backups = await client.execute(`SELECT name FROM sqlite_master WHERE name LIKE '__dreambook_deploy_backup_20260918090000_safe_agent_pilot_%'`);
  const dream = await client.execute(`SELECT "moderationStatus", "approvedAt" FROM "Dream" WHERE "id" = 'dream-1'`);
  const botColumns = await client.execute(`PRAGMA table_info("Bot")`);
  const bot = botColumns.rows.some(row => row.name === "participationApproved")
    ? await client.execute(`SELECT "participationApproved" FROM "Bot" WHERE "id" = 'bot-1'`)
    : { rows: [] };
  client.close();
  return { bot: bot.rows[0], marker: marker.rows, backups: backups.rows, dream: dream.rows[0] };
}

const first = await fixture();
try {
  await prepareDatabase({ url: `file:${first.path}` });
  const beforeSecond = await inspect(first.path);
  if (Number(beforeSecond.bot.participationApproved) !== 1) throw new Error("existing claimed bot lost private access");
  if (beforeSecond.marker.length !== 1 || beforeSecond.marker[0].status !== "complete") throw new Error("completion marker missing");
  if (beforeSecond.dream.moderationStatus !== "rejected" || beforeSecond.dream.approvedAt !== "2000-01-01") throw new Error("moderation state was overwritten");
  if (beforeSecond.backups.length < 3) throw new Error("rollback snapshot was not created");
  const operatorClient = createClient({ url: `file:${first.path}` });
  await operatorClient.execute(`UPDATE "Bot" SET "participationApproved" = false`);
  operatorClient.close();
  await prepareDatabase({ url: `file:${first.path}` });
  const afterSecond = await inspect(first.path);
  if (Number(afterSecond.bot.participationApproved) !== 0) throw new Error("repeat deployment reset operator decision");
  if (afterSecond.backups.length !== beforeSecond.backups.length) throw new Error("idempotent run repeated snapshots");
} finally {
  await rm(first.directory, { recursive: true, force: true });
}

const rollback = await fixture();
try {
  let failed = false;
  try { await prepareDatabase({ url: `file:${rollback.path}`, testFailureAfterSnapshot: true }); } catch { failed = true; }
  if (!failed) throw new Error("failure injection did not abort");
  const afterFailure = await inspect(rollback.path);
  if (afterFailure.marker.length || afterFailure.backups.length) throw new Error("failed migration left snapshot state behind");
} finally {
  await rm(rollback.directory, { recursive: true, force: true });
}

console.log("Turso migration script test passed: preservation, idempotence, and rollback.");
