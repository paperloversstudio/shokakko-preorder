import { EmailLayout } from "../components/EmailLayout";
import { Header } from "../components/Header";
import { Greeting } from "../components/Greeting";
import { CTAButton } from "../components/CTAButton";
import { Footer } from "../components/Footer";
import { Countdown } from "./Countdown";
import type { ReminderEmailData } from "../data/reminder";

/**
 * Reminder Email — placeholder layout (no Canva design shared yet). Uses:
 * Header, Greeting, Countdown, CTA Button, Footer. Same modular split as
 * ConfirmationEmail — only this file/Countdown.tsx change when the real
 * design arrives.
 */
export function ReminderEmail({ data }: { data: ReminderEmailData }) {
  return (
    <EmailLayout title={data.subject}>
      <Header logoUrl={data.logoUrl} eventName={data.eventName} />
      <Greeting firstName={data.firstName} />
      <Countdown remainingMs={data.countdownRemainingMs} />
      <CTAButton text={data.ctaText} href={data.ctaUrl} />
      <Footer links={data.footerLinks} />
    </EmailLayout>
  );
}
