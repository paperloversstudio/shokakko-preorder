import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/validations/product";

export default async function EmailHistoryDetailPage({
  params,
}: PageProps<"/admin/emails/history/[id]">) {
  const { id } = await params;
  const digest = await db.emailDigest.findUnique({
    where: { id },
    include: {
      collections: true,
      recommendedProducts: true,
      items: true,
    },
  });
  if (!digest) notFound();

  const newItems = digest.items.filter((i) => i.kind === "new");
  const priceItems = digest.items.filter((i) => i.kind === "price_update");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/emails/history"
          className="text-sm font-semibold text-ink-soft hover:text-ink"
        >
          ← Back to history
        </Link>
        <h1 className="mt-1 font-display text-2xl font-bold">{digest.subject}</h1>
        <p className="text-sm text-ink-soft">
          Status: {digest.status}
          {digest.recipientCount !== null &&
            ` · ${digest.recipientCount} recipient${digest.recipientCount === 1 ? "" : "s"}`}
          {digest.generatedAt &&
            ` · generated ${digest.generatedAt.toLocaleString("en-AU", {
              dateStyle: "medium",
              timeStyle: "short",
            })}`}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4 rounded-card bg-white p-6 shadow-sm shadow-ink/5">
          <h2 className="font-display font-bold">What was included</h2>
          <ul className="flex flex-col gap-1 text-sm text-ink-soft">
            <li>Karen&apos;s Notes: {digest.showKarenNotes ? "Shown" : "Hidden"}</li>
            <li>
              Collections: {digest.showCollections ? "Shown" : "Hidden"} (
              {digest.collections.map((c) => c.name).join(", ") || "none picked"})
            </li>
            <li>
              Karen&apos;s Picks: {digest.showRecommended ? "Shown" : "Hidden"} (
              {digest.recommendedProducts.map((p) => p.name).join(", ") || "none picked"})
            </li>
            <li>New Products: {digest.showNewProducts ? "Shown" : "Hidden"}</li>
            <li>Price Updates: {digest.showPriceUpdates ? "Shown" : "Hidden"}</li>
          </ul>

          {newItems.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-ink">New Products captured</h3>
              <ul className="mt-1 text-sm text-ink-soft">
                {newItems.map((item) => (
                  <li key={item.id}>
                    {item.productName} — {formatPrice(item.priceCents)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {priceItems.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-ink">Price Updates captured</h3>
              <ul className="mt-1 text-sm text-ink-soft">
                {priceItems.map((item) => (
                  <li key={item.id}>
                    {item.productName} — {formatPrice(item.previousPriceCents)} →{" "}
                    {formatPrice(item.priceCents)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold">Saved render</h2>
          {digest.renderedHtml ? (
            <iframe
              title={`${digest.subject} — saved render`}
              srcDoc={digest.renderedHtml}
              className="h-[700px] w-full rounded-card border border-line bg-white"
            />
          ) : (
            <p className="rounded-card bg-white p-8 text-center text-ink-soft shadow-sm shadow-ink/5">
              Not generated yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
