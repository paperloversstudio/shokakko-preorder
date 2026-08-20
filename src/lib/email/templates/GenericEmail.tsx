import { Fragment } from "react";
import { EmailLayout } from "../components/EmailLayout";
import { Header } from "../components/Header";
import { HeroBanner } from "../components/HeroBanner";
import { Greeting } from "../components/Greeting";
import { KarenNotes } from "../components/KarenNotes";
import { EmailImage } from "../components/EmailImage";
import { CollectionCard } from "../components/CollectionCard";
import { ProductCard } from "../components/ProductCard";
import { ResponsiveCardGrid } from "../components/ResponsiveCardGrid";
import { CTAButton } from "../components/CTAButton";
import { Footer } from "../components/Footer";
import { emailBrand, emailFontFamily } from "../components/brand";
import { OrderSummary } from "./OrderSummary";
import { Countdown } from "./Countdown";
import type { GenericEmailData } from "../data/generic";

/** Single-use section heading, local to this file — not part of the
 * shared Design System. Only grid-shaped sections (Collections, a
 * marketing Product Cards grid) use one; the order-items renderer
 * carries its own "Order {number}" pill instead. */
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
 * One generic renderer for every email kind, replacing the 4 previously
 * fixed template files. Maps an admin-authored, already-resolved section
 * list onto the shared Design System components — reordering/toggling
 * sections is a database write from the Email Template Manager, never a
 * change to this file. `Header` isn't a section (see the schema's own
 * comment on EmailTemplateSection) — every email always shows it.
 */
export function GenericEmail({ data }: { data: GenericEmailData }) {
  return (
    <EmailLayout title={data.subject}>
      <Header logoUrl={data.logoUrl} eventName={data.eventName} />
      {data.sections.map((section, i) => {
        switch (section.type) {
          case "hero_banner":
            return <HeroBanner key={i} imageUrl={section.imageUrl} linkUrl={section.linkUrl} />;
          case "greeting":
            return <Greeting key={i} firstName={data.firstName} />;
          case "rich_text":
            return <KarenNotes key={i} html={section.html} />;
          case "image":
            return <EmailImage key={i} url={section.url} linkUrl={section.linkUrl} caption={section.caption} />;
          case "collection_cards":
            return (
              <Fragment key={i}>
                <SectionHeading>🎀 Collections</SectionHeading>
                <ResponsiveCardGrid>
                  {section.collections.map((collection) => (
                    <CollectionCard key={collection.id} collection={collection} />
                  ))}
                </ResponsiveCardGrid>
              </Fragment>
            );
          case "product_cards_grid":
            return (
              <Fragment key={i}>
                <SectionHeading>{section.heading}</SectionHeading>
                <ResponsiveCardGrid>
                  {section.products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </ResponsiveCardGrid>
              </Fragment>
            );
          case "product_cards_order":
            return (
              <OrderSummary
                key={i}
                orderNumber={section.order.orderNumber}
                items={section.order.items}
                totalCents={section.order.totalCents}
                hasUnknownPrice={section.order.hasUnknownPrice}
              />
            );
          case "cta_button":
            return <CTAButton key={i} text={section.text} href={section.url} />;
          case "footer":
            return <Footer key={i} links={data.footerLinks} />;
          case "countdown":
            return <Countdown key={i} remainingMs={section.remainingMs} />;
        }
      })}
    </EmailLayout>
  );
}
