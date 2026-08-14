export type CatalogVariant = {
  id: string;
  name: string;
  sku: string | null;
  priceCents: number | null; // the variant's own override, or null to use the product's price
  imageUrl: string | null;
};

export type CatalogProduct = {
  id: string;
  brand: string;
  name: string;
  sku: string;
  description: string | null;
  estimatedArrival: string | null;
  priceCents: number | null;
  currency: string;
  images: { url: string }[];
  type: string | null;
  // Draft products are never sent to the customer site — see src/app/page.tsx.
  status: "active" | "sold_out";
  tags: string[];
  // Sprint 3.5 — null/empty means "no variants." When set, customers pick
  // one of `variants` as a pill on the Product Details page — see
  // src/components/catalog/VariantPills.tsx.
  variantGroupName: string | null;
  variants: CatalogVariant[];
};
