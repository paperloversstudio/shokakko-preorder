/**
 * Email Design System — Hero Banner.
 * One configurable image, admin-editable per `EmailTemplate` via its own
 * `hero_banner` section (post-Sprint-6's Email Template Manager) —
 * distinct from the homepage's rotating multi-banner `HeroBanner` model,
 * since one email only ever shows one at a time. A template that doesn't
 * include this section simply never resolves one — renders nothing
 * itself if no image is configured, so it's always safe to include.
 */
export function HeroBanner({
  imageUrl,
  linkUrl,
}: {
  imageUrl: string | null;
  linkUrl?: string | null;
}) {
  if (!imageUrl) return null;

  const image = (
    // eslint-disable-next-line @next/next/no-img-element -- email HTML, not a Next.js page
    <img
      src={imageUrl}
      alt=""
      width={600}
      style={{ display: "block", width: "100%", maxWidth: 600, height: "auto" }}
    />
  );

  return (
    <tr>
      <td style={{ padding: 0 }}>
        {linkUrl ? <a href={linkUrl}>{image}</a> : image}
      </td>
    </tr>
  );
}
