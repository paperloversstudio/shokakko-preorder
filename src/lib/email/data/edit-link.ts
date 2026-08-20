import "server-only";
import { db } from "@/lib/db";
import { buildEditUrl, buildFooterLinks } from "../site-url";
import { resolveTemplateSections, type GenericEmailData } from "./generic";

/** Pure data-layer builder for "Retrieve My Pre-order" — same separation
 * as confirmation.ts. Takes an already-fetched PreOrder (the caller,
 * requestEditLink, already looked it up to decide whether to send at
 * all) rather than re-querying by id/token here. */
export async function buildEditLinkEmailData(order: {
  customerFirstName: string;
  editToken: string | null;
}): Promise<GenericEmailData | null> {
  if (!order.editToken) return null;

  const settings = await db.siteSettings.findUnique({ where: { id: "singleton" } });
  const editUrl = await buildEditUrl(order.editToken);
  const footerLinks = await buildFooterLinks(settings, order.editToken);
  const logoUrl = settings?.logoUrl ?? null;
  const eventName = settings?.eventName ?? null;

  // Look up the order's own line items so the "Product Cards" section
  // (source: "order_items", on by default — see the plan's Decisions)
  // can show them, exactly like Confirmation does.
  const fullOrder = await db.preOrder.findUnique({
    where: { editToken: order.editToken },
    include: { items: true },
  });
  const totalCents = fullOrder
    ? fullOrder.items.reduce(
        (sum, item) => (item.unitPriceCents !== null ? sum + item.unitPriceCents * item.quantity : sum),
        0,
      )
    : 0;
  const hasUnknownPrice = fullOrder ? fullOrder.items.some((item) => item.unitPriceCents === null) : false;

  const { subject, sections } = await resolveTemplateSections("edit_link", {
    firstName: order.customerFirstName,
    logoUrl,
    eventName,
    footerLinks,
    editUrl,
    order: fullOrder
      ? {
          orderNumber: fullOrder.orderNumber,
          items: fullOrder.items.map((item) => ({
            name: item.productName,
            brand: item.productBrand,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            variantName: item.variantName,
            variantGroupName: item.variantGroupName,
          })),
          totalCents,
          hasUnknownPrice,
        }
      : undefined,
  });

  return {
    subject,
    firstName: order.customerFirstName,
    logoUrl,
    eventName,
    footerLinks,
    sections,
  };
}
