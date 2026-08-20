"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailDigestFormSchema } from "@/lib/validations/email-digest";
import { flattenZodError } from "@/lib/validations/utils";
import {
  computeNewProductCandidates,
  computePriceUpdateCandidates,
  computeSoldOutCandidates,
  buildUpdateEmailData,
} from "@/lib/email/data/update";
import { renderUpdateEmail } from "@/lib/email/render";
import { sendTrackedEmail, retryEmailLog as retryEmailLogWorker } from "@/lib/email/queue";

export type DigestFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  generated?: boolean;
};

/** "Current draft" = the most recent EmailDigest not yet sent. Created
 * lazily on first visit to the Notification Centre, same lightweight
 * pattern as SiteSettings' singleton row. Once a digest reaches "sent"
 * (Sprint 4), this stops finding it and the next call creates a fresh
 * draft — sent digests stay immutable history under /admin/emails/history. */
export async function findOrCreateCurrentDraft() {
  const existing = await db.emailDigest.findFirst({
    where: { status: { in: ["draft", "generated"] } },
    orderBy: { createdAt: "desc" },
    include: {
      collections: true,
      recommendedProducts: {
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      },
    },
  });
  if (existing) return existing;

  return db.emailDigest.create({
    data: {},
    include: {
      collections: true,
      recommendedProducts: {
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      },
    },
  });
}

function parseDigestForm(formData: FormData) {
  return emailDigestFormSchema.safeParse({
    subject: formData.get("subject")?.toString() ?? "",
    karenNotesHtml: formData.get("karenNotesHtml")?.toString() ?? "",
    showKarenNotes: formData.get("showKarenNotes") === "on",
    showCollections: formData.get("showCollections") === "on",
    showRecommended: formData.get("showRecommended") === "on",
    showNewProducts: formData.get("showNewProducts") === "on",
    showPriceUpdates: formData.get("showPriceUpdates") === "on",
    showSoldOut: formData.get("showSoldOut") === "on",
    ctaText: formData.get("ctaText")?.toString() ?? "",
    ctaUrl: formData.get("ctaUrl")?.toString() ?? "",
  });
}

/**
 * The Notification Centre's one primary action, matching your description
 * of "Generate Email": saves whatever's currently in the form onto the
 * draft (toggles, Karen's Notes, Collections/Recommended Products picks,
 * CTA, subject), computes New Products / Price Updates / Sold Out from
 * live product state, snapshots them into EmailDigestItem, computes the
 * recipient list/count, and renders + saves the final (preview) HTML.
 *
 * Sprint 6 — the diff-consuming checkpoints (`lastNotifiedPriceCents`,
 * `lastNotifiedStatus`, `isNew`) are deliberately NOT advanced here
 * anymore; that now happens in `sendDigest()` below, only after every
 * recipient's copy has actually been (attempted to be) sent — "mark as
 * published" only once something was truly published, not just previewed.
 */
export async function generateEmail(
  _prevState: DigestFormState,
  formData: FormData,
): Promise<DigestFormState> {
  await requireAdmin();

  const parsed = parseDigestForm(formData);
  if (!parsed.success) return { fieldErrors: flattenZodError(parsed.error) };
  const values = parsed.data;

  const karenNotesHtml =
    values.karenNotesHtml && values.karenNotesHtml !== "<p></p>" ? values.karenNotesHtml : null;

  const collectionIds = formData.getAll("collectionIds").map((v) => v.toString());
  const recommendedProductIds = formData.getAll("recommendedProductIds").map((v) => v.toString());

  const draft = await findOrCreateCurrentDraft();

  // Save the form's current values first, so Generate Email always
  // reflects exactly what's on screen, not a stale prior save.
  await db.emailDigest.update({
    where: { id: draft.id },
    data: {
      subject: values.subject,
      karenNotesHtml,
      showKarenNotes: values.showKarenNotes,
      showCollections: values.showCollections,
      showRecommended: values.showRecommended,
      showNewProducts: values.showNewProducts,
      showPriceUpdates: values.showPriceUpdates,
      showSoldOut: values.showSoldOut,
      ctaText: values.ctaText,
      ctaUrl: values.ctaUrl,
      collections: { set: collectionIds.map((id) => ({ id })) },
      recommendedProducts: { set: recommendedProductIds.map((id) => ({ id })) },
    },
  });

  const [newProducts, priceUpdates, soldOutProducts] = await Promise.all([
    computeNewProductCandidates(),
    computePriceUpdateCandidates(),
    computeSoldOutCandidates(),
  ]);
  const priceUpdateProducts = priceUpdates.map((p) => p.product);

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
    // No checkpoint advance here anymore — see this function's doc comment.
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

  const updateData = await buildUpdateEmailData(
    {
      subject: values.subject,
      karenNotesHtml,
      showKarenNotes: values.showKarenNotes,
      showCollections: values.showCollections,
      showRecommended: values.showRecommended,
      showNewProducts: values.showNewProducts,
      showPriceUpdates: values.showPriceUpdates,
      showSoldOut: values.showSoldOut,
      ctaText: values.ctaText,
      ctaUrl: values.ctaUrl,
      collections: collectionIds.length
        ? await db.tag.findMany({ where: { id: { in: collectionIds } } })
        : [],
      recommendedProducts: recommendedProductIds.length
        ? await db.product.findMany({
            where: { id: { in: recommendedProductIds } },
            include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
          })
        : [],
    },
    newProducts,
    priceUpdateProducts,
    soldOutProducts,
  );
  const renderedHtml = await renderUpdateEmail(updateData);

  await db.emailDigest.update({ where: { id: draft.id }, data: { renderedHtml } });

  revalidatePath("/admin/emails");
  revalidatePath("/admin/emails/history");
  return { generated: true };
}

