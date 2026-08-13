import { emailBrand, emailFontFamily } from "./brand";

export type CollectionCardData = {
  id: string;
  name: string;
  imageUrl: string | null;
  href: string;
};

/**
 * Email Design System — Collection Card. Square image + collection name;
 * the image links to `/collections/[id]`. Multiple cards flow through the
 * same `ResponsiveCardGrid` primitive `ProductCard` uses, so collections
 * and products share one grid implementation.
 */
export function CollectionCard({ collection }: { collection: CollectionCardData }) {
  return (
    <a href={collection.href} style={{ textDecoration: "none", color: "inherit" }}>
      {collection.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- email HTML, not a Next.js page
        <img
          src={collection.imageUrl}
          alt={collection.name}
          width={160}
          height={160}
          style={{
            display: "block",
            width: "100%",
            aspectRatio: "1 / 1",
            objectFit: "cover",
            borderRadius: 16,
            backgroundColor: emailBrand.lavender,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            borderRadius: 16,
            backgroundColor: emailBrand.lavender,
          }}
        />
      )}
      <div
        style={{
          fontFamily: emailFontFamily,
          fontSize: 13,
          fontWeight: 600,
          color: emailBrand.ink,
          textAlign: "center",
          marginTop: 8,
        }}
      >
        {collection.name}
      </div>
    </a>
  );
}
