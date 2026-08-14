import { z } from "zod";

/** One row of a product's variant group (Sprint 3.5) — mirrors
 * `productFormSchema`'s own price-field pattern (dollars string in the
 * form, `dollarsToCents`/`centsToDollars` from `product.ts` convert). */
export const variantFormSchema = z.object({
  // present = existing row, null/absent = new. ProductVariantManager always
  // sends `null` (not undefined) for new rows, so this must accept both —
  // `.optional()` alone only allows undefined and silently failed every
  // new-row submission (caught in Sprint 3.5 verification).
  id: z.string().trim().nullable().optional(),
  name: z.string().trim().min(1, "Variant name is required").max(120),
  sku: z.string().trim().max(80).optional(),
  price: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^\d+(\.\d{1,2})?$/.test(v),
      "Enter a valid price, e.g. 12.50",
    ),
  removeImage: z.boolean().default(false),
  // Index into the form's `newVariantImages` file input — null/undefined
  // means this row's image (if any) is unchanged.
  newImageIndex: z.number().int().nonnegative().nullable().optional(),
});

export type VariantFormValues = z.infer<typeof variantFormSchema>;

/** The full `variantsJson` payload ProductVariantManager submits — an
 * array of the above, in final display order (sortOrder is just the
 * array index). */
export const variantsFormSchema = z.array(variantFormSchema);
