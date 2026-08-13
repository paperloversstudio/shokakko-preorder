import "server-only";
import { db } from "@/lib/db";
import { buildCollectionUrl, buildFooterLinks, buildProductUrl } from "../site-url";
import type { ProductCardData } from "../components/ProductCard";
import type { CollectionCardData } from "../components/CollectionCard";
import type { FooterLinks } from "../components/Footer";

type ProductRow = {
  id: string;
  name: string;
  brand: string;
  priceCents: number | null;
  status: string;
  images: { url: string }[];
};

async function toProductCardData(
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

async function toCollectionCardData(tag: { id: string; name: string; imageUrl: string | null }): Promise<CollectionCardData> {
  return {
    id: tag.id,
    name: tag.name,
    imageUrl: tag.imageUrl,
    href: await buildCollectionUrl(tag.id),
  };
}

const productSelect = {
  id: true,
  name: true,
  brand: true,
  priceCents: true,
  status: true,
  images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
};

/** Live "New Products" candidates — Product.isNew, active only. Used both
 * by the Notification Centre's live preview (before Generate Email) and by
 * Generate Email itself to decide what to snapshot into EmailDigestItem. */
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

export type UpdateEmailData = {
  subject: string;
  firstName: string;
  logoUrl: string | null;
  eventName: string | null;
  heroImageUrl: string | null;
  heroLinkUrl: string | null;
  karenNotesHtml: string | null;
  showKarenNotes: boolean;
  collections: CollectionCardData[];
  showCollections: boolean;
  recommendedProducts: ProductCardData[];
  showRecommended: boolean;
  newProducts: ProductCardData[];
  showNewProducts: boolean;
  priceUpdateProducts: ProductCardData[];
  showPriceUpdates: boolean;
  ctaText: string;
  ctaUrl: string;
  footerLinks: FooterLinks;
};

type DigestRow = {
  subject: string;
  karenNotesHtml: string | null;
  showKarenNotes: boolean;
  showCollections: boolean;
  showRecommended: boolean;
  showNewProducts: boolean;
  showPriceUpdates: boolean;
  ctaText: string;
  ctaUrl: string;
  collections: { id: string; name: string; imageUrl: string | null }[];
  recommendedProducts: ProductRow[];
};

/**
 * Pure data-layer builder for <UpdateEmail>. `newProducts`/
 * `priceUpdateProducts` are passed in already-resolved rather than queried
 * here, because the *right* source differs by caller: the Notification
 * Centre's live preview and "Generate Email" (deciding what to snapshot)
 * both use `computeNewProductCandidates`/`computePriceUpdateCandidates`
 * (live product state); re-rendering a past, already-generated digest
 * (`/admin/emails/history/[id]`) instead maps its saved `EmailDigestItem`
 * snapshot rows into the same shape — the product's price may have moved
 * on again since, and history should show what was true *then*.
 *
 * `firstName` defaults to a generic placeholder — the saved `renderedHtml`
 * is one representative preview render, not what each recipient actually
 * gets; real per-recipient rendering happens at send time (Sprint 4).
 */
export async function buildUpdateEmailData(
  digest: DigestRow,
  newProducts: ProductCardData[],
  priceUpdateProducts: ProductCardData[],
  firstName = "there",
): Promise<UpdateEmailData> {
  const settings = await db.siteSettings.findUnique({ where: { id: "singleton" } });

  return {
    subject: digest.subject,
    firstName,
    logoUrl: settings?.logoUrl ?? null,
    eventName: settings?.eventName ?? null,
    heroImageUrl: settings?.emailHeroImageUrl ?? null,
    heroLinkUrl: settings?.emailHeroLinkUrl ?? null,
    karenNotesHtml: digest.karenNotesHtml,
    showKarenNotes: digest.showKarenNotes,
    collections: await Promise.all(digest.collections.map(toCollectionCardData)),
    showCollections: digest.showCollections,
    recommendedProducts: await Promise.all(digest.recommendedProducts.map((p) => toProductCardData(p))),
    showRecommended: digest.showRecommended,
    newProducts,
    showNewProducts: digest.showNewProducts,
    priceUpdateProducts,
    showPriceUpdates: digest.showPriceUpdates,
    ctaText: digest.ctaText,
    ctaUrl: digest.ctaUrl,
    // Not tied to any one recipient (a digest goes to many customers), so
    // there's no single editToken to build a per-customer unsubscribe link
    // from here — Sprint 4's real per-recipient send loop builds one per
    // customer the same way confirmation.ts/reminder.ts do.
    footerLinks: await buildFooterLinks(settings, null),
  };
}
