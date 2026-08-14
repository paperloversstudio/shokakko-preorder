"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage, InvalidImageError } from "@/lib/storage";
import {
  productFormSchema,
  dollarsToCents,
  formatPrice,
  parseTags,
} from "@/lib/validations/product";
import { variantsFormSchema, type VariantFormValues } from "@/lib/validations/variant";
import { flattenZodError } from "@/lib/validations/utils";

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function isSkuConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    Array.isArray(err.meta?.target) &&
    (err.meta!.target as string[]).includes("sku")
  );
}

function parseProductForm(formData: FormData) {
  return productFormSchema.safeParse({
    brand: formData.get("brand")?.toString() ?? "",
    name: formData.get("name")?.toString() ?? "",
    sku: formData.get("sku")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    estimatedArrival: formData.get("estimatedArrival")?.toString() ?? "",
    price: formData.get("price")?.toString() ?? "",
    type: formData.get("type")?.toString() ?? "",
    tags: formData.get("tags")?.toString() ?? "",
    status: formData.get("status")?.toString() ?? "active",
    sortOrder: formData.get("sortOrder")?.toString() ?? "",
    isNew: formData.get("isNew") === "on",
    variantGroupName: formData.get("variantGroupName")?.toString() ?? "",
  });
}

/** Parses ProductVariantManager's `variantsJson` hidden field. Invalid/
 * malformed JSON (shouldn't happen from the real form) just yields no
 * rows rather than failing the whole product save. */
function parseVariantRows(raw: string | null): VariantFormValues[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const result = variantsFormSchema.safeParse(parsed);
  return result.success ? result.data.filter((row) => row.name.trim()) : [];
}

/** A blank group name means "no variants" regardless of what's in
 * `variantsJson` — ProductVariantManager only shows/edits rows once a
 * group name is typed, but doesn't clear its own state if the admin
 * types one in and then deletes it again, so the server is the one
 * source of truth for this rule. */
function resolveVariantGroupName(formData: FormData): string | null {
  const raw = formData.get("variantGroupName")?.toString().trim() ?? "";
  return raw || null;
}

/** Checks the submitted variant SKUs for duplicates within the same
 * submission and conflicts against other products'/variants' SKUs —
 * done as an explicit pre-check (not by parsing Prisma's P2002 `target`)
 * since Product.sku and ProductVariant.sku share the same column name,
 * making a P2002-based conflict message ambiguous about which one
 * collided. `excludeVariantIds` skips a variant's own existing row when
 * checking "is this SKU used by another variant." */
async function checkVariantSkuConflicts(
  rows: VariantFormValues[],
  excludeVariantIds: string[],
): Promise<string | null> {
  const skus = rows.map((r) => r.sku?.trim()).filter((s): s is string => Boolean(s));
  if (skus.length === 0) return null;

  const seen = new Set<string>();
  for (const sku of skus) {
    if (seen.has(sku)) return `Duplicate variant SKU "${sku}" — SKUs must be unique.`;
    seen.add(sku);
  }

  const existingVariant = await db.productVariant.findFirst({
    where: { sku: { in: skus }, id: { notIn: excludeVariantIds } },
  });
  if (existingVariant) {
    return `Variant SKU "${existingVariant.sku}" is already used by another variant.`;
  }
  const existingProduct = await db.product.findFirst({ where: { sku: { in: skus } } });
  if (existingProduct) {
    return `Variant SKU "${existingProduct.sku}" is already used by a product.`;
  }
  return null;
}

/** Upsert each tag by name and return their ids — cross-database safe
 * (Prisma's createMany `skipDuplicates` isn't supported on SQLite). */
async function resolveTagIds(tagNames: string[]): Promise<{ id: string }[]> {
  return Promise.all(
    tagNames.map((name) =>
      db.tag.upsert({
        where: { name },
        update: {},
        create: { name },
        select: { id: true },
      }),
    ),
  );
}

type ImageToken =
  | { kind: "existing"; id: string }
  | { kind: "new"; fileIndex: number };

