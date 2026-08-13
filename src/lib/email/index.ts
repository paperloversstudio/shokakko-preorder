import "server-only";
import type { EmailService } from "./types";
import { consoleEmailService } from "./console";

export type { EmailService, OutboundEmail } from "./types";

/**
 * Driver selector, same shape as src/lib/storage/index.ts's
 * `getStorageAdapter()`. Only "console" exists this sprint — no real
 * provider is hard-coded, per the Sprint 3 scope decision. Sprint 4 adds a
 * case here (e.g. "resend") without touching any call site that already
 * imports `emailService`.
 */
function getEmailService(): EmailService {
  const driver = process.env.EMAIL_DRIVER ?? "console";
  switch (driver) {
    case "console":
    default:
      return consoleEmailService;
  }
}

export const emailService: EmailService = getEmailService();
