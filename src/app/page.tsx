import { db } from "@/lib/db";
import { toCatalogProduct } from "@/lib/catalog";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { FloatingAdminButton } from "@/components/layout/FloatingAdminButton";
import { Footer } from "@/components/layout/Footer";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { EventInfoStrip } from "@/components/home/EventInfoStrip";
import { ProductBrowser } from "@/components/catalog/ProductBrowser";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { WishlistDrawer } from "@/components/wishlist/WishlistDrawer";

// Products/banners/settings are added live throughout the exhibition day —
// this page must never serve a build-time snapshot. force-dynamic re-queries
// on every request instead of relying on ISR/on-demand revalidation subtleties.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, banners, settings] = await Promise.all([
    db.product.findMany({
      // "draft" is never shown to customers; "sold_out" is shown but not
      // orderable (see ProductCard).
      where: { status: { in: ["active", "sold_out"] } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: { tags: true, images: { orderBy: { sortOrder: "asc" } } },
    }),
    db.heroBanner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.siteSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  const catalog = products.map(toCatalogProduct);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader logoUrl={settings?.logoUrl ?? null} />
      <HeroCarousel banners={banners} />
      <EventInfoStrip
        eventName={settings?.eventName ?? null}
        eventLocation={settings?.eventLocation ?? null}
        eventInfo={settings?.eventInfo ?? null}
        countdownTargetAt={settings?.countdownTargetAt?.toISOString() ?? null}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <ProductBrowser products={catalog} />
      </main>
      <Footer />
      <FloatingAdminButton />
      <CartDrawer products={catalog} />
      <WishlistDrawer products={catalog} />
    </div>
  );
}
