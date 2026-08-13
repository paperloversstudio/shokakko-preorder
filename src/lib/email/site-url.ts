import "server-only";
import { headers } from "next/headers";
import type { FooterLinks } from "./components/Footer";

/**
 * The site's own absolute origin, e.g. "https://shokakko-preorder.vercel.app"
 * or "http://localhost:3000" in dev. Every email needs absolute URLs (edit
 * links, product links, collection links) since there's no relative "current
 * page" once the HTML is opened in an email client.
 *
 * Extracted from the protocol/host-detection logic that originally lived
 * inline in src/app/order/[orderNumber]/page.tsx (Sprint 2's "Edit My
 * Pre-order" link) — same reasoning, now shared by every email template.
 */
export async function getSiteOrigin(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}

/** Builds the future /edit/{token} Pre-order Workspace URL (see PreOrder.editToken) — shown as inert text on the order confirmation page (Sprint 2), and used as the edit-link target in every email template (Sprint 3). */
export async function buildEditUrl(editToken: string): Promise<string> {
  const origin = await getSiteOrigin();
  return `${origin}/edit/${editToken}`;
}

/** Builds an absolute /product/[id] Product Details URL for use in email templates. */
export async function buildProductUrl(productId: string): Promise<string> {
  const origin = await getSiteOrigin();
  return `${origin}/product/${productId}`;
}

/** Builds an absolute /collections/[id] URL for use in email Collection Cards. */
export async function buildCollectionUrl(tagId: string): Promise<string> {
  const origin = await getSiteOrigin();
  return `${origin}/collections/${tagId}`;
}

/** Builds an absolute /unsubscribe/[token] URL for the email Footer. */
export async function buildUnsubscribeUrl(editToken: string): Promise<string> {
  const origin = await getSiteOrigin();
  return `${origin}/unsubscribe/${editToken}`;
}

/** Shared by every data/*.ts builder — assembles the Footer's admin-
 * configured links (SiteSettings' email* fields) plus a per-recipient
 * unsubscribe URL (null if this PreOrder predates editToken, see
 * FooterLinks' comment). */
export async function buildFooterLinks(
  settings: {
    emailContactUrl: string | null;
    emailShippingPolicyUrl: string | null;
    emailWebsiteUrl: string | null;
    emailInstagramUrl: string | null;
  } | null,
  editToken: string | null,
): Promise<FooterLinks> {
  return {
    contactUrl: settings?.emailContactUrl ?? null,
    shippingPolicyUrl: settings?.emailShippingPolicyUrl ?? null,
    websiteUrl: settings?.emailWebsiteUrl ?? null,
    instagramUrl: settings?.emailInstagramUrl ?? null,
    unsubscribeUrl: editToken ? await buildUnsubscribeUrl(editToken) : null,
  };
}
