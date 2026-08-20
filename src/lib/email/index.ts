import "server-only";
import type { EmailService } from "./types";
import { consoleEmailService } from "./console";
import { resendEmailService } from "./resend";

export type { EmailService, OutboundEmail } from "./types";

/**
 * Driver selector, same shape as src/lib/storage/index.ts's
 * `getStorageAdapter()`. `EMAIL_DRIVER=resend` (Sprint 6) is the first
 * real provider; local dev leaves it unset and keeps using the
 * console-logging no-op. Adding SES/Brevo/SMTP later is the same shape
 * again — one new file implementing `EmailService`, one new case here, no
 * changes anywhere that already imports `emailService`.
 */
function getEmailService(): EmailService {
  const driver = process.env.EMAIL_DRIVER ?? "console";
  switch (driver) {
    case "resend":
      return resendEmailService;
    case "console":
    default:
      return consoleEmailService;
  }
}

export const emailService: EmailService = getEmailService();
