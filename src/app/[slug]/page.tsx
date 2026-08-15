import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { toCatalogProduct } from "@/lib/catalog";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { WishlistDrawer } from "@/components/wishlist/WishlistDrawer";
import { SectionRenderer, type RenderableSection } from "@/components/event-pages/SectionRenderer";
import type { SectionType } from "@/lib/validations/event-page";

/**
 * Sprint 4 — the Event Pages CMS's single catch-all route. Every
 * `EventPage` (the two seeded ones — /how-to-preorder, /about-event —
 * and any the admin adds later) is reached here by its `slug` column,
 * with no new route file needed per page. Next always resolves a static
 * segment (checkout, product, collections, ...) before this dynamic one
 * at the same level, so nothing existing can be shadowed — confirmed
 * during Sprint 4 planning; slug validation additionally blocks an admin
 * from picking one of those words in the first place.
 */

export async function generateMetadata({
  params,
}: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await db.eventPage.findUnique({ where: { slug }, select: { title: true } });
  if (!page) return { title: "Page not found — Shokakko Australia" };
  return { title: `${page.title} — Shokakko Australia` };
}

export default async function EventPageRoute({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;

  const [page, products, settings] = await Promise.all([
    db.eventPage.findUnique({
      where: { slug },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
    }),
    // Same full-catalog fetch as /product/[id] — SiteHeader's cart/
    // wishlist icons need CartDrawer/WishlistDrawer mounted with the full
    // product list to resolve any existing lines, even on a page that
    // isn't itself about shopping.
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

  if (!page) notFound();

  const catalog = products.map(toCatalogProduct);
  const sections: RenderableSection[] = page.sections.map((s) => ({
    id: s.id,
    type: s.type as SectionType,
    data: s.data,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader logoUrl={settings?.logoUrl ?? null} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <h1 className="mb-6 font-display text-3xl font-bold">{page.title}</h1>
        {sections.length === 0 ? (
          <p className="text-ink-soft">This page doesn&apos;t have any content yet.</p>
        ) : (
          <div className="flex flex-col gap-8">
            {sections.map((section) => (
              <SectionRenderer key={section.id} section={section} />
            ))}
          </div>
        )}
      </main>
      <Footer />
      <CartDrawer products={catalog} />
      <WishlistDrawer products={catalog} />
    </div>
  );
}