function parseImageOrder(raw: string | null): ImageToken[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((t): t is string => typeof t === "string")
    .map((token): ImageToken | null => {
      if (token.startsWith("existing:")) {
        return { kind: "existing", id: token.slice("existing:".length) };
      }
      if (token.startsWith("new:")) {
        const fileIndex = Number(token.slice("new:".length));
        return Number.isInteger(fileIndex) ? { kind: "new", fileIndex } : null;
      }
      return null;
    })
    .filter((t): t is ImageToken => t !== null);
}

/** Resolves the ProductImageManager's `imageOrder` + `newImages` fields
 * into an ordered list of { url, sortOrder } ready for `images.create`,
 * uploading any new files as it goes. Does not touch existing rows —
 * callers are responsible for deleting ones no longer referenced. */
async function resolveImagesForCreate(
  formData: FormData,
): Promise<{ url: string; sortOrder: number }[]> {
  const order = parseImageOrder(formData.get("imageOrder")?.toString() ?? null);
  const newFiles = formData.getAll("newImages").filter((f): f is File => f instanceof File);

  const images: { url: string; sortOrder: number }[] = [];
  for (let i = 0; i < order.length; i++) {
    const token = order[i];
    if (token.kind !== "new") continue; // nothing "existing" yet on create
    const file = newFiles[token.fileIndex];
    if (!file || file.size === 0) continue;
    const url = await storage.save(file);
    images.push({ url, sortOrder: i });
  }
  return images;
}

/** Resolves ProductVariantManager's fields into rows ready for
 * `variants.create` — every row is "new" on product creation, so this
 * is simpler than the update-time diff below. Returns `[]` when the
 * group name is blank (no variants). */
async function resolveVariantsForCreate(formData: FormData): Promise<{
  name: string;
  sku: string | null;
  priceCentsOverride: number | null;
  imageUrl: string | null;
  sortOrder: number;
}[]> {
  if (!resolveVariantGroupName(formData)) return [];
  const rows = parseVariantRows(formData.get("variantsJson")?.toString() ?? null);
  const newFiles = formData
    .getAll("newVariantImages")
    .filter((f): f is File => f instanceof File);

  const variants = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let imageUrl: string | null = null;
    if (row.newImageIndex !== null && row.newImageIndex !== undefined) {
      const file = newFiles[row.newImageIndex];
      if (file && file.size > 0) imageUrl = await storage.save(file);
    }
    variants.push({
      name: row.name.trim(),
      sku: row.sku?.trim() || null,
      priceCentsOverride: dollarsToCents(row.price),
      imageUrl,
      sortOrder: i,
    });
  }
  return variants;
}

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { fieldErrors: flattenZodError(parsed.error) };
  }
  const values = parsed.data;

  let images: { url: string; sortOrder: number }[];
  try {
    images = await resolveImagesForCreate(formData);
  } catch (err) {
    if (err instanceof InvalidImageError) return { error: err.message };
    throw err;
  }

  const variantRows = parseVariantRows(formData.get("variantsJson")?.toString() ?? null);
  const variantSkuError = await checkVariantSkuConflicts(variantRows, []);
  if (variantSkuError) return { error: variantSkuError };

  let variants;
  try {
    variants = await resolveVariantsForCreate(formData);
  } catch (err) {
    if (err instanceof InvalidImageError) return { error: err.message };
    throw err;
  }

  const tagIds = await resolveTagIds(parseTags(values.tags));

  let productId: string;
  try {
    const product = await db.product.create({
      data: {
        brand: values.brand,
        name: values.name,
        sku: values.sku,
        description: values.description || null,
        estimatedArrival: values.estimatedArrival || null,
        priceCents: dollarsToCents(values.price),
        type: values.type || null,
        status: values.status,
        sortOrder: values.sortOrder ? parseInt(values.sortOrder, 10) : 0,
        isNew: values.isNew,
        // Seeds the Price Updates baseline to this product's starting
        // price, so its very first price edit is correctly detectable as
        // a change without needing a prior digest to have run — see
        // Product.lastNotifiedPriceCents' schema comment.
        lastNotifiedPriceCents: dollarsToCents(values.price),
        variantGroupName: resolveVariantGroupName(formData),
        tags: { connect: tagIds },
        images: { create: images },
        variants: { create: variants },
      },
      select: { id: true },
    });
    productId = product.id;
  } catch (err) {
    if (isSkuConflict(err)) {
      return { fieldErrors: { sku: "A product with this SKU already exists." } };
    }
    throw err;
  }

  // Best-effort Recent Activity entry (Sprint 3.5 Analytics Dashboard) —
  // never blocks the save itself.
  await db.activityLog
    .create({
      data: { type: "product_added", message: `${values.name} was added`, productId },
    })
    .catch(() => {});

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect(`/admin/products/${productId}`);
}

