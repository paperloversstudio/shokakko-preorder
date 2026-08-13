import Link from "next/link";
import { db } from "@/lib/db";
import {
  computeNewProductCandidates,
  computePriceUpdateCandidates,
  buildUpdateEmailData,
} from "@/lib/email/data/update";
import { renderUpdateEmail } from "@/lib/email/render";
import { findOrCreateCurrentDraft } from "./actions";
import { NotificationCentreForm } from "./NotificationCentreForm";

export default async function NotificationCentrePage() {
  const draft = await findOrCreateCurrentDraft();

  const [newProducts, priceUpdates, recipientCount, tags, products] = await Promise.all([
    computeNewProductCandidates(),
    computePriceUpdateCandidates(),
    db.preOrder.count({ where: { unsubscribedAt: null } }),
    db.tag.findMany({ orderBy: { name: "asc" } }),
    db.product.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    }),
  ]);
  const priceUpdateProducts = priceUpdates.map((p) => p.product);

  // Once a digest has been generated at least once, show exactly what was
  // saved rather than a fresh live recompute — Generate Email can itself
  // change the live New/Price-Update candidates (advancing
  // lastNotifiedPriceCents consumes the diff), so re-deriving "live" right
  // after generating would show a *different*, already-moved-on state
  // than what was actually captured. Before any generate, there's nothing
  // saved yet, so the live recompute is the only preview available.
  const previewHtml = draft.renderedHtml
    ? draft.renderedHtml
    : await renderUpdateEmail(await buildUpdateEmailData(draft, newProducts, priceUpdateProducts));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Notification Centre</h1>
          <p className="text-sm text-ink-soft">
            Prepare the Update Email — collect changes throughout the day,
            then generate one digest when you&apos;re ready.
          </p>
        </div>
        <Link
          href="/admin/emails/history"
          className="rounded-pill px-3 py-1.5 text-sm font-semibold hover:bg-mint/50"
        >
          View history →
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="rounded-card bg-white p-6 shadow-sm shadow-ink/5">
          <NotificationCentreForm
            draft={{
              subject: draft.subject,
              karenNotesHtml: draft.karenNotesHtml ?? "",
              showKarenNotes: draft.showKarenNotes,
              showCollections: draft.showCollections,
              showRecommended: draft.showRecommended,
              showNewProducts: draft.showNewProducts,
              showPriceUpdates: draft.showPriceUpdates,
              ctaText: draft.ctaText,
              ctaUrl: draft.ctaUrl,
              status: draft.status,
              generatedAt: draft.generatedAt ? draft.generatedAt.toISOString() : null,
            }}
            collectionOptions={tags.map((t) => ({
              id: t.id,
              name: t.name,
              selected: draft.collections.some((c) => c.id === t.id),
            }))}
            productOptions={products.map((p) => ({
              id: p.id,
              name: p.name,
              brand: p.brand,
              selected: draft.recommendedProducts.some((r) => r.id === p.id),
            }))}
            newProductCount={newProducts.length}
            priceUpdateCount={priceUpdateProducts.length}
            recipientCount={recipientCount}
          />
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold">
            {draft.renderedHtml ? "Last generated preview" : "Live preview"}
          </h2>
          <p className="text-sm text-ink-soft">
            {draft.renderedHtml
              ? "Exactly what Generate Email saved — click it again after making changes to refresh this."
              : "Reflects the catalogue right now — click Generate Email to save this as the digest."}{" "}
            Shown with a placeholder name; each real send will be
            personalized per recipient (a future sprint).
          </p>
          <iframe
            title="Update Email preview"
            srcDoc={previewHtml}
            className="h-[700px] w-full rounded-card border border-line bg-white"
          />
        </div>
      </div>
    </div>
  );
}
