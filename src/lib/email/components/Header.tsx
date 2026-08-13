import { emailBrand, emailFontFamily } from "./brand";

/**
 * Email Design System — Header.
 * Centered Shokakko logo (falls back to a text wordmark, same rule as
 * `SiteHeader.tsx`'s "no logo uploaded" case) + the event title
 * (`SiteSettings.eventName`, e.g. "Taiwan Illustration & Stationery
 * Fest"). Reusable across all three email templates.
 */
export function Header({
  logoUrl,
  eventName,
}: {
  logoUrl: string | null;
  eventName: string | null;
}) {
  return (
    <tr>
      <td style={{ padding: "28px 32px 16px", textAlign: "center" }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- email HTML, not a Next.js page
          <img
            src={logoUrl}
            alt="Shokakko Australia"
            width={160}
            style={{ display: "block", margin: "0 auto", maxWidth: 160, height: "auto" }}
          />
        ) : (
          <div
            style={{
              fontFamily: emailFontFamily,
              fontSize: 24,
              fontWeight: 700,
              color: emailBrand.ink,
            }}
          >
            ✿ Shokakko Australia
          </div>
        )}
        {eventName && (
          <div
            style={{
              fontFamily: emailFontFamily,
              fontSize: 14,
              fontWeight: 600,
              color: emailBrand.accent,
              marginTop: 8,
            }}
          >
            {eventName}
          </div>
        )}
      </td>
    </tr>
  );
}