/** Diffs ProductVariantManager's submitted rows against the product's
 * existing `ProductVariant` rows — same shape as the image diff above
 * (existing rows kept/updated in place, ids not present get deleted,
 * rows with no id are created). A blank group name deletes every
 * existing variant (see resolveVariantGroupName's doc comment). Returns
 * the Prisma operations to run inside the caller's `$transaction`, plus
 * which existing images need best-effort cleanup afterward. */
async function resolveVariantsForUpdate(
  productId: string,
  formData: FormData,
  existingVariants: { id: string; imageUrl: string | null }[],
): Promise<{
  ops: Prisma.PrismaPromise<unknown>[];
  removedImageUrls: string[];
}> {
  const groupName = resolveVariantGroupName(formData);
  const rows = groupName
    ? parseVariantRows(formData.get("variantsJson")?.toString() ?? null)
    : [];
  const newFiles = formData
    .getAll("newVariantImages")
    .filter((f): f is File => f instanceof File);
  const existingById = new Map(existingVariants.map((v) => [v.id, v]));

  const keptIds = new Set(rows.filter((r) => r.id).map((r) => r.id as string));
  const removed = existingVariants.filter((v) => !keptIds.has(v.id));

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  const replacedImageUrls: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const existingRow = row.id ? existingById.get(row.id) : undefined;
    let imageUrl: string | null | undefined; // undefined = leave unchanged
    if (row.newImageIndex !== null && row.newImageIndex !== undefined) {
      const file = newFiles[row.newImageIndex];
      if (file && file.size > 0) {
        imageUrl = await storage.save(file);
        if (existingRow?.imageUrl) replacedImageUrls.push(existingRow.imageUrl);
      }
    } else if (row.removeImage) {
      imageUrl = null;
      if (existingRow?.imageUrl) replacedImageUrls.push(existingRow.imageUrl);
    }

    const data = {
      name: row.name.trim(),
      sku: row.sku?.trim() || null,
      priceCentsOverride: dollarsToCents(row.price),
      sortOrder: i,
      ...(imageUrl !== undefined ? { imageUrl } : {}),
    };

    if (existingRow) {
      ops.push(db.productVariant.update({ where: { id: existingRow.id }, data }));
    } else {
      ops.push(db.productVariant.create({ data: { ...data, productId } }));
    }
  }
  for (const variant of removed) {
    ops.push(db.productVariant.delete({ where: { id: variant.id } }));
  }

  return {
    ops,
    removedImageUrls: [
      ...replacedImageUrls,
      ...removed.map((v) => v.imageUrl).filter((u): u is string => Boolean(u)),
    ],
  };
}

