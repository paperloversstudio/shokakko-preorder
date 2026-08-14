import { z } from "zod";

// Plain strings (not a Prisma enum — see prisma/schema.prisma's comment on
// Product.status for why), matching PreOrder.status's existing pattern.
// "active" = visible + orderable, "sold_out" = visible but not orderable,
// "draft" = hidden from the customer site entirely.
export const PRODUCT_STATUSES = ["active", "draft", "sold_out"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const productFormSchema = z.object({
  brand: z.string().trim().min(1, "Brand is required").max(120),
  name: z.string().trim().min(1, "Product name is required").max(200),
  sku: z.string().trim().min(1, "SKU is required").max(80),
  description: z.string().trim().max(2000).optional(),
  estimatedArrival: z.string().trim().max(120).optional(),
  // Left blank => "Price Coming Soon". Entered as dollars in the form, stored as cents.
  price: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^\d+(\.\d{1,2})?$/.test(v),
      "Enter a valid price, e.g. 12.50",
    ),
  type: z.string().trim().max(120).optional(),
  tags: z.string().trim().max(300).optional(), // comma-separated
  status: z.enum(PRODUCT_STATUSES).default("active"),
  sortOrder: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^-?\d+$/.test(v), "Sort order must be a whole number"),
  // Manual "New Products" toggle for the Update Email's New Products
  // section (Sprint 3) — a plain checkbox, so its form value is the
  // presence of "on", same pattern as ProductForm's other checkboxes.
  isNew: z.boolean().default(false),
  // Sprint 3.5 — one optional variant group (e.g. "Design"). Free text,
  // same pattern as `type`/`brand`. Empty/blank means "no variants" —
  // see ProductVariantManager.tsx, which only shows the variant rows
  // editor once this has a value.
  variantGroupName: z.string().trim().max(120).optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export function dollarsToCents(value: string | undefined): number | null {
  if (!value) return null;
  return Math.round(parseFloat(value) * 100);
}

export function centsToDollars(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2);
}

export function formatPrice(cents: number | null | undefined, currency = "AUD"): string {
  if (cents === null || cents === undefined) return "Price Coming Soon";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function parseTags(value: string | undefined): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );
}
