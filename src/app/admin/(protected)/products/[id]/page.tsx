import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { deleteProduct, updateProduct } from "../actions";
import { ProductForm } from "../ProductForm";

export default async function EditProductPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    include: {
      tags: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!product) notFound();

  const boundUpdate = updateProduct.bind(null, product.id);
  const boundDelete = deleteProduct.bind(null, product.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/products"
            className="text-sm font-semibold text-ink-soft hover:text-ink"
          >
            ← Back to products
          </Link>
          <h1 className="mt-1 font-display text-2xl font-bold">
            Edit {product.name}
          </h1>
        </div>
        <DeleteButton
          action={boundDelete}
          redirectTo="/admin/products"
          confirmMessage={`Delete "${product.name}"? This can't be undone. Past pre-orders that included it will keep a record of what was ordered.`}
        >
          Delete product
        </DeleteButton>
      </div>
      <div className="rounded-card bg-white p-6 shadow-sm shadow-ink/5">
        <ProductForm
          action={boundUpdate}
          submitLabel="Save changes"
          defaults={{
            brand: product.brand,
            name: product.name,
            sku: product.sku,
            description: product.description ?? "",
            estimatedArrival: product.estimatedArrival ?? "",
            priceCents: product.priceCents,
            type: product.type ?? "",
            status: product.status as "active" | "draft" | "sold_out",
            sortOrder: product.sortOrder,
            tags: product.tags.map((t) => t.name),
            images: product.images.map((img) => ({ id: img.id, url: img.url })),
            isNew: product.isNew,
            variantGroupName: product.variantGroupName ?? "",
            variants: product.variants.map((v) => ({
              id: v.id,
              name: v.name,
              sku: v.sku,
              priceCents: v.priceCentsOverride,
              imageUrl: v.imageUrl,
            })),
          }}
        />
      </div>
    </div>
  );
}
