#!/usr/bin/env node
// Seeds the 4 EmailTemplate rows (confirmation, edit_link, reminder,
// digest) with sections reproducing exactly what each email looked like
// before the Email Template Manager existed — so nothing visually
// changes until an admin edits something through the new builder.
//
// Safe to re-run: skips any kind that already has a template row, same
// "idempotent, no-op if already done" precedent as
// scripts/apply-remote-migrations.mjs.
//
// Usage (local, default):
//   node scripts/seed-email-templates.mjs
// Usage (remote/staging):
//   DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." \
//     node scripts/seed-email-templates.mjs

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const db = new PrismaClient({ adapter });

const EDIT_URL_PLACEHOLDER = "{{edit_url}}";

const TEMPLATES = [
  {
    kind: "confirmation",
    subject: "Your Shokakko Australia pre-order — {{order_number}}",
    sections: [
      { type: "greeting", show: true, data: {} },
      { type: "product_cards", show: true, data: { source: "order_items", productIds: [] } },
      { type: "cta_button", show: true, data: { text: "Edit My Pre-order", url: EDIT_URL_PLACEHOLDER } },
      { type: "footer", show: true, data: {} },
    ],
  },
  {
    kind: "edit_link",
    subject: "Your Shokakko Australia pre-order edit link",
    sections: [
      { type: "greeting", show: true, data: {} },
      // New as of this sprint (previously showed no items at all) — see
      // the plan's Decisions for why the default is now "shown".
      { type: "product_cards", show: true, data: { source: "order_items", productIds: [] } },
      { type: "cta_button", show: true, data: { text: "Edit My Pre-order", url: EDIT_URL_PLACEHOLDER } },
      { type: "footer", show: true, data: {} },
    ],
  },
  {
    kind: "reminder",
    subject: "Reminder: your Shokakko Australia pre-order closes soon",
    sections: [
      { type: "greeting", show: true, data: {} },
      { type: "countdown", show: true, data: {} },
      { type: "cta_button", show: true, data: { text: "Edit My Pre-order", url: EDIT_URL_PLACEHOLDER } },
      { type: "footer", show: true, data: {} },
    ],
  },
  {
    kind: "digest",
    subject: "Shokakko Australia — Latest Updates",
    sections: [
      { type: "greeting", show: true, data: {} },
      { type: "rich_text", show: false, data: { html: null } },
      { type: "collection_cards", show: false, data: { collectionIds: [] } },
      { type: "product_cards", show: false, data: { source: "manual", productIds: [] } },
      { type: "product_cards", show: false, data: { source: "new_products", productIds: [] } },
      { type: "product_cards", show: false, data: { source: "price_updates", productIds: [] } },
      { type: "product_cards", show: false, data: { source: "sold_out", productIds: [] } },
      { type: "cta_button", show: true, data: { text: "View New Products", url: "/" } },
      { type: "footer", show: true, data: {} },
    ],
  },
];

let created = 0;
for (const t of TEMPLATES) {
  const existing = await db.emailTemplate.findUnique({ where: { kind: t.kind } });
  if (existing) {
    console.log(`Skipping "${t.kind}" — template already exists.`);
    continue;
  }

  await db.emailTemplate.create({
    data: {
      kind: t.kind,
      subject: t.subject,
      sections: {
        create: t.sections.map((s, i) => ({
          type: s.type,
          show: s.show,
          sortOrder: i,
          data: s.data,
        })),
      },
    },
  });
  console.log(`Created "${t.kind}" with ${t.sections.length} sections.`);
  created++;
}

console.log(created === 0 ? "Nothing to seed — already up to date." : `Seeded ${created} template(s).`);
await db.$disconnect();
