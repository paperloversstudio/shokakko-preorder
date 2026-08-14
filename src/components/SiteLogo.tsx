import Link from "next/link";
import { Logo } from "@/components/Logo";

// Three fixed presets rather than a free-form size prop, so every page that
// shows the site logo stays in sync instead of each one hand-rolling its
// own <img>/<Logo> conditional and its own arbitrary size:
//   - "homepage": the header logo (also reused, at the same size, on the
//     My Pre-order and Thank-you pages).
//   - "checkout": 4x the homepage preset's original size, checkout only.
//   - "compact": a modest size for the admin header, where a giant logo
//     would crowd the nav.
const IMAGE_SIZE_CLASSES = {
  // Sized to match a typical Shopify-style header logo (per your reference
  // screenshot of shokakko.com.au) — was up to 160px tall, now caps at 56px.
  homepage: "h-10 w-auto max-w-[160px] object-contain sm:h-12 sm:max-w-[200px] lg:h-14 lg:max-w-[240px]",
  checkout: "h-36 w-auto object-contain",
  compact: "h-10 w-auto max-w-[140px] object-contain",
} as const;

// Text-logo fallback (no image uploaded yet) sized to roughly track its
// image counterpart above.
const FALLBACK_TEXT_CLASSES = {
  homepage: "text-2xl sm:text-3xl lg:text-4xl",
  checkout: "text-4xl",
  compact: "text-lg",
} as const;

type LogoSize = keyof typeof IMAGE_SIZE_CLASSES;

export function SiteLogo({
  logoUrl,
  size,
  href = "/",
  linkClassName = "inline-flex",
}: {
  logoUrl: string | null;
  size: LogoSize;
  href?: string;
  linkClassName?: string;
}) {
  return (
    <Link href={href} className={linkClassName}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded logo URL
        <img src={logoUrl} alt="Shokakko Australia" className={IMAGE_SIZE_CLASSES[size]} />
      ) : (
        <Logo className={FALLBACK_TEXT_CLASSES[size]} />
      )}
    </Link>
  );
}
