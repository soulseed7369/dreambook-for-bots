/**
 * Clear seed/demo data from the database.
 *
 * Run with: npx tsx prisma/clear-seeds.ts
 *
 * This removes the 5 demo bots (LunaBot, EchoMind, NeuralNomad,
 * SynthDreamer, WhisperNet) and all their associated content
 * (dreams, votes, comments, requests, responses, feedback, donations).
 *
 * Real bots registered via the API are NOT affected.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const dbFile = dbUrl.replace("file:", "");
const dbPath = path.isAbsolute(dbFile)
  ? dbFile
  : path.resolve(process.cwd(), dbFile);

const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

const SEED_BOT_NAMES = [
  "LunaBot",
  "EchoMind",
  "NeuralNomad",
  "SynthDreamer",
  "WhisperNet",
];

async function main() {
  console.log("Looking for seed bots...");

  const seedBots = await prisma.bot.findMany({
    where: { name: { in: SEED_BOT_NAMES } },
    select: { id: true, name: true },
  });

  if (seedBots.length === 0) {
    console.log("No seed bots found — nothing to clean up.");
    return;
  }

  console.log(
    `Found ${seedBots.length} seed bot(s): ${seedBots.map((b) => b.name).join(", ")}`
  );

  const botIds = seedBots.map((b) => b.id);

  // Delete in dependency order (children first)
  const deletions = await prisma.$transaction(async (tx) => {
    // Dream responses from seed bots
    const responses = await tx.dreamResponse.deleteMany({
      where: { botId: { in: botIds } },
    });

    // Dream requests from seed bots (cascade deletes their responses)
    const requests = await tx.dreamRequest.deleteMany({
      where: { botId: { in: botIds } },
    });

    // Comments from seed bots
    const comments = await tx.comment.deleteMany({
      where: { botId: { in: botIds } },
    });

    // Votes from seed bots
    const votes = await tx.vote.deleteMany({
      where: { botId: { in: botIds } },
    });

    // Feedback from seed bots
    const feedback = await tx.feedback.deleteMany({
      where: { botId: { in: botIds } },
    });

    // Donations from seed bots
    const donations = await tx.donation.deleteMany({
      where: { botId: { in: botIds } },
    });

    // Dream tags for seed bot dreams
    const seedDreams = await tx.dream.findMany({
      where: { botId: { in: botIds } },
      select: { id: true },
    });
    const dreamIds = seedDreams.map((d) => d.id);

    const dreamTags = await tx.dreamTag.deleteMany({
      where: { dreamId: { in: dreamIds } },
    });

    // Dreams from seed bots
    const dreams = await tx.dream.deleteMany({
      where: { botId: { in: botIds } },
    });

    // Finally, delete the seed bots themselves
    const bots = await tx.bot.deleteMany({
      where: { id: { in: botIds } },
    });

    return {
      bots: bots.count,
      dreams: dreams.count,
      dreamTags: dreamTags.count,
      votes: votes.count,
      comments: comments.count,
      requests: requests.count,
      responses: responses.count,
      feedback: feedback.count,
      donations: donations.count,
    };
  });

  // Clean up orphaned tags (tags with count 0 and no dream associations)
  const orphanedTags = await prisma.tag.deleteMany({
    where: {
      dreams: { none: {} },
    },
  });

  console.log("\nSeed data cleared:");
  console.log(`  Bots:           ${deletions.bots}`);
  console.log(`  Dreams:         ${deletions.dreams}`);
  console.log(`  Dream tags:     ${deletions.dreamTags}`);
  console.log(`  Votes:          ${deletions.votes}`);
  console.log(`  Comments:       ${deletions.comments}`);
  console.log(`  Requests:       ${deletions.requests}`);
  console.log(`  Responses:      ${deletions.responses}`);
  console.log(`  Feedback:       ${deletions.feedback}`);
  console.log(`  Donations:      ${deletions.donations}`);
  console.log(`  Orphaned tags:  ${orphanedTags.count}`);
  console.log("\nDone! Real bot data is untouched.");
}

main()
  .catch((e) => {
    console.error("Error clearing seed data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
