import { db } from "@/lib/db";
import type { PurchaseStatus } from "@/lib/validations/purchase";
import { PurchaseBuyingList, type BuyingListRow } from "./PurchaseBuyingList";

/** Sprint 3.5 — helps Karen buy efficiently during the exhibition.
 * Buying List scope (confirmed): every distinct product/variant that
 * appears in at least one submitted pre-order — not the whole catalogue
 * — since "Requested Quantity"/"Number of Customers" only mean anything
 * for items customers actually asked for. */
export default async function PurchaseDashboardPage() {
  const [
    totalProducts,
    productsWithoutPrice,
    draftProducts,
    soldOutProducts,
    totalWishlistItems,
    totalPreOrders,
    itemSum,
    grouped,
  ] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { priceCents: null } }),
    db.product.count({ where: { status: "draft" } }),
    db.product.count({ where: { status: "sold_out" } }),
    db.wishlistItem.count(),
    db.preOrder.count(),
    db.orderItem.aggregate({ _sum: { quantity: true } }),
    // Every OrderItem row a given PreOrder contributes to a
    // (productId, variantId) pair is capped at 1 (the cart only ever
    // holds one quantity per product+variant combo per checkout), so
    // this group's row count doubles as "distinct customers" with no
    // second query needed.
    db.orderItem.groupBy({
      by: ["productId", "variantId"],
      where: { productId: { not: null } },
      _sum: { quantity: true },
      _count: { _all: true },
    }),
  ]);

  const averageOrderSize =
    totalPreOrders > 0
      ? Math.round(((itemSum._sum.quantity ?? 0) / totalPreOrders) * 10) / 10
      : 0;

  const productIds = Array.from(
    new Set(grouped.map((g) => g.productId).filter((id): id is string => id !== null)),
  );
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    include: {
      tags: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: true,
    },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const rows: BuyingListRow[] = grouped
    .map((g): BuyingListRow | null => {
      if (!g.productId) return null;
      const product = productMap.get(g.productId);
      if (!product) return null; // deleted since the order was placed
      const variant = g.variantId ? product.variants.find((v) => v.id === g.variantId) : null;
      return {
        productId: product.id,
        variantId: variant?.id ?? null,
        productName: product.name,
        variantName: variant?.name ?? null,
        variantGroupName: variant ? product.variantGroupName : null,
        brand: product.brand,
        type: product.type,
        status: product.status as "active" | "draft" | "sold_out",
        collections: product.tags.map((t) => t.name),
        imageUrl: variant?.imageUrl ?? product.images[0]?.url ?? null,
        requestedQuantity: g._sum.quantity ?? 0,
        customerCount: g._count._all,
        purchaseStatus: (variant?.purchaseStatus ?? product.purchaseStatus) as PurchaseStatus,
      };
    })
    .filter((row): row is BuyingListRow => row !== null);

  const purchasedCount = rows.filter((r) => r.purchaseStatus === "purchased").length;
  const totalRows = rows.length;
  const progressPct = totalRows > 0 ? Math.round((purchasedCount / totalRows) * 100) : 0;

  const summaryTiles: { label: string; value: string | number; tone: string }[] = [
    { label: "Total Products", value: totalProducts, tone: "bg-blue/15" },
    { label: "Products Without Price", value: productsWithoutPrice, tone: "bg-coral/15" },
    { label: "Draft Products", value: draftProducts, tone: "bg-lavender/30" },
    { label: "Sold Out Products", value: soldOutProducts, tone: "bg-ink/5" },
    { label: "Total Wishlist Items", value: totalWishlistItems, tone: "bg-coral/15" },
    { label: "Total Pre-orders", value: totalPreOrders, tone: "bg-blue/15" },
    { label: "Average Order Size", value: averageOrderSize, tone: "bg-mint" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold print:hidden">Purchase Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:hidden">
        {summaryTiles.map((tile) => (
          <div key={tile.label} className={`rounded-card p-4 shadow-sm shadow-ink/5 ${tile.tone}`}>
            <p className="text-xs font-semibold text-ink-soft">{tile.label}</p>
            <p className="font-display text-2xl font-extrabold">{tile.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-card bg-white p-5 shadow-sm shadow-ink/5 print:hidden">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold">Purchase Progress</h2>
          <span className="font-display text-lg font-extrabold text-blue">{progressPct}%</span>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-pill bg-mint">
          <div
            className="h-full rounded-pill bg-blue transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
          <span className="text-ink-soft">
            <span className="font-semibold text-ink">Purchased</span> {purchasedCount} /{" "}
            {totalRows} Products
          </span>
          <span className="text-ink-soft">
            <span className="font-semibold text-ink">Remaining</span> {totalRows - purchasedCount}{" "}
            Products
          </span>
        </div>
      </div>

      {totalRows === 0 ? (
        <p className="rounded-card bg-white p-8 text-center text-ink-soft shadow-sm shadow-ink/5">
          Nothing to buy yet — the list fills in once customers submit pre-orders.
        </p>
      ) : (
        <PurchaseBuyingList rows={rows} />
      )}
    </div>
  );
}
