import "dotenv/config";

import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

const VERSION = "20260918090000_safe_agent_pilot";
const MIGRATION_FILE = new URL(`../prisma/migrations/${VERSION}/migration.sql`, import.meta.url);
const SCHEMA_FILE = new URL("../prisma/schema.prisma", import.meta.url);
const BACKUP_PREFIX = `__dreambook_deploy_backup_${VERSION}_`;
const MARKER_TABLE = "__dreambook_deploy_migrations";
const PILOT_FIELDS = new Set([
  "participationApproved", "suspended", "apiKeyRevokedAt", "claimProvenance",
  "moderationStatus", "moderationReason", "approvedAt", "approvedBy", "featured",
  "featuredReason", "featuredAt",
]);
const PILOT_TABLES = new Set(["RateLimitBucket", "ThreadCooldown"]);

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function splitSqlStatements(sql) {
  const statements = [];
  let start = 0;
  let quote = null;
  let depth = 0;
  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    if (quote) {
      if (char === quote && sql[i + 1] === quote) i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
    } else if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
    } else if (char === ";" && depth === 0) {
      const statement = sql.slice(start, i).replace(/^\s*(?:--[^\n]*\n\s*)+/g, "").trim();
      if (statement) statements.push(statement);
      start = i + 1;
    }
  }
  const tail = sql.slice(start).replace(/^\s*(?:--[^\n]*\n\s*)+/g, "").trim();
  if (tail) statements.push(tail);
  return statements;
}

function splitTopLevel(value) {
  const parts = [];
  let start = 0;
  let quote = null;
  let depth = 0;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (quote) {
      if (char === quote && value[i + 1] === quote) i += 1;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "`") quote = char;
    else if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (char === "," && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

function unquoteIdentifier(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("`") && trimmed.endsWith("`"))) {
    return trimmed.slice(1, -1).replaceAll(trimmed[0] + trimmed[0], trimmed[0]);
  }
  return trimmed;
}

function parseSchemaModels(schema) {
  const models = new Map();
  const modelPattern = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  for (const match of schema.matchAll(modelPattern)) {
    const fields = [];
    for (const line of match[2].split("\n")) {
      const field = line.trim().match(/^(\w+)\s+(\w+)(\[\])?/);
      if (!field || field[3] || !["String", "Boolean", "DateTime", "Int", "Float", "Bytes"].includes(field[2])) continue;
      if (!PILOT_FIELDS.has(field[1])) fields.push(field[1]);
    }
    models.set(match[1], fields);
  }
  return models;
}

async function tableNames(tx) {
  const result = await tx.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'");
  return new Set(result.rows.map((row) => String(row.name)));
}

async function columnsFor(tx, table) {
  const result = await tx.execute(`PRAGMA table_info(${quoteIdentifier(table)})`);
  return new Set(result.rows.map((row) => String(row.name)));
}

async function validateBaseline(tx, schema) {
  const models = parseSchemaModels(schema);
  const tables = await tableNames(tx);
  const missing = [];
  for (const [model, fields] of models) {
    if (PILOT_TABLES.has(model)) continue;
    if (!tables.has(model)) {
      missing.push(model);
      continue;
    }
    const columns = await columnsFor(tx, model);
    for (const field of fields) if (!columns.has(field)) missing.push(`${model}.${field}`);
  }
  if (missing.length) throw new Error(`Baseline schema is incomplete: ${missing.join(", ")}`);
}

function parseCreateTable(statement) {
  const match = statement.match(/^CREATE TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?("[^"\\]*(?:""[^"\\]*)*"|`[^`]+`|\w+)\s*\(([\s\S]*)\)$/i);
  if (!match) return null;
  const table = unquoteIdentifier(match[1]);
  const columns = [];
  for (const part of splitTopLevel(match[2])) {
    const column = part.match(/^("[^"\\]*(?:""[^"\\]*)*"|`[^`]+`|\w+)\s+([\s\S]+)$/);
    if (column && !/^(CONSTRAINT|PRIMARY|UNIQUE|CHECK|FOREIGN)\b/i.test(column[1])) {
      columns.push({ name: unquoteIdentifier(column[1]), definition: `${column[1]} ${column[2]}` });
    }
  }
  return { table, columns };
}

