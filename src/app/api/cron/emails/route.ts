import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { retryEmailLog, sendTrackedEmail } from "@/lib/email/queue";
import { buildReminderEmailData } from "@/lib/email/data/reminder";
import { renderGenericEmail } from "@/lib/email/render";

// This project's first API route (Sprint 6). Called by Vercel Cron (see
// vercel.json) — Vercel sends `Authorization: Bearer ${CRON_SECRET}`
// automatically for a configured cron; anything else is rejected. Two
// responsibilities per run, both idempotent (safe to run more often than
// strictly necessary):
//
// 1. Sweep any EmailLog stuck "pending"/"sending" for >10 minutes (a
//    crash mid-request, or a Resend outage between attempts) and retry
//    them — the closest thing to a real background worker this app has,
//    see src/lib/email/queue.ts's doc comment for why that's enough at
//    this app's scale.
// 2. If the site-wide countdown is within 24 hours of closing and the
//    Reminder Email batch hasn't gone out for it yet, send it to every
//    eligible PreOrder and stamp SiteSettings.reminderBatchSentAt.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const stuck = await db.emailLog.findMany({
    where: { status: { in: ["pending", "sending"] }, createdAt: { lt: tenMinutesAgo } },
    select: { id: true },
  });
  await Promise.all(stuck.map((log) => retryEmailLog(log.id)));

  let reminderSentTo = 0;
  const settings = await db.siteSettings.findUnique({ where: { id: "singleton" } });
  const target = settings?.countdownTargetAt;
  // reminderBatchSentAt is only non-null once a batch has actually gone
  // out for the currently-configured target — the admin Settings action
  // resets it to null whenever countdownTargetAt itself changes, so this
  // alone is enough to guard against a duplicate send (see
  // SiteSettings.reminderBatchSentAt's schema comment).
  const alreadySentForThisTarget = settings?.reminderBatchSentAt != null;
  const msRemaining = target ? target.getTime() - Date.now() : null;
  const isWithin24h = msRemaining !== null && msRemaining > 0 && msRemaining <= 24 * 60 * 60 * 1000;

  if (target && isWithin24h && !alreadySentForThisTarget) {
    const recipients = await db.preOrder.findMany({
      where: { unsubscribedAt: null, notifyReminderBeforeClose: true, editToken: { not: null } },
      select: { id: true, orderNumber: true, customerEmail: true },
    });

    for (const recipient of recipients) {
      const data = await buildReminderEmailData(recipient.orderNumber);
      if (!data) continue;
      const html = await renderGenericEmail(data);
      await sendTrackedEmail({
        to: recipient.customerEmail,
        subject: data.subject,
        html,
        template: "reminder",
        preOrderId: recipient.id,
      });
      reminderSentTo++;
    }

    await db.siteSettings.update({
      where: { id: "singleton" },
      data: { reminderBatchSentAt: new Date() },
    });
  }

  return NextResponse.json({ stuckRetried: stuck.length, reminderSentTo });
}
