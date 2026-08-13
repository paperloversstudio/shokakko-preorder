import "server-only";
import { db } from "@/lib/db";
import { buildEditUrl, buildFooterLinks } from "../site-url";
import type { FooterLinks } from "../components/Footer";

export type ConfirmationEmailData = {
  subject: string;
  firstName: string;
  orderNumber: string;
  items: { name: string; brand: string; quantity: number; unitPriceCents: number | null }[];
  totalCents: number;
  hasUnknownPrice: boolean;
  editUrl: string | null;
  ctaText: string;
  ctaUrl: string;
  logoUrl: string | null;
  eventName: string | null;
  footerLinks: FooterLinks;
};

/** Pure data-layer builder — pulls the one PreOrder + SiteSettings into
 * plain props for <ConfirmationEmail>. No JSX here; swapping the template's
 * HTML later (once Karen's Canva design is ready) never touches this. */
export async function buildConfirmationEmailData(
  orderNumber: string,
): Promise<ConfirmationEmailData | null> {
  const [order, settings] = await Promise.all([
    db.preOrder.findUnique({ where: { orderNumber }, include: { items: true } }),
    db.siteSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  if (!order) return null;

  const totalCents = order.items.reduce(
    (sum, item) => (item.unitPriceCents !== null ? sum + item.unitPriceCents * item.quantity : sum),
    0,
  );
  const hasUnknownPrice = order.items.some((item) => item.unitPriceCents === null);
  const editUrl = order.editToken ? await buildEditUrl(order.editToken) : null;

  return {
    subject: `Your Shokakko Australia pre-order — ${order.orderNumber}`,
    firstName: order.customerFirstName,
    orderNumber: order.orderNumber,
    items: order.items.map((item) => ({
      name: item.productName,
      brand: item.productBrand,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    })),
    totalCents,
    hasUnknownPrice,
    editUrl,
    ctaText: "Edit My Pre-order",
    ctaUrl: editUrl ?? "/",
    logoUrl: settings?.logoUrl ?? null,
    eventName: settings?.eventName ?? null,
    footerLinks: await buildFooterLinks(settings, order.editToken),
  };
}
