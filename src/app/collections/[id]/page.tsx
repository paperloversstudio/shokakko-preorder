import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { toCatalogProduct } from "@/lib/catalog";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { WishlistDrawer } from "@/components/wishlist/WishlistDrawer";
import { ProductCard } from "@/components/catalog/ProductCard";

// Prices/availability change live during the exhibition — same
// force-dynamic reasoning as the homepage and Product Details page.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/collections/[id]">): Promise<Metadata> {
  const { id } = await params;
  const tag = await db.tag.findUnique({ where: { id }, select: { name: true } });
  if (!tag) return { title: "Collection not found — Shokakko Australia" };
  return { title: `${tag.name} — Shokakko Australia` };
}

/** Public collection page — what an email's Collection Card links to
 * (Sprint 3). Scoped to one tag, so it reuses `ProductCard` directly
 * rather than the full `ProductBrowser` (no search/filter/sort needed,
 * already narrowed to one collection). */
export default async function CollectionPage({ params }: PageProps<"/collections/[id]">) {
  const { id } = await params;

  const [tag, settings] = await Promise.all([
    db.tag.findUnique({
      where: { id },
      include: {
        products: {
          where: { status: { in: ["active", "sold_out"] } },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
          include: {
            tags: true,
            images: { orderBy: { sortOrder: "asc" } },
            variants: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    }),
    db.siteSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  if (!tag) notFound();

  const catalog = tag.products.map(toCatalogProduct);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader logoUrl={settings?.logoUrl ?? null} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Link href="/" className="text-sm font-semibold text-ink-soft hover:text-ink">
          ← Back to shopping
        </Link>
        <h1 className="mt-1 font-display text-2xl font-bold">{tag.name}</h1>
        {catalog.length === 0 ? (
          <p className="mt-6 rounded-card bg-white p-8 text-center text-ink-soft shadow-sm shadow-ink/5">
            Nothing in this collection right now — check back soon!
          </p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {catalog.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ul>
        )}
      </main>
      <Footer />
      <CartDrawer products={catalog} />
      <WishlistDrawer products={catalog} />
    </div>
  );
}
