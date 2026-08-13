import { emailBrand, emailFontFamily } from "./brand";

/**
 * Email Design System — Call To Action Button. One large rounded button,
 * configurable text + URL. Reused (with different text/href) across all
 * three templates — e.g. "View New Products", "Edit My Pre-order",
 * "Update My Pre-order", "Review My Wishlist".
 */
export function CTAButton({ text, href }: { text: string; href: string }) {
  return (
    <tr>
      <td style={{ padding: "24px 32px", textAlign: "center" }}>
        <a
          href={href}
          style={{
            display: "inline-block",
            fontFamily: emailFontFamily,
            fontSize: 15,
            fontWeight: 700,
            color: emailBrand.white,
            backgroundColor: emailBrand.accent,
            textDecoration: "none",
            padding: "14px 36px",
            borderRadius: 999,
          }}
        >
          {text}
        </a>
      </td>
    </tr>
  );
}
