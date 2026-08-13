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
};
