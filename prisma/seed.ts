// Sample data for local development/demo purposes only.
// Run with: pnpm db:seed
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const db = new PrismaClient({ adapter });

const products = [
  {
    brand: "Midori",
    name: "MD Paper Journal — A5",
    sku: "MID-MD-A5-001",
    description:
      "Classic dot-grid MD Notebook, beloved for its smooth, fountain-pen-friendly paper.",
    estimatedArrival: "Late September 2026",
    priceCents: 1890,
    isActive: true,
    sortOrder: 0,
    tags: ["Notebooks", "Autumn Collection"],
  },
  {
    brand: "Mind Wave",
    name: "Sakura Washi Tape Set (5 rolls)",
    sku: "MW-WT-SAKURA-05",
    description:
      "Five coordinating washi tape rolls in soft cherry-blossom pinks and greens.",
    estimatedArrival: "Late September 2026",
    priceCents: 2200,
    isActive: true,
    sortOrder: 1,
    tags: ["Washi Tape", "Sakura"],
  },
  {
    brand: "San-X",
    name: "Sumikko Gurashi Sticky Notes",
    sku: "SANX-SG-STICKY-02",
    description: "Cute corner-character sticky note pad, 6 designs per pack.",
    estimatedArrival: null,
    priceCents: 890,
    isActive: true,
    sortOrder: 2,
    tags: ["Stickers", "Sumikko Gurashi"],
  },
  {
    brand: "Kokuyo",
    name: "Jibun Techo Weekly Planner Refill",
    sku: "KOK-JT-REFILL-26",
    description:
      "2026 weekly refill for the Jibun Techo planner system — brand new print run, price to be confirmed.",
    estimatedArrival: "Being confirmed with the printer at the show",
    priceCents: null,
    isActive: true,
    sortOrder: 3,
    tags: ["Planners"],
  },
  {
    brand: "Pilot",
    name: "Iroshizuku Ink Bottle — Tsuki-yo",
    sku: "PIL-IRO-TSUKIYO-50",
    description: "50ml bottle of deep blue-black \"moonlit night\" fountain pen ink.",
    estimatedArrival: "Late September 2026",
    priceCents: 3400,
    isActive: true,
    sortOrder: 4,
    tags: ["Ink", "Fountain Pens"],
  },
  {
    brand: "Hobonichi",
    name: "Techo Cover — Cousin (A5)",
    sku: "HOBO-COVER-COUSIN-A5",
    description: "Soft PVC cover for the A5 Hobonichi Cousin, new print pattern for 2026.",
    estimatedArrival: null,
    priceCents: null,
    isActive: true,
    sortOrder: 5,
    tags: ["Planners", "Autumn Collection"],
  },
];

async function main() {
  for (const p of products) {
    const { tags, ...data } = p;
    await db.product.upsert({
      where: { sku: p.sku },
      update: {
        ...data,
        tags: { set: [], connectOrCreate: tags.map((name) => ({ where: { name }, create: { name } })) },
      },
      create: {
        ...data,
        tags: { connectOrCreate: tags.map((name) => ({ where: { name }, create: { name } })) },
      },
    });
    console.log(`Upserted product: ${p.brand} — ${p.name}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
