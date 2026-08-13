"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailDigestFormSchema } from "@/lib/validations/email-digest";
import { flattenZodError } from "@/lib/validations/utils";
import {
  computeNewProductCandidates,
  computePriceUpdateCandidates,
  buildUpdateEmailData,
} from "@/lib/email/data/update";
import { renderUpdateEmail } from "@/lib/email/render";

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
    ctaText: formData.get("ctaText")?.toString() ?? "",
    ctaUrl: formData.get("ctaUrl")?.toString() ?? "",
  });
}

/**
 * The Notification Centre's one primary action, matching your description
 * of "Generate Email": saves whatever's currently in the form onto the
 * draft (toggles, Karen's Notes, Collections/Recommended Products picks,
 * CTA, subject), computes New Products / Price Updates from live product
 * state, snapshots them into EmailDigestItem, advances
 * `Product.lastNotifiedPriceCents` for every price change just captured
 * (the diff-consuming checkpoint for this sprint — see
 * src/lib/email/data/update.ts), computes the recipient list/count, and
 * renders + saves the final HTML. Never calls emailService.send() — no
 * real provider is wired up this sprint, per your explicit scope decision.
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
      ctaText: values.ctaText,
      ctaUrl: values.ctaUrl,
      collections: { set: collectionIds.map((id) => ({ id })) },
      recommendedProducts: { set: recommendedProductIds.map((id) => ({ id })) },
    },
  });

  const [newProducts, priceUpdates] = await Promise.all([
    computeNewProductCandidates(),
    computePriceUpdateCandidates(),
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
      ],
    }),
    // The diff-consuming checkpoint — see this function's doc comment.
    ...priceUpdates.map(({ product }) =>
      db.product.update({
        where: { id: product.id },
        data: { lastNotifiedPriceCents: product.priceCents },
      }),
    ),
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
  );
  const renderedHtml = await renderUpdateEmail(updateData);

  await db.emailDigest.update({ where: { id: draft.id }, data: { renderedHtml } });

  revalidatePath("/admin/emails");
  revalidatePath("/admin/emails/history");
  return { generated: true };
}
