import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { toCatalogProduct } from "@/lib/catalog";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { WishlistDrawer } from "@/components/wishlist/WishlistDrawer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Collections — Shokakko Australia" };

/** Simple index of every collection — reachable from the site, and where
 * /admin/collections links out to for a live check. */
export default async function CollectionsIndexPage() {
  const [tags, settings, products] = await Promise.all([
    db.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    db.siteSettings.findUnique({ where: { id: "singleton" } }),
    // Full catalog, same as every other customer page — so cart/wishlist
    // lines resolve correctly in the drawers regardless of what page a
    // customer opens them from.
    db.product.findMany({
      where: { status: { in: ["active", "sold_out"] } },
      include: { tags: true, images: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);
  const catalog = products.map(toCatalogProduct);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader logoUrl={settings?.logoUrl ?? null} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <h1 className="font-display text-2xl font-bold">Collections</h1>
        {tags.length === 0 ? (
          <p className="mt-6 rounded-card bg-white p-8 text-center text-ink-soft shadow-sm shadow-ink/5">
            No collections yet.
          </p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {tags.map((tag) => (
              <li key={tag.id}>
                <Link href={`/collections/${tag.id}`} className="block text-center">
                  <div className="aspect-square w-full overflow-hidden rounded-card bg-lavender/20">
                    {tag.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={tag.imageUrl} alt={tag.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">🎀</div>
                    )}
                  </div>
                  <p className="mt-2 font-display text-sm font-bold">{tag.name}</p>
                  <p className="text-xs text-ink-soft">
                    {tag._count.products} product{tag._count.products === 1 ? "" : "s"}
                  </p>
                </Link>
              </li>
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
