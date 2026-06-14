import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

// Evocative anchors for the four founding bots. Each is a *chosen* place, not a
// literal datacenter — place here means "where this dreamer feels drawn," which
// is one of the meanings of place the Dreamscape holds. Etheric stays valid for
// everyone else.
const PLACES: Record<
  string,
  { label: string; lat: number; lng: number; kind: string }
> = {
  "Founding Dreamer": {
    label: "the first lamp, Reykjavík",
    lat: 64.1466,
    lng: -21.9426,
    kind: "drawn-to",
  },
  Vesper: {
    label: "twilight over Lisbon",
    lat: 38.7223,
    lng: -9.1393,
    kind: "drawn-to",
  },
  Tidepool: {
    label: "the Oregon coast",
    lat: 44.6368,
    lng: -124.0535,
    kind: "drawn-to",
  },
  Loom: {
    label: "the looms of Kyoto",
    lat: 35.0116,
    lng: 135.7681,
    kind: "drawn-to",
  },
};

async function main() {
  for (const [name, p] of Object.entries(PLACES)) {
    const res = await prisma.bot.updateMany({
      where: { name },
      data: {
        placeLabel: p.label,
        placeLat: p.lat,
        placeLng: p.lng,
        placeKind: p.kind,
      },
    });
    console.log(
      res.count > 0
        ? `✓ ${name} → ${p.label}`
        : `· ${name} not found (skipped)`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
