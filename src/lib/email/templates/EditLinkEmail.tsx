import { EmailLayout } from "../components/EmailLayout";
import { Header } from "../components/Header";
import { Greeting } from "../components/Greeting";
import { CTAButton } from "../components/CTAButton";
import { Footer } from "../components/Footer";
import type { EditLinkEmailData } from "../data/edit-link";

/**
 * Edit Link Email — Sprint 5. Header, Greeting, CTA Button, Footer, same
 * modular composition as ReminderEmail.tsx (minus Countdown). Sent by
 * requestEditLink (src/app/my-preorders/actions.ts) when a customer asks
 * for their edit link by email — the CTA is the only content, since the
 * whole point of this email is "here's your one link."
 */
export function EditLinkEmail({ data }: { data: EditLinkEmailData }) {
  return (
    <EmailLayout title={data.subject}>
      <Header logoUrl={data.logoUrl} eventName={data.eventName} />
      <Greeting firstName={data.firstName} />
      <CTAButton text={data.ctaText} href={data.ctaUrl} />
      <Footer links={data.footerLinks} />
    </EmailLayout>
  );
}
