import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { toCatalogProduct } from "@/lib/catalog";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { WishlistDrawer } from "@/components/wishlist/WishlistDrawer";
import { ProductDetailsView } from "./ProductDetailsView";

// Prices/availability change live during the exhibition — never serve a
// cached snapshot here, same reasoning as the homepage.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/product/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = await db.product.findFirst({
    where: { id, status: { in: ["active", "sold_out"] } },
    select: { name: true, brand: true },
  });
  if (!product) return { title: "Product not found — Shokakko Australia" };
  return { title: `${product.name} — Shokakko Australia` };
}

export default async function ProductDetailsPage({
  params,
}: PageProps<"/product/[id]">) {
  const { id } = await params;

  const [products, settings] = await Promise.all([
    db.product.findMany({
      where: { status: { in: ["active", "sold_out"] } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        tags: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: { sortOrder: "asc" } },
      },
    }),
    db.siteSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  const catalog = products.map(toCatalogProduct);
  const product = catalog.find((p) => p.id === id);

  if (!product) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader logoUrl={settings?.logoUrl ?? null} />
      <main className="flex-1">
        <ProductDetailsView product={product} />
      </main>
      <Footer />
      <CartDrawer products={catalog} />
      <WishlistDrawer products={catalog} />
    </div>
  );
}
