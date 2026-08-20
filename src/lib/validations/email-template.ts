import { z } from "zod";

/** The 4 email kinds — one `EmailTemplate` row each, `@unique` on `kind`.
 * `EMAIL_KIND_LABELS` is the admin/customer-facing name for each. */
export const EMAIL_KINDS = ["confirmation", "edit_link", "reminder", "digest"] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

export const EMAIL_KIND_LABELS: Record<EmailKind, string> = {
  confirmation: "Confirmation Email",
  edit_link: "Retrieve My Pre-order",
  reminder: "Reminder Email",
  digest: "Newsletter",
};

export const EMAIL_KIND_DESCRIPTIONS: Record<EmailKind, string> = {
  confirmation: "Sent automatically when a customer submits a pre-order.",
  edit_link: "Sent when a customer requests their secure edit link from My Pre-order.",
  reminder: "Sent automatically 24 hours before the event countdown closes.",
  digest: "Sent manually from the Notification Centre — New Products, Price Updates, Karen's Notes, and more.",
};

/** Section block types every template can be built from — an open set
 * (see the `type: String` comment on EmailTemplateSection in
 * prisma/schema.prisma). A future type is just one more entry here plus
 * a new data schema below, no migration — same reasoning as Sprint 4's
 * PageSection/SECTION_TYPES. `Header` is deliberately not here — every
 * email always shows it, it's not admin-toggleable. */
export const EMAIL_SECTION_TYPES = [
  "hero_banner",
  "greeting",
  "rich_text",
  "image",
  "collection_cards",
  "product_cards",
  "cta_button",
  "footer",
  "countdown",
] as const;
export type EmailSectionType = (typeof EMAIL_SECTION_TYPES)[number];

export const EMAIL_SECTION_TYPE_LABELS: Record<EmailSectionType, string> = {
  hero_banner: "Hero Banner",
  greeting: "Greeting",
  rich_text: "Rich Text",
  image: "Image",
  collection_cards: "Collection Cards",
  product_cards: "Product Cards",
  cta_button: "CTA Button",
  footer: "Footer",
  countdown: "Countdown",
};

export const EMAIL_SECTION_TYPE_DESCRIPTIONS: Record<EmailSectionType, string> = {
  hero_banner: "One full-width banner image, optionally linked.",
  greeting: "\"Hi {first name},\" — always uses the recipient's real name.",
  rich_text: "Free-form written content (headings, lists, links).",
  image: "One standalone photo with an optional caption and link.",
  collection_cards: "A grid of picked collections.",
  product_cards: "A grid or list of products — pick the source below.",
  cta_button: "One button linking anywhere.",
  footer: "Contact/shipping/website/Instagram links + unsubscribe.",
  countdown: "Time remaining until the event countdown closes.",
};

// --- Per-section-type `data` shapes -----------------------------------
// Each mirrors the plain-object shape stored in EmailTemplateSection.data
// (a Prisma Json column — parsed/serialized automatically, no manual
// JSON.parse/stringify at read/write sites).

export const heroBannerSectionDataSchema = z.object({
  imageUrl: z.string().nullable().default(null),
  linkUrl: z.string().nullable().default(null),
});
export type HeroBannerSectionData = z.infer<typeof heroBannerSectionDataSchema>;

export const greetingSectionDataSchema = z.object({});
export type GreetingSectionData = z.infer<typeof greetingSectionDataSchema>;

export const richTextSectionDataSchema = z.object({
  // Produced by the existing Tiptap rich text editor — that editor's own
  // registered schema is the real gate on what HTML can appear here, same
  // "editor's schema is the sanitizer" reasoning as PreorderInfoEditor.tsx.
  html: z.string().nullable().default(null),
});
export type RichTextSectionData = z.infer<typeof richTextSectionDataSchema>;

export const imageSectionDataSchema = z.object({
  url: z.string().nullable().default(null),
  linkUrl: z.string().nullable().default(null),
  caption: z.string().trim().max(300).optional(),
});
export type ImageSectionData = z.infer<typeof imageSectionDataSchema>;

export const collectionCardsSectionDataSchema = z.object({
  collectionIds: z.array(z.string()).default([]),
});
export type CollectionCardsSectionData = z.infer<typeof collectionCardsSectionDataSchema>;

/** `source` is the fork between "marketing content" (admin-picked or
 * auto-computed, rendered as a browsable product grid) and
 * `"order_items"` (this recipient's own order line items, rendered as a
 * receipt-style list with variant options — meaningful only for
 * Confirmation/Retrieve/Reminder, harmless if picked elsewhere). */
export const PRODUCT_CARDS_SOURCES = [
  "manual",
  "new_products",
  "price_updates",
  "sold_out",
  "order_items",
] as const;
export type ProductCardsSource = (typeof PRODUCT_CARDS_SOURCES)[number];

export const PRODUCT_CARDS_SOURCE_LABELS: Record<ProductCardsSource, string> = {
  manual: "Karen's Picks (choose products)",
  new_products: "New Products (automatic)",
  price_updates: "Price Updates (automatic)",
  sold_out: "Sold Out (automatic)",
  order_items: "This order's items (automatic)",
};

export const productCardsSectionDataSchema = z.object({
  source: z.enum(PRODUCT_CARDS_SOURCES).default("manual"),
  productIds: z.array(z.string()).default([]),
});
export type ProductCardsSectionData = z.infer<typeof productCardsSectionDataSchema>;

/** A CTA Button's `url` may be this literal placeholder instead of a real
 * URL — resolved at render time (src/lib/email/data/generic.ts) to the
 * recipient's own /edit/{token} link. Lets Confirmation/Retrieve/
 * Reminder's buttons stay per-recipient without a special-cased field;
 * the Newsletter (no single recipient) just uses a real URL instead. */
export const EDIT_URL_PLACEHOLDER = "{{edit_url}}";

export const ctaButtonSectionDataSchema = z.object({
  text: z.string().trim().min(1, "Button text is required").max(80),
  url: z.string().trim().min(1, "Button URL is required").max(500),
});
export type CTAButtonSectionData = z.infer<typeof ctaButtonSectionDataSchema>;

export const footerSectionDataSchema = z.object({});
export type FooterSectionData = z.infer<typeof footerSectionDataSchema>;

export const countdownSectionDataSchema = z.object({});
export type CountdownSectionData = z.infer<typeof countdownSectionDataSchema>;

/** Sensible empty defaults for a freshly-added section of each type —
 * used by `addSection` so a new row is always immediately valid data,
 * never `null`/`undefined`. */
export function defaultSectionData(type: EmailSectionType): Record<string, unknown> {
  switch (type) {
    case "hero_banner":
      return { imageUrl: null, linkUrl: null };
    case "greeting":
      return {};
    case "rich_text":
      return { html: null };
    case "image":
      return { url: null, linkUrl: null };
    case "collection_cards":
      return { collectionIds: [] };
    case "product_cards":
      return { source: "manual", productIds: [] };
    case "cta_button":
      return { text: "", url: "" };
    case "footer":
      return {};
    case "countdown":
      return {};
  }
}