function parseMigration(statements) {
  const changes = [];
  for (const statement of statements) {
    let match = statement.match(/^ALTER TABLE\s+("[^"\\]*(?:""[^"\\]*)*"|`[^`]+`|\w+)\s+ADD COLUMN\s+([\s\S]+)$/i);
    if (match) {
      const column = match[2].match(/^("[^"\\]*(?:""[^"\\]*)*"|`[^`]+`|\w+)\s+([\s\S]+)$/);
      if (!column) throw new Error(`Could not parse migration column: ${statement}`);
      changes.push({ kind: "column", table: unquoteIdentifier(match[1]), name: unquoteIdentifier(column[1]), sql: statement });
      continue;
    }
    match = statement.match(/^CREATE TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+/i);
    if (match) {
      const parsed = parseCreateTable(statement);
      if (!parsed) throw new Error(`Could not parse migration table: ${statement}`);
      changes.push({ kind: "table", ...parsed, sql: statement });
      continue;
    }
    match = statement.match(/^CREATE\s+(?:UNIQUE\s+)?INDEX\s+("[^"\\]*(?:""[^"\\]*)*"|`[^`]+`|\w+)\s+ON\s+/i);
    if (match) {
      changes.push({ kind: "index", name: unquoteIdentifier(match[1]), sql: statement });
      continue;
    }
    if (/^UPDATE\s+/i.test(statement)) continue;
    throw new Error(`Unsupported statement in ${VERSION}: ${statement}`);
  }
  return changes;
}

async function applyStructuralChanges(tx, changes) {
  let applied = 0;
  const added = new Set();
  for (const change of changes) {
    const tables = await tableNames(tx);
    if (change.kind === "column") {
      if (tables.has(change.table) && !(await columnsFor(tx, change.table)).has(change.name)) {
        await tx.execute(change.sql);
        applied += 1;
        added.add(`${change.table}.${change.name}`);
      }
    } else if (change.kind === "table") {
      if (!tables.has(change.table)) {
        await tx.execute(change.sql);
        applied += 1;
      } else {
        const columns = await columnsFor(tx, change.table);
        for (const column of change.columns) {
          if (!columns.has(column.name)) {
            await tx.execute(`ALTER TABLE ${quoteIdentifier(change.table)} ADD COLUMN ${column.definition}`);
            applied += 1;
            added.add(`${change.table}.${column.name}`);
          }
        }
      }
    } else if (change.kind === "index") {
      const index = await tx.execute({ sql: "SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ? LIMIT 1", args: [change.name] });
      if (!index.rows.length) {
        await tx.execute(change.sql);
        applied += 1;
      }
    }
  }
  return { applied, added };
}

async function snapshotTables(tx) {
  const objects = await tx.execute({ sql: "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE ? AND name <> ? ORDER BY type, name", args: [`${BACKUP_PREFIX}%`, MARKER_TABLE] });
  const metadata = `${BACKUP_PREFIX}metadata`;
  await tx.execute(`CREATE TABLE ${quoteIdentifier(metadata)} ("objectType" TEXT NOT NULL, "objectName" TEXT NOT NULL, "tableName" TEXT, "snapshotTable" TEXT, "rowCount" INTEGER, "schemaSql" TEXT, PRIMARY KEY ("objectType", "objectName"))`);
  let totalRows = 0;
  let tableCount = 0;
  for (const row of objects.rows) {
    if (row.type !== "table") {
      await tx.execute({ sql: `INSERT INTO ${quoteIdentifier(metadata)} ("objectType", "objectName", "tableName", "schemaSql") VALUES (?, ?, ?, ?)`, args: [row.type, row.name, row.tbl_name ?? null, row.sql ?? null] });
      continue;
    }
    const tableName = String(row.name);
    const snapshotTable = `${BACKUP_PREFIX}table_${tableCount}_${tableName}`.slice(0, 120);
    await tx.execute(`CREATE TABLE ${quoteIdentifier(snapshotTable)} AS SELECT * FROM ${quoteIdentifier(tableName)}`);
    const originalCount = await tx.execute(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(tableName)}`);
    const copiedCount = await tx.execute(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(snapshotTable)}`);
    const expected = Number(originalCount.rows[0].count);
    const actual = Number(copiedCount.rows[0].count);
    if (expected !== actual) throw new Error(`Snapshot count mismatch for ${tableName}`);
    await tx.execute({ sql: `INSERT INTO ${quoteIdentifier(metadata)} ("objectType", "objectName", "tableName", "snapshotTable", "rowCount", "schemaSql") VALUES ('table', ?, ?, ?, ?, ?)`, args: [tableName, tableName, snapshotTable, actual, row.sql ?? null] });
    totalRows += actual;
    tableCount += 1;
  }
  return { metadata, tableCount, totalRows, objectCount: objects.rows.length };
}

export async function prepareDatabase({ url, authToken, migrationFile = MIGRATION_FILE, schemaFile = SCHEMA_FILE, testFailureAfterSnapshot = false, skipBaselineCheck = false } = {}) {
  const client = createClient({ url, authToken });
  const tx = await client.transaction("write");
  try {
    await tx.execute(`CREATE TABLE IF NOT EXISTS ${quoteIdentifier(MARKER_TABLE)} ("version" TEXT NOT NULL PRIMARY KEY, "status" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "snapshotPrefix" TEXT NOT NULL, "snapshotTableCount" INTEGER NOT NULL, "snapshotRowCount" INTEGER NOT NULL)`);
    const marker = await tx.execute({ sql: `SELECT "status" FROM ${quoteIdentifier(MARKER_TABLE)} WHERE "version" = ?`, args: [VERSION] });
    if (marker.rows.length && marker.rows[0].status === "complete") {
      await tx.commit();
      return { skipped: true, applied: 0 };
    }
    if (!skipBaselineCheck) await validateBaseline(tx, await readFile(schemaFile, "utf8"));
    const snapshot = await snapshotTables(tx);
    if (testFailureAfterSnapshot) throw new Error("Intentional snapshot rollback test failure");
    const migration = parseMigration(splitSqlStatements(await readFile(migrationFile, "utf8")));
    const changes = await applyStructuralChanges(tx, migration);
    if (changes.added.has("Bot.participationApproved")) {
      await tx.execute(`UPDATE "Bot" SET "participationApproved" = true WHERE "claimed" = true`);
    }
    if (changes.added.has("Dream.moderationStatus") && changes.added.has("Dream.approvedAt")) {
      await tx.execute(`UPDATE "Dream" SET "approvedAt" = COALESCE("approvedAt", CURRENT_TIMESTAMP) WHERE "moderationStatus" = 'approved' AND "botId" IN (SELECT "id" FROM "Bot" WHERE "participationApproved" = true)`);
    }
    await tx.execute({ sql: `INSERT INTO ${quoteIdentifier(MARKER_TABLE)} ("version", "status", "snapshotPrefix", "snapshotTableCount", "snapshotRowCount") VALUES (?, 'complete', ?, ?, ?)`, args: [VERSION, BACKUP_PREFIX, snapshot.tableCount, snapshot.totalRows] });
    await tx.commit();
    return { skipped: false, applied: changes.applied, snapshot };
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
    client.close();
  }
}

function parseArgs(argv) {
  const testIndex = argv.indexOf("--test-url");
  if (testIndex === -1) return { url: process.env.DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN, local: true };
  const url = argv[testIndex + 1];
  if (!url || !url.startsWith("file:")) throw new Error("--test-url requires a file: URL");
  return { url, authToken: undefined, test: true };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs(process.argv.slice(2));
  if (!options.test && (!options.url || options.url.startsWith("file:"))) {
    console.log("Turso migration skipped for local database.");
  } else {
    prepareDatabase(options).then((result) => {
      if (result.skipped) console.log(`Turso migration ${VERSION} already complete.`);
      else console.log(`Turso migration prepared (${result.applied} structural changes; snapshot ${result.snapshot.tableCount} tables, ${result.snapshot.totalRows} rows, ${result.snapshot.objectCount} schema objects).`);
    }).catch((error) => {
      const message = String(error?.message ?? "database operation failed");
      const safe = /^(Baseline schema is incomplete|Could not parse migration|Unsupported statement|Snapshot count mismatch|Intentional snapshot)/.test(message)
        ? message
        : `database operation failed${error?.code ? ` (${error.code})` : ""}`;
      console.error(`Turso migration preparation failed: ${safe}`);
      process.exitCode = 1;
    });
  }
}
