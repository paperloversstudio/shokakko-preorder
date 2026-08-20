import "server-only";
import { db } from "@/lib/db";
import { emailService } from "./index";

/**
 * Sprint 6's Email Queue — "Queue → Worker → Resend" as three functions
 * over the `EmailLog` table, not separate infrastructure (no Redis/queue
 * service in this stack, and this app's volume is exhibition-scale, not
 * high-volume). Every real send site in this app should call
 * `sendTrackedEmail()` instead of `emailService.send()` directly — that's
 * what makes every send show up in the admin Email Logs / Notification
 * Dashboard automatically, with no per-call-site logging code.
 */

export type EmailTemplate = "confirmation" | "edit_link" | "reminder" | "digest";

export type QueueEmailInput = {
  to: string;
  subject: string;
  html: string;
  template: EmailTemplate;
  preOrderId?: string;
  digestId?: string;
};

/** The "Queue" step — writes a `pending` row, sends nothing yet. */
export async function enqueueEmail(input: QueueEmailInput) {
  return db.emailLog.create({
    data: {
      to: input.to,
      subject: input.subject,
      html: input.html,
      template: input.template,
      preOrderId: input.preOrderId,
      digestId: input.digestId,
    },
  });
}

/**
 * The "Worker" step — loads a queued row, actually calls the configured
 * `EmailService`, and records the outcome. Safe to call more than once on
 * the same row (that's exactly what a Retry button / the cron sweep do).
 */
export async function processEmailLog(id: string): Promise<void> {
  const log = await db.emailLog.findUnique({ where: { id } });
  if (!log) return;

  await db.emailLog.update({
    where: { id },
    data: { status: "sending", attempts: { increment: 1 } },
  });

  const provider = process.env.EMAIL_DRIVER ?? "console";

  try {
    const result = await emailService.send({
      to: log.to,
      subject: log.subject,
      html: log.html,
    });
    await db.emailLog.update({
      where: { id },
      data: {
        status: "sent",
        provider,
        providerMessageId: result.id,
        errorMessage: null,
        sentAt: new Date(),
      },
    });
  } catch (err) {
    await db.emailLog.update({
      where: { id },
      data: {
        status: "failed",
        provider,
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      },
    });
  }
}

/** Enqueue + process in one call — what every real send site uses. */
export async function sendTrackedEmail(input: QueueEmailInput): Promise<void> {
  const log = await enqueueEmail(input);
  await processEmailLog(log.id);
}

/** Re-runs the worker step on an existing row — the admin Retry button
 * and the cron route's stuck-row sweep both call this directly. */
export async function retryEmailLog(id: string): Promise<void> {
  await processEmailLog(id);
}
