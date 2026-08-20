import "server-only";
import { Resend } from "resend";
import type { EmailService } from "./types";

/**
 * Sprint 6's first real `EmailService` — same interface as
 * `consoleEmailService`, so nothing that already imports `emailService`
 * from `./index` needs to change. Selected via `EMAIL_DRIVER=resend`.
 *
 * `RESEND_API_KEY` and `EMAIL_FROM` (a verified Resend sender
 * address/domain) must be set in the environment when this driver is
 * selected. Throws on failure so the caller (`processEmailLog` in
 * `./queue.ts`) records it as a `failed` EmailLog row with a real error
 * message, rather than silently losing it.
 *
 * The client is constructed lazily inside `send()`, not at module load —
 * `resend.ts` is imported unconditionally by `./index.ts`'s driver
 * selector regardless of which driver is actually active, and the
 * `Resend` SDK throws immediately if the API key is missing, which would
 * otherwise break every build/dev run that doesn't set RESEND_API_KEY.
 */
export const resendEmailService: EmailService = {
  async send(email) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Shokakko Australia <onboarding@resend.dev>",
      to: email.to,
      subject: email.subject,
      html: email.html,
      replyTo: email.replyTo,
    });

    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      throw new Error("Resend returned no data and no error — unexpected response shape.");
    }

    return { id: data.id };
  },
};
