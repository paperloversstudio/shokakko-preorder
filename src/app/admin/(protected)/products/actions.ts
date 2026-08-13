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
  parseTags,
} from "@/lib/validations/product";
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
  });
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
        tags: { connect: tagIds },
        images: { create: images },
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

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect(`/admin/products/${productId}`);
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
    include: { images: true },
  });
  if (!existing) return { error: "Product not found." };

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
          priceCents: dollarsToCents(values.price),
          type: values.type || null,
          status: values.status,
          sortOrder: values.sortOrder ? parseInt(values.sortOrder, 10) : 0,
          isNew: values.isNew,
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
    ]);
  } catch (err) {
    if (isSkuConflict(err)) {
      return { fieldErrors: { sku: "A product with this SKU already exists." } };
    }
    throw err;
  }

  // Best-effort cleanup of removed files, after the DB rows are gone.
  await Promise.all(removedImages.map((img) => storage.remove(img.url)));

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
