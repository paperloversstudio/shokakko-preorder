import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { toCatalogProduct } from "@/lib/catalog";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { WishlistDrawer } from "@/components/wishlist/WishlistDrawer";
import { LinkBrowserOnMount } from "./LinkBrowserOnMount";
import { OrderItemsSection, type PortalOrderItem } from "./OrderItemsSection";
import { WishlistSection, type PortalWishlistItem } from "./WishlistSection";
import { CustomerInfoForm } from "./CustomerInfoForm";
import { NotificationPreferences } from "./NotificationPreferences";
import { OrderTimeline } from "./OrderTimeline";

export const metadata: Metadata = {
  title: "Edit My Pre-order — Shokakko Australia",
  robots: { index: false, follow: false },
};

export default async function EditPreOrderPage({
  params,
}: PageProps<"/edit/[token]">) {
  const { token } = await params;

  const [order, products, settings] = await Promise.all([
    db.preOrder.findUnique({
      where: { editToken: token },
      include: {
        items: {
          include: { product: { include: { images: { orderBy: { sortOrder: "asc" } }, variants: true } } },
        },
        wishlistItems: {
          include: { product: { include: { images: { orderBy: { sortOrder: "asc" } } } }, variant: true },
        },
        historyEntries: { orderBy: { createdAt: "asc" } },
      },
    }),
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

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader logoUrl={settings?.logoUrl ?? null} />
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
          <p className="text-4xl">🔒</p>
          <h1 className="font-display text-2xl font-bold">This link is invalid or has expired</h1>
          <p className="text-ink-soft">
            Double-check the link, or request a fresh one from My Pre-order.
          </p>
          <Link
            href="/my-preorders"
            className="rounded-pill bg-blue px-6 py-3 font-display font-bold text-white shadow-sm shadow-blue/30"
          >
            Go to My Pre-order
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const lastUpdated = order.historyEntries.at(-1)?.createdAt ?? order.createdAt;

  const items: PortalOrderItem[] = order.items.map((item) => {
    const variant = item.variantId
      ? item.product?.variants.find((v) => v.id === item.variantId)
      : undefined;
    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      productName: item.product?.name ?? item.productName,
      productBrand: item.product?.brand ?? item.productBrand,
      variantName: item.variantName,
      unitPriceCents: item.unitPriceCents,
      imageUrl: variant?.imageUrl ?? item.product?.images[0]?.url ?? null,
      // Live group name — drives whether the editable VariantPills show
      // (only meaningful while the product/its variants still exist).
      variantGroupName: item.product?.variantGroupName ?? null,
      // Permanent snapshot — read only when the live one above is
      // unavailable (product deleted), so the read-only fallback label
      // still shows the real group name instead of a generic one.
      snapshotVariantGroupName: item.variantGroupName,
      variants: (item.product?.variants ?? []).map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        priceCents: v.priceCentsOverride ?? item.product!.priceCents,
        imageUrl: v.imageUrl,
      })),
    };
  });

  const wishlistItems: PortalWishlistItem[] = order.wishlistItems
    .filter((w) => w.product)
    .map((w) => ({
      id: w.id,
      productId: w.productId,
      variantId: w.variantId,
      productName: w.product!.name,
      productBrand: w.product!.brand,
      variantLabel:
        w.variant && w.product!.variantGroupName
          ? `${w.product!.variantGroupName}: ${w.variant.name}`
          : null,
      priceCents: w.variant?.priceCentsOverride ?? w.product!.priceCents,
      imageUrl: w.variant?.imageUrl ?? w.product!.images[0]?.url ?? null,
      productStatus: w.product!.status as "active" | "draft" | "sold_out",
    }));

  return (
    <div className="flex min-h-screen flex-col">
      <LinkBrowserOnMount token={token} />
      <SiteHeader logoUrl={settings?.logoUrl ?? null} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <div className="rounded-card bg-white p-6 shadow-sm shadow-ink/5">
          <h1 className="font-display text-2xl font-bold">Edit My Pre-order</h1>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink-soft">Order Number</dt>
              <dd className="font-display font-bold">{order.orderNumber}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink-soft">Event</dt>
              <dd className="font-semibold">{settings?.eventName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink-soft">Last Updated</dt>
              <dd className="font-semibold">
                {lastUpdated.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
              </dd>
            </div>
          </dl>
        </div>

        <OrderItemsSection token={token} items={items} />
        <WishlistSection token={token} items={wishlistItems} />
        <div className="rounded-card bg-white p-6 shadow-sm shadow-ink/5">
          <CustomerInfoForm
            token={token}
            defaults={{
              customerFirstName: order.customerFirstName,
              customerLastName: order.customerLastName,
              customerEmail: order.customerEmail,
              shipping: {
                address1: order.shippingAddress1,
                address2: order.shippingAddress2 ?? "",
                suburb: order.shippingSuburb,
                state: order.shippingState,
                postcode: order.shippingPostcode,
                country: order.shippingCountry,
              },
              billing: order.billingAddress1
                ? {
                    address1: order.billingAddress1,
                    address2: order.billingAddress2 ?? "",
                    suburb: order.billingSuburb ?? "",
                    state: order.billingState ?? "",
                    postcode: order.billingPostcode ?? "",
                    country: order.billingCountry ?? "Australia",
                  }
                : null,
              notes: order.notes ?? "",
            }}
          />
        </div>
        <NotificationPreferences
          token={token}
          defaults={{
            notifyNewProducts: order.notifyNewProducts,
            notifyPriceUpdates: order.notifyPriceUpdates,
            notifyReminderBeforeClose: order.notifyReminderBeforeClose,
          }}
        />
        <OrderTimeline entries={order.historyEntries} />
      </main>
      <Footer />
      <CartDrawer products={catalog} />
      <WishlistDrawer products={catalog} />
    </div>
  );
}
