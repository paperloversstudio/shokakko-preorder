import "server-only";
import { db } from "@/lib/db";
import { buildEditUrl, buildFooterLinks } from "../site-url";
import { resolveTemplateSections, type GenericEmailData } from "./generic";

/** Pure data-layer builder for the Reminder Email — same separation as
 * confirmation.ts. `countdownTargetAt` reuses SiteSettings' existing
 * countdown field (already shown on the homepage's EventInfoStrip), not a
 * new setting. */
export async function buildReminderEmailData(orderNumber: string): Promise<GenericEmailData | null> {
  const [order, settings] = await Promise.all([
    db.preOrder.findUnique({ where: { orderNumber } }),
    db.siteSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  if (!order) return null;

  const editUrl = order.editToken ? await buildEditUrl(order.editToken) : null;
  const footerLinks = await buildFooterLinks(settings, order.editToken);
  const logoUrl = settings?.logoUrl ?? null;
  const eventName = settings?.eventName ?? null;
  const countdownRemainingMs = settings?.countdownTargetAt
    ? settings.countdownTargetAt.getTime() - Date.now()
    : null;

  const { subject, sections } = await resolveTemplateSections("reminder", {
    firstName: order.customerFirstName,
    logoUrl,
    eventName,
    footerLinks,
    editUrl,
    countdownRemainingMs,
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
