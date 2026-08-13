/**
 * Email Design System — Hero Banner.
 * One configurable image (`SiteSettings.emailHeroImageUrl`/
 * `emailHeroLinkUrl`, admin-editable) — distinct from the homepage's
 * rotating multi-banner `HeroBanner` model, since the email only ever
 * shows one. Templates that don't use it (Confirmation, Reminder) simply
 * don't render this component — renders nothing itself if no image is
 * configured, so it's always safe to include.
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
