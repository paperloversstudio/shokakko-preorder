import "server-only";
import { db } from "@/lib/db";
import { getFirstName } from "../first-name";
import { buildEditUrl, buildFooterLinks } from "../site-url";
import type { FooterLinks } from "../components/Footer";

export type ReminderEmailData = {
  subject: string;
  firstName: string;
  // Computed here (business logic), not in the Countdown component
  // (presentation) — how much time is left as of render time, in
  // milliseconds. Null if no countdown target is configured.
  countdownRemainingMs: number | null;
  ctaText: string;
  ctaUrl: string;
  logoUrl: string | null;
  eventName: string | null;
  footerLinks: FooterLinks;
};

/** Pure data-layer builder for <ReminderEmail> — same separation as
 * confirmation.ts. `countdownTargetAt` reuses SiteSettings' existing
 * countdown field (already shown on the homepage's EventInfoStrip), not a
 * new setting. */
export async function buildReminderEmailData(orderNumber: string): Promise<ReminderEmailData | null> {
  const [order, settings] = await Promise.all([
    db.preOrder.findUnique({ where: { orderNumber } }),
    db.siteSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  if (!order) return null;

  const editUrl = order.editToken ? await buildEditUrl(order.editToken) : null;

  return {
    subject: "Reminder: your Shokakko Australia pre-order closes soon",
    firstName: getFirstName(order.customerName),
    countdownRemainingMs: settings?.countdownTargetAt
      ? settings.countdownTargetAt.getTime() - Date.now()
      : null,
    ctaText: "Edit My Pre-order",
    ctaUrl: editUrl ?? "/",
    logoUrl: settings?.logoUrl ?? null,
    eventName: settings?.eventName ?? null,
    footerLinks: await buildFooterLinks(settings, order.editToken),
  };
}
