import { formatPrice } from "@/lib/validations/product";
import { emailBrand, emailFontFamily } from "./brand";

/** Mirrors the Sprint 2 wishlist-drawer status convention (🟢/🟡/🔴) — see
 * that component's own comment for why it's a small local copy rather than
 * a shared import: it's a client component keyed to `CatalogProduct`,
 * this one runs server-side against plain email data-builder props. */
function getStatusEmoji(status: "active" | "draft" | "sold_out", priceCents: number | null) {
  if (status === "sold_out") return "🔴";
  if (priceCents === null) return "🟡";
  return "🟢";
}

export type ProductCardData = {
  id: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  priceCents: number | null;
  previousPriceCents?: number | null; // Price Updates section only
  status: "active" | "draft" | "sold_out";
  href: string;
};

/**
 * Email Design System — Product Card. Square photo, name, brand, price (or
 * "Price Coming Soon"), Product Status. The image links directly to the
 * Product Details page. The *same* component (not a copy) backs Karen's
 * Picks, New Products, and Price Updates — only the data passed in
 * differs, per your "no duplicate layouts" instruction.
 */
export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <a href={product.href} style={{ textDecoration: "none", color: "inherit" }}>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
        <tbody>
          <tr>
            <td>
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- email HTML, not a Next.js page
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  width={160}
                  height={160}
                  style={{
                    display: "block",
                    width: "100%",
                    aspectRatio: "1 / 1",
                    objectFit: "cover",
                    borderRadius: 16,
                    backgroundColor: emailBrand.mint,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: 16,
                    backgroundColor: emailBrand.mint,
                  }}
                />
              )}
            </td>
          </tr>
          <tr>
            <td style={{ paddingTop: 10, fontFamily: emailFontFamily }}>
              <div style={{ fontSize: 11, color: emailBrand.inkSoft, textTransform: "uppercase" }}>
                {product.brand}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: emailBrand.ink,
                  marginTop: 2,
                  lineHeight: 1.3,
                }}
              >
                {product.name}
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                {product.previousPriceCents != null &&
                  product.previousPriceCents !== product.priceCents && (
                    <span
                      style={{
                        color: emailBrand.inkSoft,
                        textDecoration: "line-through",
                        marginRight: 6,
                      }}
                    >
                      {formatPrice(product.previousPriceCents)}
                    </span>
                  )}
                <span style={{ color: emailBrand.accent, fontWeight: 700 }}>
                  {formatPrice(product.priceCents)}
                </span>
              </div>
              <div style={{ fontSize: 12, marginTop: 2 }}>
                <span aria-hidden>{getStatusEmoji(product.status, product.priceCents)}</span>{" "}
                {product.status === "sold_out"
                  ? "Sold Out"
                  : product.priceCents === null
                    ? "Price Coming Soon"
                    : "Available"}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </a>
  );
}
