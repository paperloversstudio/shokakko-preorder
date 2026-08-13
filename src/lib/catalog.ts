import type { CatalogProduct } from "@/components/catalog/types";

type ProductWithRelations = {
  id: string;
  brand: string;
  name: string;
  sku: string;
  description: string | null;
  estimatedArrival: string | null;
  priceCents: number | null;
  currency: string;
  type: string | null;
  status: string;
  images: { url: string }[];
  tags: { name: string }[];
};

/** Shared by every customer-facing page (`/`, `/checkout`) that needs the
 * product catalog shaped for the browser — keeps the Prisma-row-to-UI-shape
 * mapping in one place. */
export function toCatalogProduct(product: ProductWithRelations): CatalogProduct {
  return {
    id: product.id,
    brand: product.brand,
    name: product.name,
    sku: product.sku,
    description: product.description,
    estimatedArrival: product.estimatedArrival,
    priceCents: product.priceCents,
    currency: product.currency,
    images: product.images.map((img) => ({ url: img.url })),
    type: product.type,
    status: product.status as "active" | "sold_out",
    tags: product.tags.map((tag) => tag.name),
  };
}
