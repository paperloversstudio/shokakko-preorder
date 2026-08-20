import "server-only";
import { db } from "@/lib/db";
import { buildCollectionUrl, buildProductUrl } from "../site-url";
import type { ProductCardData } from "../components/ProductCard";
import type { CollectionCardData } from "../components/CollectionCard";

export type ProductRow = {
  id: string;
  name: string;
  brand: string;
  priceCents: number | null;
  status: string;
  images: { url: string }[];
};

/** Shared by generic.ts (resolving `product_cards` sections, any source)
 * and the candidate-computation functions below. */
export async function toProductCardData(
  product: ProductRow,
  previousPriceCents?: number | null,
): Promise<ProductCardData> {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    imageUrl: product.images[0]?.url ?? null,
    priceCents: product.priceCents,
    previousPriceCents: previousPriceCents ?? undefined,
    status: product.status as ProductCardData["status"],
    href: await buildProductUrl(product.id),
  };
}

/** Shared by generic.ts (resolving `collection_cards` sections). */
export async function toCollectionCardData(tag: {
  id: string;
  name: string;
  imageUrl: string | null;
}): Promise<CollectionCardData> {
  return {
    id: tag.id,
    name: tag.name,
    imageUrl: tag.imageUrl,
    href: await buildCollectionUrl(tag.id),
  };
}

export const productSelect = {
  id: true,
  name: true,
  brand: true,
  priceCents: true,
  status: true,
  images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
};

/** Live "New Products" candidates — Product.isNew, active only. Used both
 * by the Notification Centre's live preview and by Generate Email itself
 * to decide what to snapshot into EmailDigestItem. Also what a
 * `product_cards{source:"new_products"}` section resolves to. */
export async function computeNewProductCandidates(): Promise<ProductCardData[]> {
  const products = await db.product.findMany({
    where: { isNew: true, status: "active" },
    orderBy: { sortOrder: "asc" },
    select: productSelect,
  });
  return Promise.all(products.map((p) => toProductCardData(p)));
}

/** Live "Price Updates" candidates — active products whose current price
 * differs from their `lastNotifiedPriceCents` baseline. Products with no
 * baseline yet (null — pre-Sprint-3, or never edited since creation) are
 * excluded: no prior value means nothing to compare against. Prisma can't
 * compare two columns of the same row in a `where` filter, so the diff is
 * done in application code — fine at this catalogue's scale (100–200
 * products). */
export async function computePriceUpdateCandidates(): Promise<
  { product: ProductCardData; previousPriceCents: number }[]
> {
  const products = await db.product.findMany({
    where: { status: "active", lastNotifiedPriceCents: { not: null } },
    orderBy: { sortOrder: "asc" },
    select: { ...productSelect, lastNotifiedPriceCents: true },
  });
  const changed = products.filter((p) => p.priceCents !== p.lastNotifiedPriceCents);
  return Promise.all(
    changed.map(async (p) => ({
      product: await toProductCardData(p, p.lastNotifiedPriceCents),
      previousPriceCents: p.lastNotifiedPriceCents as number,
    })),
  );
}

/** Sprint 6 — live "Sold Out" candidates, same checkpoint pattern as Price
 * Updates: sold-out products not yet flagged as notified via
 * `lastNotifiedStatus`. Used by both the Notification Centre's live
 * preview and Generate Email's snapshot step.
 *
 * `lastNotifiedStatus: { not: "sold_out" }` alone would silently exclude
 * every never-notified product (SQL's `column != X` never matches a NULL
 * column, and most products start with `lastNotifiedStatus: null`) — the
 * explicit OR below covers both "never notified" and "notified, but for
 * a status other than sold_out" (a product can only ever advance this
 * field to "sold_out" itself, but being explicit here avoids relying on
 * that invariant holding forever). */
export async function computeSoldOutCandidates(): Promise<ProductCardData[]> {
  const products = await db.product.findMany({
    where: {
      status: "sold_out",
      OR: [{ lastNotifiedStatus: null }, { lastNotifiedStatus: { not: "sold_out" } }],
    },
    orderBy: { sortOrder: "asc" },
    select: productSelect,
  });
  return Promise.all(products.map((p) => toProductCardData(p)));
}
