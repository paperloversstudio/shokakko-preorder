import { EmailLayout } from "../components/EmailLayout";
import { Header } from "../components/Header";
import { Greeting } from "../components/Greeting";
import { CTAButton } from "../components/CTAButton";
import { Footer } from "../components/Footer";
import { OrderSummary } from "./OrderSummary";
import type { ConfirmationEmailData } from "../data/confirmation";

/**
 * Confirmation Email — placeholder layout (no Canva design shared yet, per
 * your Sprint 3 answer). Uses: Header, Greeting, Order Summary, CTA
 * Button, Footer. Swapping in your real design later only touches this
 * file and OrderSummary.tsx — `ConfirmationEmailData` (data/confirmation.ts)
 * doesn't change.
 */
export function ConfirmationEmail({ data }: { data: ConfirmationEmailData }) {
  return (
    <EmailLayout title={data.subject}>
      <Header logoUrl={data.logoUrl} eventName={data.eventName} />
      <Greeting firstName={data.firstName} />
      <OrderSummary
        orderNumber={data.orderNumber}
        items={data.items}
        totalCents={data.totalCents}
        hasUnknownPrice={data.hasUnknownPrice}
      />
      <CTAButton text={data.ctaText} href={data.ctaUrl} />
      <Footer links={data.footerLinks} />
    </EmailLayout>
  );
}
