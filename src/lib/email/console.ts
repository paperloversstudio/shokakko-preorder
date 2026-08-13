import "server-only";
import type { EmailService } from "./types";

/**
 * Sprint 3's only `EmailService` — logs instead of sending. Nothing in this
 * sprint actually calls `.send()` yet (the Notification Centre's "Generate
 * Email" only renders + saves HTML and prepares recipient data, per the
 * explicit Sprint 3 scope decision); this exists so the interface has a
 * dev-safe default and Sprint 4 has something to swap out, exactly like
 * `STORAGE_DRIVER=local` before `vercel-blob` is configured.
 */
export const consoleEmailService: EmailService = {
  async send(email) {
    console.log(`[email:console] would send "${email.subject}" to ${email.to}`);
    return { id: `console-${Date.now()}` };
  },
};
