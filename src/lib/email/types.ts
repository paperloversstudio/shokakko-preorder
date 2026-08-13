export type OutboundEmail = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

/**
 * Swappable email-sending interface — same pattern as `StorageAdapter`
 * (src/lib/storage/types.ts). No provider is implemented this sprint (see
 * `console.ts`); Sprint 4 plugs in a real driver (Resend, Brevo, SES, ...)
 * behind this interface with no changes needed anywhere that already
 * imports `emailService` from `./index`.
 */
export interface EmailService {
  send(email: OutboundEmail): Promise<{ id: string }>;
}
