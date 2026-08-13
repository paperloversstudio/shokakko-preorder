import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/validations/product";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { deleteProduct } from "./actions";

const statusBadge: Record<string, { label: string; tone: "neutral" | "coral" }> = {
  draft: { label: "Draft", tone: "neutral" },
  sold_out: { label: "Sold Out", tone: "coral" },
};

export default async function AdminProductsPage() {
  const products = await db.product.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { tags: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new">
          <Button>+ Add product</Button>
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="rounded-card bg-white p-8 text-center text-ink-soft shadow-sm shadow-ink/5">
          No products yet — add your first one to get the order sheet started.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {products.map((product) => {
            const boundDelete = deleteProduct.bind(null, product.id);
            const badge = statusBadge[product.status];
            const thumbnail = product.images[0]?.url;
            return (
              <li
                key={product.id}
                className="flex items-center gap-4 rounded-card bg-white p-4 shadow-sm shadow-ink/5"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-mint/30">
                  {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnail}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xl">🎀</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="font-display font-bold hover:underline"
                    >
                      {product.name}
                    </Link>
                    {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
                    {product.priceCents === null && (
                      <Badge tone="lavender">Coming Soon</Badge>
                    )}
                    {product.isNew && <Badge tone="mint">🆕 New</Badge>}
                  </div>
                  <p className="truncate text-sm text-ink-soft">
                    {product.brand} · SKU {product.sku}
                    {product.type && ` · ${product.type}`} ·{" "}
                    {formatPrice(product.priceCents, product.currency)}
                  </p>
                  {product.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {product.tags.map((tag) => (
                        <Badge key={tag.id} tone="blue">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="font-semibold text-blue hover:underline"
                  >
                    Edit
                  </Link>
                  <DeleteButton
                    action={boundDelete}
                    confirmMessage={`Delete "${product.name}"? This can't be undone.`}
                  >
                    Delete
                  </DeleteButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