export async function updateProduct(
  id: string,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { fieldErrors: flattenZodError(parsed.error) };
  }
  const values = parsed.data;

  const existing = await db.product.findUnique({
    where: { id },
    include: { images: true, variants: true },
  });
  if (!existing) return { error: "Product not found." };

  const variantSkuError = await checkVariantSkuConflicts(
    resolveVariantGroupName(formData)
      ? parseVariantRows(formData.get("variantsJson")?.toString() ?? null)
      : [],
    existing.variants.map((v) => v.id),
  );
  if (variantSkuError) return { error: variantSkuError };

  const order = parseImageOrder(formData.get("imageOrder")?.toString() ?? null);
  const newFiles = formData.getAll("newImages").filter((f): f is File => f instanceof File);
  const keptExistingIds = new Set(
    order.filter((t) => t.kind === "existing").map((t) => (t as { id: string }).id),
  );
  const removedImages = existing.images.filter((img) => !keptExistingIds.has(img.id));

  let uploadedUrls: string[];
  try {
    uploadedUrls = await Promise.all(
      newFiles.map((file) => (file.size > 0 ? storage.save(file) : Promise.resolve(null))),
    ).then((urls) => urls.filter((u): u is string => u !== null));
  } catch (err) {
    if (err instanceof InvalidImageError) return { error: err.message };
    throw err;
  }
  // Re-map since some newFiles entries may have been filtered as empty.
  const newUrlByFileIndex = new Map<number, string>();
  {
    let cursor = 0;
    newFiles.forEach((file, i) => {
      if (file.size > 0) {
        newUrlByFileIndex.set(i, uploadedUrls[cursor]);
        cursor++;
      }
    });
  }

  const tagIds = await resolveTagIds(parseTags(values.tags));
  const { ops: variantOps, removedImageUrls: removedVariantImageUrls } =
    await resolveVariantsForUpdate(id, formData, existing.variants);

  const newPriceCents = dollarsToCents(values.price);
  const priceChanged = newPriceCents !== existing.priceCents;

  try {
    await db.$transaction([
      db.product.update({
        where: { id },
        data: {
          brand: values.brand,
          name: values.name,
          sku: values.sku,
          description: values.description || null,
          estimatedArrival: values.estimatedArrival || null,
          priceCents: newPriceCents,
          type: values.type || null,
          status: values.status,
          sortOrder: values.sortOrder ? parseInt(values.sortOrder, 10) : 0,
          isNew: values.isNew,
          variantGroupName: resolveVariantGroupName(formData),
          // lastNotifiedPriceCents deliberately NOT touched here — it's
          // the Price Updates baseline, and only advances when a price
          // change is captured by "Generate Email" (see
          // src/lib/email/data/update.ts), not on every ordinary edit.
          tags: { set: tagIds },
        },
      }),
      db.productImage.deleteMany({
        where: { id: { in: removedImages.map((img) => img.id) } },
      }),
      ...order
        .map((token, sortOrder) => ({ token, sortOrder }))
        .filter(({ token }) => token.kind === "existing")
        .map(({ token, sortOrder }) =>
          db.productImage.update({
            where: { id: (token as { kind: "existing"; id: string }).id },
            data: { sortOrder },
          }),
        ),
      db.productImage.createMany({
        data: order
          .map((token, index) =>
            token.kind === "new"
              ? {
                  productId: id,
                  url: newUrlByFileIndex.get(token.fileIndex),
                  sortOrder: index,
                }
              : null,
          )
          .filter(
            (row): row is { productId: string; url: string; sortOrder: number } =>
              row !== null && typeof row.url === "string",
          ),
      }),
      ...variantOps,
    ]);
  } catch (err) {
    if (isSkuConflict(err)) {
      return { fieldErrors: { sku: "A product with this SKU already exists." } };
    }
    throw err;
  }

  // Best-effort cleanup of removed files, after the DB rows are gone.
  await Promise.all([
    ...removedImages.map((img) => storage.remove(img.url)),
    ...removedVariantImageUrls.map((url) => storage.remove(url)),
  ]);

  // Best-effort Recent Activity entry (Sprint 3.5 Analytics Dashboard) —
  // only logged when the price actually changed, never blocks the save.
  if (priceChanged) {
    await db.activityLog
      .create({
        data: {
          type: "price_updated",
          message: `${values.name} price changed to ${formatPrice(newPriceCents)}`,
          productId: id,
        },
      })
      .catch(() => {});
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/");
  return {};
}

export async function deleteProduct(id: string): Promise<void> {
  await requireAdmin();

  const existing = await db.product.findUnique({
    where: { id },
    include: { images: true },
  });
  if (!existing) return;

  await db.product.delete({ where: { id } });
  await Promise.all(existing.images.map((img) => storage.remove(img.url)));

  revalidatePath("/admin/products");
  revalidatePath("/");
}