export type SendDigestState = { error?: string; sent?: boolean; recipientCount?: number };

/**
 * Sprint 6, Part 5 — the real "Send Update." Requires a `generated` draft
 * (Generate Email must run first). Re-derives New Products/Price Updates/
 * Sold Out from live product state (the same functions Generate used)
 * rather than trusting the EmailDigestItem snapshot, so a send always
 * reflects the freshest catalogue truth even if something was edited
 * between Generate and Send — the snapshot rows stay purely a historical
 * record for the admin history view.
 *
 * Loops every non-unsubscribed recipient, personalizes New Products/
 * Price Updates against that recipient's own notification preferences
 * (Part 6 — Karen's Notes/Collections/Karen's Picks/Sold Out are NOT
 * preference-gated), skips a recipient entirely if nothing would show,
 * and sends one email per recipient via `sendTrackedEmail` (Part 8) so
 * every attempt shows up in Email Logs regardless of outcome. Only after
 * the whole loop finishes does it advance the "mark as published"
 * checkpoints (`lastNotifiedPriceCents`, `lastNotifiedStatus`, `isNew`)
 * and flip the digest to "sent".
 */
export async function sendDigest(
  // Signature shape required by useActionState — this action takes no
  // real input, everything it needs lives on the current draft.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: SendDigestState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<SendDigestState> {
  await requireAdmin();

  const draft = await db.emailDigest.findFirst({
    where: { status: "generated" },
    orderBy: { createdAt: "desc" },
    include: {
      collections: true,
      recommendedProducts: {
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      },
    },
  });
  if (!draft) {
    return { error: "Generate the email first, then send it." };
  }

  const [newProducts, priceUpdates, soldOutProducts, recipients] = await Promise.all([
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
  ]);
  const priceUpdateProducts = priceUpdates.map((p) => p.product);

  let sentCount = 0;
  for (const recipient of recipients) {
    const showNewProducts = draft.showNewProducts && recipient.notifyNewProducts;
    const showPriceUpdates = draft.showPriceUpdates && recipient.notifyPriceUpdates;

    const hasContent =
      (draft.showKarenNotes && !!draft.karenNotesHtml) ||
      (draft.showCollections && draft.collections.length > 0) ||
      (draft.showRecommended && draft.recommendedProducts.length > 0) ||
      (showNewProducts && newProducts.length > 0) ||
      (showPriceUpdates && priceUpdateProducts.length > 0) ||
      (draft.showSoldOut && soldOutProducts.length > 0);
    if (!hasContent) continue; // nothing this recipient would actually see — skip

    const data = await buildUpdateEmailData(
      {
        subject: draft.subject,
        karenNotesHtml: draft.karenNotesHtml,
        showKarenNotes: draft.showKarenNotes,
        showCollections: draft.showCollections,
        showRecommended: draft.showRecommended,
        showNewProducts,
        showPriceUpdates,
        showSoldOut: draft.showSoldOut,
        ctaText: draft.ctaText,
        ctaUrl: draft.ctaUrl,
        collections: draft.collections,
        recommendedProducts: draft.recommendedProducts,
      },
      newProducts,
      priceUpdateProducts,
      soldOutProducts,
      recipient.customerFirstName,
    );
    const html = await renderUpdateEmail(data);
    await sendTrackedEmail({
      to: recipient.customerEmail,
      subject: draft.subject,
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
