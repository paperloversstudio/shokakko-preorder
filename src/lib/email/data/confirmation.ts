import "server-only";
import { db } from "@/lib/db";
import { buildEditUrl, buildFooterLinks } from "../site-url";
import { resolveTemplateSections, type GenericEmailData } from "./generic";

/** Pure data-layer builder — pulls the one PreOrder + SiteSettings into
 * render-ready data for <GenericEmail>. Owns "which order, which
 * recipient"; resolveTemplateSections() (generic.ts) owns turning the
 * admin-authored "confirmation" template into concrete sections. */
export async function buildConfirmationEmailData(orderNumber: string): Promise<GenericEmailData | null> {
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
  const footerLinks = await buildFooterLinks(settings, order.editToken);
  const logoUrl = settings?.logoUrl ?? null;
  const eventName = settings?.eventName ?? null;

  const { subject, sections } = await resolveTemplateSections("confirmation", {
    firstName: order.customerFirstName,
    logoUrl,
    eventName,
    footerLinks,
    editUrl,
    order: {
      orderNumber: order.orderNumber,
      items: order.items.map((item) => ({
        name: item.productName,
        brand: item.productBrand,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        variantName: item.variantName,
        variantGroupName: item.variantGroupName,
      })),
      totalCents,
      hasUnknownPrice,
    },
  });

  return {
    // The template's admin-set subject may include the literal
    // "{{order_number}}" placeholder — substituted here since "which
    // order" is this builder's own job, not the generic engine's.
    subject: subject.replace("{{order_number}}", order.orderNumber),
    firstName: order.customerFirstName,
    logoUrl,
    eventName,
    footerLinks,
    sections,
  };
}
