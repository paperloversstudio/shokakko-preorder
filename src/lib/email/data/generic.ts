import "server-only";
import { db } from "@/lib/db";
import type { FooterLinks } from "../components/Footer";
import type { ProductCardData } from "../components/ProductCard";
import type { CollectionCardData } from "../components/CollectionCard";
import {
  computeNewProductCandidates,
  computePriceUpdateCandidates,
  computeSoldOutCandidates,
  toProductCardData,
  toCollectionCardData,
  productSelect,
} from "./update";
import {
  type EmailKind,
  type EmailSectionType,
  EDIT_URL_PLACEHOLDER,
  heroBannerSectionDataSchema,
  richTextSectionDataSchema,
  imageSectionDataSchema,
  collectionCardsSectionDataSchema,
  productCardsSectionDataSchema,
  ctaButtonSectionDataSchema,
} from "@/lib/validations/email-template";

export type OrderItemLine = {
  name: string;
  brand: string;
  quantity: number;
  unitPriceCents: number | null;
  variantName: string | null;
  variantGroupName: string | null;
};

export type OrderContext = {
  orderNumber: string;
  items: OrderItemLine[];
  totalCents: number;
  hasUnknownPrice: boolean;
};

/**
 * Everything a kind-specific data builder (confirmation.ts, edit-link.ts,
 * reminder.ts, or the digest's send loop) already knows about *who* it's
 * rendering for — resolveTemplateSections() turns the admin-authored
 * template structure into concrete section props using this context, but
 * never fetches "which order/recipient" itself. That stays each kind's
 * own job, same business-logic/presentation split as before.
 */
export type EmailRenderContext = {
  firstName: string;
  logoUrl: string | null;
  eventName: string | null;
  footerLinks: FooterLinks;
  editUrl: string | null;
  order?: OrderContext;
  countdownRemainingMs?: number | null;
  // Newsletter personalization (§2.22.3) — a recipient who's opted out of
  // e.g. "new_products" still sees every other section the admin
  // enabled; this is how sendDigest() expresses that per-recipient
  // filter without needing to inspect already-resolved output.
  excludeProductSources?: string[];
};

export type ResolvedSection =
  | { type: "hero_banner"; imageUrl: string | null; linkUrl: string | null }
  | { type: "greeting" }
  | { type: "rich_text"; html: string }
  | { type: "image"; url: string; linkUrl: string | null; caption?: string }
  | { type: "collection_cards"; collections: CollectionCardData[] }
  | { type: "product_cards_grid"; heading: string; products: ProductCardData[] }
  | { type: "product_cards_order"; order: OrderContext }
  | { type: "cta_button"; text: string; url: string }
  | { type: "footer" }
  | { type: "countdown"; remainingMs: number | null };

const PRODUCT_CARDS_HEADINGS: Record<string, string> = {
  manual: "✨ Karen's Picks",
  new_products: "🆕 New Products",
  price_updates: "💸 Price Updates",
  sold_out: "🔴 Sold Out",
};

async function resolveProductCardsSection(
  data: { source: string; productIds: string[] },
  ctx: EmailRenderContext,
): Promise<ResolvedSection | null> {
  if (data.source === "order_items") {
    // No order context (e.g. the Newsletter, or a kind where this
    // section was toggled on but nothing to show) — nothing to render.
    return ctx.order ? { type: "product_cards_order", order: ctx.order } : null;
  }

  const heading = PRODUCT_CARDS_HEADINGS[data.source] ?? "Products";
  let products: ProductCardData[];

  if (data.source === "new_products") {
    products = await computeNewProductCandidates();
  } else if (data.source === "price_updates") {
    products = (await computePriceUpdateCandidates()).map((p) => p.product);
  } else if (data.source === "sold_out") {
    products = await computeSoldOutCandidates();
  } else {
    // "manual"
    if (data.productIds.length === 0) return null;
    const rows = await db.product.findMany({
      where: { id: { in: data.productIds } },
      select: productSelect,
    });
    products = await Promise.all(rows.map((p) => toProductCardData(p)));
  }

  return products.length > 0 ? { type: "product_cards_grid", heading, products } : null;
}

/**
 * The shared core every kind's data builder ends with — loads the
 * admin-authored EmailTemplate for `kind`, filters to shown sections, and
 * turns each one into a concrete, render-ready ResolvedSection using
 * whatever `ctx` the caller already fetched. Never returns JSX; never
 * fetches "which order" itself — that's each kind's own builder's job.
 */
export async function resolveTemplateSections(
  kind: EmailKind,
  ctx: EmailRenderContext,
): Promise<{ subject: string; sections: ResolvedSection[] }> {
  const template = await db.emailTemplate.findUnique({
    where: { kind },
    include: { sections: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) return { subject: "Shokakko Australia", sections: [] };

  const resolved: ResolvedSection[] = [];

  for (const section of template.sections) {
    if (!section.show) continue;
    const type = section.type as EmailSectionType;

    switch (type) {
      case "hero_banner": {
        const data = heroBannerSectionDataSchema.parse(section.data);
        if (data.imageUrl) resolved.push({ type: "hero_banner", imageUrl: data.imageUrl, linkUrl: data.linkUrl });
        break;
      }
      case "greeting":
        resolved.push({ type: "greeting" });
        break;
      case "rich_text": {
        const data = richTextSectionDataSchema.parse(section.data);
        if (data.html && data.html !== "<p></p>") resolved.push({ type: "rich_text", html: data.html });
        break;
      }
      case "image": {
        const data = imageSectionDataSchema.parse(section.data);
        if (data.url) resolved.push({ type: "image", url: data.url, linkUrl: data.linkUrl, caption: data.caption });
        break;
      }
      case "collection_cards": {
        const data = collectionCardsSectionDataSchema.parse(section.data);
        if (data.collectionIds.length === 0) break;
        const tags = await db.tag.findMany({ where: { id: { in: data.collectionIds } } });
        const collections = await Promise.all(tags.map(toCollectionCardData));
        if (collections.length > 0) resolved.push({ type: "collection_cards", collections });
        break;
      }
      case "product_cards": {
        const data = productCardsSectionDataSchema.parse(section.data);
        if (ctx.excludeProductSources?.includes(data.source)) break;
        const result = await resolveProductCardsSection(data, ctx);
        if (result) resolved.push(result);
        break;
      }
      case "cta_button": {
        const data = ctaButtonSectionDataSchema.parse(section.data);
        const url = data.url === EDIT_URL_PLACEHOLDER ? (ctx.editUrl ?? "/") : data.url;
        resolved.push({ type: "cta_button", text: data.text, url });
        break;
      }
      case "footer":
        resolved.push({ type: "footer" });
        break;
      case "countdown":
        resolved.push({ type: "countdown", remainingMs: ctx.countdownRemainingMs ?? null });
        break;
    }
  }

  return { subject: template.subject, sections: resolved };
}

export type GenericEmailData = {
  subject: string;
  firstName: string;
  logoUrl: string | null;
  eventName: string | null;
  footerLinks: FooterLinks;
  sections: ResolvedSection[];
};
