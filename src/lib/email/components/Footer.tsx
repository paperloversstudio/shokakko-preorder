import { emailBrand, emailFontFamily } from "./brand";

export type FooterLinks = {
  contactUrl: string | null;
  shippingPolicyUrl: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  // Per-recipient functional link to /unsubscribe/[token] — not
  // admin-configurable, since it has to point somewhere real per customer.
  // Null only for orders placed before Sprint 2's editToken existed (no
  // token to build a working unsubscribe link from) — Footer just omits
  // the link rather than rendering a dead one.
  unsubscribeUrl: string | null;
};

/**
 * Email Design System — Footer. Contact Us / Shipping Policy / Website /
 * Instagram (all admin-configurable via SiteSettings' email fields — see
 * /admin/settings) + Unsubscribe.
 */
export function Footer({ links }: { links: FooterLinks }) {
  const infoLinks: { label: string; href: string | null }[] = [
    { label: "Contact Us", href: links.contactUrl },
    { label: "Shipping Policy", href: links.shippingPolicyUrl },
    { label: "Website", href: links.websiteUrl },
    { label: "Instagram", href: links.instagramUrl },
  ].filter((l) => l.href);

  return (
    <tr>
      <td
        style={{
          padding: "24px 32px 32px",
          textAlign: "center",
          fontFamily: emailFontFamily,
          fontSize: 12,
          color: emailBrand.inkSoft,
          borderTop: `1px solid ${emailBrand.line}`,
        }}
      >
        <div>
          {infoLinks.map((link, i) => (
            <span key={link.label}>
              {i > 0 && " · "}
              <a href={link.href!} style={{ color: emailBrand.inkSoft }}>
                {link.label}
              </a>
            </span>
          ))}
        </div>
        {links.unsubscribeUrl && (
          <div style={{ marginTop: 10 }}>
            <a href={links.unsubscribeUrl} style={{ color: emailBrand.inkSoft }}>
              Unsubscribe
            </a>
          </div>
        )}
        <div style={{ marginTop: 10 }}>✿ Shokakko Australia</div>
      </td>
    </tr>
  );
}
