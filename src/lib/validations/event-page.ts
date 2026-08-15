import { z } from "zod";

/** Section block types this sprint supports — an open set (see the
 * `type: String` comment on PageSection in prisma/schema.prisma). A
 * future type (Video, FAQ Accordion, Countdown Timer, Google Map,
 * embedded Instagram/YouTube, Product Carousel — all named "future
 * compatibility only" in the Sprint 4 brief) is just one more entry here
 * plus a new data schema below, no migration. */
export const SECTION_TYPES = ["text", "image", "gallery", "button", "divider"] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  text: "Text",
  image: "Image",
  gallery: "Gallery",
  button: "Button",
  divider: "Divider",
};

export const SECTION_TYPE_DESCRIPTIONS: Record<SectionType, string> = {
  text: "Title + rich text (headings, lists, tables, links, colours, and more).",
  image: "One photo with an optional caption.",
  gallery: "Any number of photos in a responsive grid.",
  button: "A call-to-action button linking anywhere.",
  divider: "A plain visual line between sections.",
};

/** Every existing top-level route segment under src/app/ — a new
 * EventPage's slug must avoid these, or it would only ever be reachable
 * by re-clicking the real route sitting in front of it (Next always
 * resolves a static segment before the [slug] catch-all at the same
 * level, so there's no actual collision risk, but a page an admin can
 * never reach is still a confusing dead end worth blocking up front). */
export const RESERVED_SLUGS = [
  "admin",
  "api",
  "checkout",
  "collections",
  "my-preorders",
  "order",
  "product",
  "unsubscribe",
] as const;

/** The two pages seeded for this sprint — linked directly from the
 * homepage nav pills and the site footer at these exact URLs. Their slug
 * can't be changed and the page can't be deleted (see event-pages/actions.ts)
 * so those hardcoded links never silently 404. */
export const PROTECTED_SLUGS = ["how-to-preorder", "about-event"] as const;

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(80)
  .regex(slugPattern, "Use lowercase letters, numbers, and hyphens only, e.g. how-to-preorder")
  .refine(
    (v) => !(RESERVED_SLUGS as readonly string[]).includes(v),
    "This slug is already used by an existing page on the site — pick a different slug.",
  );

export const eventPageFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: slugSchema,
});

export type EventPageFormValues = z.infer<typeof eventPageFormSchema>;

// --- Per-section-type `data` shapes -----------------------------------
// Each mirrors the plain-object shape actually stored in PageSection.data
// (a Prisma Json column — Prisma Client parses/serializes it for us, no
// manual JSON.parse/stringify at the read/write sites).

export const textSectionDataSchema = z.object({
  title: z.string().trim().max(200).optional(),
  // Produced by EventSectionRichTextEditor.tsx — Tiptap's own schema is
  // the real gate on what HTML can appear here (see that component's doc
  // comment), same "editor's registered schema is the sanitizer" reasoning
  // as PreorderInfoEditor.tsx.
  html: z.string(),
});
export type TextSectionData = z.infer<typeof textSectionDataSchema>;

export const imageSectionDataSchema = z.object({
  url: z.string().min(1),
  caption: z.string().trim().max(300).optional(),
});
export type ImageSectionData = z.infer<typeof imageSectionDataSchema>;

export const gallerySectionDataSchema = z.object({
  images: z.array(
    z.object({
      url: z.string().min(1),
      caption: z.string().trim().max(300).optional(),
    }),
  ),
});
export type GallerySectionData = z.infer<typeof gallerySectionDataSchema>;

export const buttonSectionDataSchema = z.object({
  text: z.string().trim().min(1, "Button text is required").max(80),
  url: z.string().trim().min(1, "Button URL is required").max(500),
  openInNewTab: z.boolean().default(false),
});
export type ButtonSectionData = z.infer<typeof buttonSectionDataSchema>;

// A divider carries no configurable fields — the schema exists so every
// section type has one, keeping call sites uniform (never a special-cased
// "no schema for this type" branch).
export const dividerSectionDataSchema = z.object({});
export type DividerSectionData = z.infer<typeof dividerSectionDataSchema>;

/** Sensible empty defaults for a freshly-added section of each type —
 * used by `addSection` so a new row is always immediately valid data,
 * never `null`/`undefined`. */
export function defaultSectionData(type: SectionType): Record<string, unknown> {
  switch (type) {
    case "text":
      return { html: "" };
    case "image":
      return { url: "" };
    case "gallery":
      return { images: [] };
    case "button":
      return { text: "", url: "", openInNewTab: false };
    case "divider":
      return {};
  }
}
