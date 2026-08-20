import { emailBrand, emailFontFamily } from "./brand";

/**
 * Email Design System — standalone Image. Distinct from `HeroBanner`
 * (which is meant as one edge-to-edge banner at the top of an email) —
 * a template can carry any number of these alongside its Hero Banner,
 * each with its own optional caption/link. Renders nothing if no image
 * is configured, same "always safe to include" rule as HeroBanner.
 */
export function EmailImage({
  url,
  linkUrl,
  caption,
}: {
  url: string | null;
  linkUrl?: string | null;
  caption?: string;
}) {
  if (!url) return null;

  const image = (
    // eslint-disable-next-line @next/next/no-img-element -- email HTML, not a Next.js page
    <img
      src={url}
      alt={caption ?? ""}
      width={536}
      style={{ display: "block", width: "100%", maxWidth: 536, height: "auto", borderRadius: 16 }}
    />
  );

  return (
    <tr>
      <td style={{ padding: "16px 32px 0" }}>
        {linkUrl ? <a href={linkUrl}>{image}</a> : image}
        {caption && (
          <div
            style={{
              fontFamily: emailFontFamily,
              fontSize: 12,
              color: emailBrand.inkSoft,
              textAlign: "center",
              marginTop: 6,
            }}
          >
            {caption}
          </div>
        )}
      </td>
    </tr>
  );
}
