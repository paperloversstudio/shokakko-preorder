import { EmailLayout } from "../components/EmailLayout";
import { Header } from "../components/Header";
import { HeroBanner } from "../components/HeroBanner";
import { Greeting } from "../components/Greeting";
import { KarenNotes } from "../components/KarenNotes";
import { CollectionCard } from "../components/CollectionCard";
import { ProductCard } from "../components/ProductCard";
import { ResponsiveCardGrid } from "../components/ResponsiveCardGrid";
import { CTAButton } from "../components/CTAButton";
import { Footer } from "../components/Footer";
import { emailBrand, emailFontFamily } from "../components/brand";
import type { UpdateEmailData } from "../data/update";

/** Single-use section heading, local to this template — not part of the
 * shared Design System (Karen's 8 named components don't include it). */
function SectionHeading({ children }: { children: string }) {
  return (
    <tr>
      <td style={{ padding: "20px 32px 4px" }}>
        <div
          style={{
            fontFamily: emailFontFamily,
            fontSize: 15,
            fontWeight: 700,
            color: emailBrand.ink,
          }}
        >
          {children}
        </div>
      </td>
    </tr>
  );
}

/**
 * Update Email — the primary reusable "here's what's new" email, driven by
 * the Notification Centre. Uses: Header, Hero Banner, Greeting, Karen's
 * Notes, Collection Cards, Product Cards (Karen's Picks / New Products /
 * Price Updates — same component, three different data sets), CTA Button,
 * Footer. Every optional section only renders if its `show*` flag is on
 * *and* it actually has content.
 */
export function UpdateEmail({ data }: { data: UpdateEmailData }) {
  const showCollections = data.showCollections && data.collections.length > 0;
  const showRecommended = data.showRecommended && data.recommendedProducts.length > 0;
  const showNewProducts = data.showNewProducts && data.newProducts.length > 0;
  const showPriceUpdates = data.showPriceUpdates && data.priceUpdateProducts.length > 0;

  return (
    <EmailLayout title={data.subject}>
      <Header logoUrl={data.logoUrl} eventName={data.eventName} />
      <HeroBanner imageUrl={data.heroImageUrl} linkUrl={data.heroLinkUrl} />
      <Greeting firstName={data.firstName} />
      {data.showKarenNotes && <KarenNotes html={data.karenNotesHtml} />}

      {showCollections && (
        <>
          <SectionHeading>🎀 Collections</SectionHeading>
          <ResponsiveCardGrid>
            {data.collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </ResponsiveCardGrid>
        </>
      )}

      {showRecommended && (
        <>
          <SectionHeading>✨ Karen&apos;s Picks</SectionHeading>
          <ResponsiveCardGrid>
            {data.recommendedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ResponsiveCardGrid>
        </>
      )}

      {showNewProducts && (
        <>
          <SectionHeading>🆕 New Products</SectionHeading>
          <ResponsiveCardGrid>
            {data.newProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ResponsiveCardGrid>
        </>
      )}

      {showPriceUpdates && (
        <>
          <SectionHeading>💸 Price Updates</SectionHeading>
          <ResponsiveCardGrid>
            {data.priceUpdateProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ResponsiveCardGrid>
        </>
      )}

      <CTAButton text={data.ctaText} href={data.ctaUrl} />
      <Footer links={data.footerLinks} />
    </EmailLayout>
  );
}
