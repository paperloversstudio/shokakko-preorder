"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  computeNewProductCandidates,
  computePriceUpdateCandidates,
  computeSoldOutCandidates,
} from "@/lib/email/data/update";
import { resolveTemplateSections, type ResolvedSection } from "@/lib/email/data/generic";
import { renderGenericEmail } from "@/lib/email/render";
import { buildFooterLinks } from "@/lib/email/site-url";
import { sendTrackedEmail, retryEmailLog as retryEmailLogWorker } from "@/lib/email/queue";

export type DigestFormState = { error?: string; generated?: boolean };

/** "Current draft" = the most recent EmailDigest not yet sent. Created
 * lazily on first visit to the Notification Centre, same lightweight
 * pattern as SiteSettings' singleton row. Once a digest reaches "sent",
 * this stops finding it and the next call creates a fresh draft — sent
 * digests stay immutable history under /admin/emails/history. */
export async function findOrCreateCurrentDraft() {
  const existing = await db.emailDigest.findFirst({
    where: { status: { in: ["draft", "generated"] } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return db.emailDigest.create({ data: {} });
}

/** Section types that count as real "something to say" content — a
 * recipient whose resolved sections are only structural (Greeting,
 * Footer, the CTA button) has nothing worth sending. */
const CONTENT_SECTION_TYPES = new Set<ResolvedSection["type"]>([
  "hero_banner",
  "rich_text",
  "image",
  "collection_cards",
  "product_cards_grid",
  "product_cards_order",
]);

/**
 * The Notification Centre's "Generate Email" — computes/snapshots New
 * Products/Price Updates/Sold Out into EmailDigestItem (unchanged from
 * Sprint 6), then resolves the admin-authored "digest" EmailTemplate
 * (Email Template Manager) into a preview render. No form input anymore
 * — the template's structure lives in the Template Manager now, not a
 * form on this page — so this just computes + snapshots + renders
 * whatever the current template says.
 *
 * The diff-consuming checkpoints (`lastNotifiedPriceCents`,
 * `lastNotifiedStatus`, `isNew`) are NOT advanced here — that happens in
 * `sendDigest()` below, only after every recipient's copy has actually
 * been (attempted to be) sent.
 */
export async function generateEmail(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: DigestFormState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<DigestFormState> {
  await requireAdmin();

  const draft = await findOrCreateCurrentDraft();

  const [newProducts, priceUpdates, soldOutProducts] = await Promise.all([
    computeNewProductCandidates(),
    computePriceUpdateCandidates(),
    computeSoldOutCandidates(),
  ]);

  const recipients = await db.preOrder.findMany({
    where: { unsubscribedAt: null },
    select: { id: true },
  });

  await db.$transaction([
    db.emailDigestItem.deleteMany({ where: { digestId: draft.id } }),
    db.emailDigestItem.createMany({
      data: [
        ...newProducts.map((p) => ({
          digestId: draft.id,
          productId: p.id,
          kind: "new",
          productName: p.name,
          priceCents: p.priceCents,
        })),
        ...priceUpdates.map(({ product, previousPriceCents }) => ({
          digestId: draft.id,
          productId: product.id,
          kind: "price_update",
          productName: product.name,
          priceCents: product.priceCents,
          previousPriceCents,
        })),
        ...soldOutProducts.map((p) => ({
          digestId: draft.id,
          productId: p.id,
          kind: "sold_out",
          productName: p.name,
          priceCents: p.priceCents,
        })),
      ],
    }),
    db.emailDigest.update({
      where: { id: draft.id },
      data: {
        recipients: { set: recipients.map((r) => ({ id: r.id })) },
        recipientCount: recipients.length,
        status: "generated",
        generatedAt: new Date(),
      },
    }),
  ]);

  const settings = await db.siteSettings.findUnique({ where: { id: "singleton" } });
  const logoUrl = settings?.logoUrl ?? null;
  const eventName = settings?.eventName ?? null;
  const footerLinks = await buildFooterLinks(settings, null);

  const { subject, sections } = await resolveTemplateSections("digest", {
    firstName: "there",
    logoUrl,
    eventName,
    footerLinks,
    editUrl: null,
  });
  const renderedHtml = await renderGenericEmail({ subject, firstName: "there", logoUrl, eventName, footerLinks, sections });

  await db.emailDigest.update({ where: { id: draft.id }, data: { renderedHtml } });

  revalidatePath("/admin/emails");
  revalidatePath("/admin/emails/history");
  return { generated: true };
}

export type SendDigestState = { error?: string; sent?: boolean; recipientCount?: number };

/**
 * The real "Send Update." Requires a `generated` draft. Re-derives New
 * Products/Price Updates/Sold Out from live product state (same
 * functions Generate used) rather than trusting the EmailDigestItem
 * snapshot, so a send always reflects the freshest catalogue truth even
 * if something was edited between Generate and Send — the snapshot rows
 * stay purely a historical record for the admin history view.
 *
 * Loops every non-unsubscribed recipient, resolving the "digest" template
 * once per recipient with their own notifyNewProducts/notifyPriceUpdates
 * excluded when off (Karen's Notes/Collections/Karen's Picks/Sold Out are
 * NOT preference-gated), skips a recipient entirely if nothing but
 * structural sections (Greeting/Footer/CTA) would show, and sends one
 * email per recipient via sendTrackedEmail so every attempt shows up in
 * Email Logs regardless of outcome. Only after the whole loop finishes
 * does it advance the "mark as published" checkpoints and flip the
 * digest to "sent".
 */
export async function sendDigest(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: SendDigestState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<SendDigestState> {
  await requireAdmin();

  const draft = await db.emailDigest.findFirst({
    where: { status: "generated" },
    orderBy: { createdAt: "desc" },
  });
  if (!draft) {
    return { error: "Generate the email first, then send it." };
  }

  const [newProducts, priceUpdates, soldOutProducts, recipients, settings] = await Promise.all([
    computeNewProductCandidates(),
    computePriceUpdateCandidates(),
    computeSoldOutCandidates(),
    db.preOrder.findMany({
      where: { unsubscribedAt: null },
      select: {
        id: true,
        customerEmail: true,
        customerFirstName: true,
        notifyNewProducts: true,
        notifyPriceUpdates: true,
      },
    }),
    db.siteSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  const logoUrl = settings?.logoUrl ?? null;
  const eventName = settings?.eventName ?? null;
  const footerLinks = await buildFooterLinks(settings, null);

  let sentCount = 0;
  for (const recipient of recipients) {
    const excludeProductSources: string[] = [];
    if (!recipient.notifyNewProducts) excludeProductSources.push("new_products");
    if (!recipient.notifyPriceUpdates) excludeProductSources.push("price_updates");

    const { subject, sections } = await resolveTemplateSections("digest", {
      firstName: recipient.customerFirstName,
      logoUrl,
      eventName,
      footerLinks,
      editUrl: null,
      excludeProductSources,
    });

    const hasContent = sections.some((s) => CONTENT_SECTION_TYPES.has(s.type));
    if (!hasContent) continue; // nothing this recipient would actually see — skip

    const html = await renderGenericEmail({
      subject,
      firstName: recipient.customerFirstName,
      logoUrl,
      eventName,
      footerLinks,
      sections,
    });
    await sendTrackedEmail({
      to: recipient.customerEmail,
      subject,
      html,
      template: "digest",
      preOrderId: recipient.id,
      digestId: draft.id,
    });
    sentCount++;
  }

  // "Mark as published" — only now, after every attempted send.
  await db.$transaction([
    ...priceUpdates.map(({ product }) =>
      db.product.update({
        where: { id: product.id },
        data: { lastNotifiedPriceCents: product.priceCents },
      }),
    ),
    ...soldOutProducts.map((p) =>
      db.product.update({ where: { id: p.id }, data: { lastNotifiedStatus: "sold_out" } }),
    ),
    ...newProducts.map((p) => db.product.update({ where: { id: p.id }, data: { isNew: false } })),
    db.emailDigest.update({
      where: { id: draft.id },
      data: { status: "sent", recipientCount: sentCount },
    }),
  ]);

  revalidatePath("/admin/emails");
  revalidatePath("/admin/emails/history");
  revalidatePath("/admin/emails/logs");
  revalidatePath("/admin/emails/dashboard");
  return { sent: true, recipientCount: sentCount };
}

/** Admin Email Logs' Retry button — re-runs the worker step on one
 * already-queued row. Same `.bind(null, id)` form-action convention as
 * `deleteBanner`/`deleteProduct` elsewhere in this admin. */
export async function retryEmailLog(id: string): Promise<void> {
  await requireAdmin();
  await retryEmailLogWorker(id);
  revalidatePath("/admin/emails/logs");
  revalidatePath("/admin/emails/dashboard");
}
