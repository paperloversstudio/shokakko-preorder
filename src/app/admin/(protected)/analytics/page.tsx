import { db } from "@/lib/db";

type CountEntry = { label: string; count: number; sublabel?: string };

/** Small shared presentational block for every "Top N" list on this page
 * — a ranked name + count, same rounded-card treatment as everything
 * else in the admin. Kept intentionally plain (no chart library, no new
 * dependency), consistent with this project's established approach. */
function TopListCard({ title, entries, emptyLabel, unit }: {
  title: string;
  entries: CountEntry[];
  emptyLabel: string;
  unit: string;
}) {
  return (
    <div className="rounded-card bg-white p-5 shadow-sm shadow-ink/5">
      <h2 className="mb-3 font-display font-bold">{title}</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-ink-soft">{emptyLabel}</p>
      ) : (
        <ol className="flex flex-col divide-y divide-line">
          {entries.map((entry, index) => (
            <li key={entry.label} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  <span className="mr-1.5 text-ink-soft">{index + 1}.</span>
                  {entry.label}
                </p>
                {entry.sublabel && (
                  <p className="truncate text-xs text-ink-soft">{entry.sublabel}</p>
                )}
              </div>
              <span className="shrink-0 rounded-pill bg-mint px-2.5 py-1 text-xs font-bold tabular-nums text-[#3f6b57]">
                {entry.count} {unit}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const ACTIVITY_ICON: Record<string, string> = {
  product_added: "🆕",
  price_updated: "💲",
  order_submitted: "🧾",
  wishlist_added: "♡",
};

function topEntries(counts: Map<string, number>, limit = 10): [string, number][] {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

/** Sprint 3.5 — read-only interest/behaviour signals for Karen: what
 * customers are saving vs. actually committing to buy. Every list below
 * is computed from two single-pass queries (all WishlistItems, all
 * OrderItems with their Product) rather than one groupBy per section —
 * simpler to keep correct than juggling many separate relation-spanning
 * aggregations, and this dataset is boutique-event-sized, not web-scale. */
export default async function AnalyticsDashboardPage() {
  const [wishlistItems, orderItems, priceUnknownProducts, recentActivity] = await Promise.all([
    db.wishlistItem.findMany({
      include: {
        product: { select: { id: true, name: true, brand: true, tags: { select: { name: true } } } },
      },
    }),
    db.orderItem.findMany({
      where: { productId: { not: null } },
      select: {
        productId: true,
        quantity: true,
        product: { select: { id: true, name: true, brand: true, tags: { select: { name: true } } } },
      },
    }),
    db.product.findMany({
      where: { priceCents: null },
      select: { id: true, name: true, brand: true },
    }),
    db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const productInfo = new Map<string, { name: string; brand: string }>();
  const wishlistByProduct = new Map<string, number>();
  const wishlistByBrand = new Map<string, number>();
  const wishlistByCollection = new Map<string, number>();

  for (const item of wishlistItems) {
    if (!item.product) continue;
    productInfo.set(item.product.id, { name: item.product.name, brand: item.product.brand });
    wishlistByProduct.set(item.product.id, (wishlistByProduct.get(item.product.id) ?? 0) + 1);
    wishlistByBrand.set(item.product.brand, (wishlistByBrand.get(item.product.brand) ?? 0) + 1);
    for (const tag of item.product.tags) {
      wishlistByCollection.set(tag.name, (wishlistByCollection.get(tag.name) ?? 0) + 1);
    }
  }

  const orderedByProduct = new Map<string, number>();
  const orderedByBrand = new Map<string, number>();
  const orderedByCollection = new Map<string, number>();

  for (const item of orderItems) {
    if (!item.product || !item.productId) continue;
    productInfo.set(item.product.id, { name: item.product.name, brand: item.product.brand });
    orderedByProduct.set(item.productId, (orderedByProduct.get(item.productId) ?? 0) + item.quantity);
    orderedByBrand.set(
      item.product.brand,
      (orderedByBrand.get(item.product.brand) ?? 0) + item.quantity,
    );
    for (const tag of item.product.tags) {
      orderedByCollection.set(tag.name, (orderedByCollection.get(tag.name) ?? 0) + item.quantity);
    }
  }

  const mostWishlistedProducts: CountEntry[] = topEntries(wishlistByProduct).map(([id, count]) => ({
    label: productInfo.get(id)?.name ?? "Unknown product",
    sublabel: productInfo.get(id)?.brand,
    count,
  }));
  const mostWishlistedBrands: CountEntry[] = topEntries(wishlistByBrand).map(([brand, count]) => ({
    label: brand,
    count,
  }));
  const mostWishlistedCollections: CountEntry[] = topEntries(wishlistByCollection).map(
    ([name, count]) => ({ label: name, count }),
  );
  const mostAddedToPreOrder: CountEntry[] = topEntries(orderedByProduct).map(([id, count]) => ({
    label: productInfo.get(id)?.name ?? "Unknown product",
    sublabel: productInfo.get(id)?.brand,
    count,
  }));
  const mostPopularBrands: CountEntry[] = topEntries(orderedByBrand).map(([brand, count]) => ({
    label: brand,
    count,
  }));
  const mostPopularCollections: CountEntry[] = topEntries(orderedByCollection).map(
    ([name, count]) => ({ label: name, count }),
  );

  const productsWaitingForPrice: CountEntry[] = priceUnknownProducts
    .map((p) => ({ label: p.name, sublabel: p.brand, count: wishlistByProduct.get(p.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // High Interest: many wishlists, few (or no) actual orders — a simple,
  // documented heuristic (wishlist count minus ordered quantity), not a
  // hidden magic number, so it's easy to adjust later if needed.
  const highInterestProducts: CountEntry[] = Array.from(wishlistByProduct.entries())
    .map(([id, wishlistCount]) => ({
      label: productInfo.get(id)?.name ?? "Unknown product",
      sublabel: productInfo.get(id)?.brand,
      count: wishlistCount,
      score: wishlistCount - (orderedByProduct.get(id) ?? 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ label, sublabel, count }) => ({ label, sublabel, count }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Analytics Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <TopListCard
          title="Most Wishlisted Products"
          entries={mostWishlistedProducts}
          emptyLabel="No wishlist activity yet."
          unit="saves"
        />
        <TopListCard
          title="Most Added To Pre-order"
          entries={mostAddedToPreOrder}
          emptyLabel="No pre-orders yet."
          unit="requested"
        />
        <TopListCard
          title="Most Wishlisted Brands"
          entries={mostWishlistedBrands}
          emptyLabel="No wishlist activity yet."
          unit="saves"
        />
        <TopListCard
          title="Most Popular Brands"
          entries={mostPopularBrands}
          emptyLabel="No pre-orders yet."
          unit="ordered"
        />
        <TopListCard
          title="Most Wishlisted Collections"
          entries={mostWishlistedCollections}
          emptyLabel="No wishlist activity yet."
          unit="saves"
        />
        <TopListCard
          title="Most Popular Collections"
          entries={mostPopularCollections}
          emptyLabel="No pre-orders yet."
          unit="ordered"
        />
        <TopListCard
          title="Products Waiting For Price"
          entries={productsWaitingForPrice}
          emptyLabel="Every product has a price set."
          unit="saves"
        />
        <TopListCard
          title="High Interest Products"
          entries={highInterestProducts}
          emptyLabel="Nothing stands out yet — wishlist and order activity are roughly in line."
          unit="saves"
        />
      </div>

      <div className="rounded-card bg-white p-5 shadow-sm shadow-ink/5">
        <h2 className="mb-3 font-display font-bold">Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-ink-soft">Nothing yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {recentActivity.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 py-2.5">
                <span aria-hidden className="text-lg">
                  {ACTIVITY_ICON[entry.type] ?? "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{entry.message}</p>
                  <p className="text-xs text-ink-soft">
                    {entry.createdAt.toLocaleString("en-AU", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
