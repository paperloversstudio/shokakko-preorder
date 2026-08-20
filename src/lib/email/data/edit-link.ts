import "server-only";
import { db } from "@/lib/db";
import { buildEditUrl, buildFooterLinks } from "../site-url";
import type { FooterLinks } from "../components/Footer";

export type EditLinkEmailData = {
  subject: string;
  firstName: string;
  ctaText: string;
  ctaUrl: string;
  logoUrl: string | null;
  eventName: string | null;
  footerLinks: FooterLinks;
};

/** Pure data-layer builder for <EditLinkEmail> — same separation as
 * data/reminder.ts. Takes an already-fetched PreOrder (the caller,
 * requestEditLink, already looked it up to decide whether to send at
 * all) rather than re-querying by id/token here. */
export async function buildEditLinkEmailData(order: {
  customerFirstName: string;
  editToken: string | null;
}): Promise<EditLinkEmailData | null> {
  if (!order.editToken) return null;

  const settings = await db.siteSettings.findUnique({ where: { id: "singleton" } });
  const editUrl = await buildEditUrl(order.editToken);

  return {
    subject: "Your Shokakko Australia pre-order edit link",
    firstName: order.customerFirstName,
    ctaText: "Edit My Pre-order",
    ctaUrl: editUrl,
    logoUrl: settings?.logoUrl ?? null,
    eventName: settings?.eventName ?? null,
    footerLinks: await buildFooterLinks(settings, order.editToken),
  };
}
