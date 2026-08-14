import Link from "next/link";
import { db } from "@/lib/db";
import { toCatalogProduct } from "@/lib/catalog";
import { SiteLogo } from "@/components/SiteLogo";
import { Footer } from "@/components/layout/Footer";
import { CheckoutForm } from "./CheckoutForm";

// Prices/availability can change between browsing and checking out — never
// serve a cached snapshot here.
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [products, settings] = await Promise.all([
    db.product.findMany({
      where: { status: { in: ["active", "sold_out"] } },
      include: {
        tags: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: { sortOrder: "asc" } },
      },
    }),
    db.siteSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  const catalog = products.map(toCatalogProduct);
  const logoUrl = settings?.logoUrl ?? null;

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <SiteLogo logoUrl={logoUrl} size="checkout" linkClassName="flex items-center" />
          <Link
            href="/"
            className="text-sm font-semibold text-ink-soft hover:text-ink"
          >
            ← Back to shopping
          </Link>
        </div>
        <h1 className="font-display text-2xl font-bold">Checkout</h1>
        <CheckoutForm products={catalog} preorderInfoHtml={settings?.preorderInfoHtml ?? null} />
      </main>
      <Footer />
    </div>
  );
}
