import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";

const statusBadge: Record<string, { label: string; tone: "neutral" | "mint" | "blue" }> = {
  draft: { label: "Draft", tone: "neutral" },
  generated: { label: "Generated", tone: "mint" },
  sent: { label: "Sent", tone: "blue" },
};

/** Groups reminder EmailLog rows by the calendar day they were sent —
 * there's no separate "reminder batch" table (see SiteSettings.
 * reminderBatchSentAt's comment), so every reminder send already leaves
 * an EmailLog row and that's enough to reconstruct a history from. */
function groupByDay(logs: { sentAt: Date | null }[]): { day: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const log of logs) {
    if (!log.sentAt) continue;
    const key = log.sentAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => (a.day < b.day ? 1 : -1));
}

/**
 * Sprint 6, Part 10 — at-a-glance health of the whole communication
 * platform: what's gone out today, what's stuck, what's failed, plus a
 * short history of the two batch sends (Daily Digest, Reminder). Daily
 * Digest History reuses the existing /admin/emails/history list (a link
 * + short recap) rather than duplicating it; Reminder History is derived
 * from EmailLog since every reminder send already produces log rows.
 */
export default async function NotificationDashboardPage() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [sentToday, pending, failed, recentDigests, reminderLogs] = await Promise.all([
    db.emailLog.count({ where: { status: "sent", sentAt: { gte: startOfToday } } }),
    db.emailLog.count({ where: { status: "pending" } }),
    db.emailLog.count({ where: { status: "failed" } }),
    db.emailDigest.findMany({
      where: { status: "sent" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.emailLog.findMany({
      where: { template: "reminder", status: "sent" },
      select: { sentAt: true },
    }),
  ]);

  const reminderHistory = groupByDay(reminderLogs);

  const tiles: { label: string; value: number; tone: string }[] = [
    { label: "Emails Sent Today", value: sentToday, tone: "bg-mint/40" },
    { label: "Pending Emails", value: pending, tone: "bg-lavender/30" },
    { label: "Failed Emails", value: failed, tone: "bg-coral/15" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/emails" className="text-sm font-semibold text-ink-soft hover:text-ink">
          ← Back to Notification Centre
        </Link>
        <h1 className="mt-1 font-display text-2xl font-bold">Notification Dashboard</h1>
        <p className="text-sm text-ink-soft">
          At-a-glance health of every email this platform sends. See{" "}
          <Link href="/admin/emails/logs" className="underline hover:text-ink">
            Email Logs
          </Link>{" "}
          for the full per-email list.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className={`rounded-card p-4 shadow-sm shadow-ink/5 ${tile.tone}`}>
            <p className="text-xs font-semibold text-ink-soft">{tile.label}</p>
            <p className="font-display text-2xl font-extrabold">{tile.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-card bg-white p-5 shadow-sm shadow-ink/5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display font-bold">Daily Digest History</h2>
            <Link href="/admin/emails/history" className="text-sm font-semibold text-blue hover:underline">
              View all →
            </Link>
          </div>
          {recentDigests.length === 0 ? (
            <p className="text-sm text-ink-soft">No digests sent yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {recentDigests.map((digest) => {
                const badge = statusBadge[digest.status] ?? statusBadge.draft;
                return (
                  <li key={digest.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/emails/history/${digest.id}`}
                        className="truncate text-sm font-semibold hover:underline"
                      >
                        Newsletter
                      </Link>
                      <p className="text-xs text-ink-soft">
                        {digest.recipientCount ?? 0} recipient{digest.recipientCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-card bg-white p-5 shadow-sm shadow-ink/5">
          <h2 className="mb-3 font-display font-bold">Reminder History</h2>
          {reminderHistory.length === 0 ? (
            <p className="text-sm text-ink-soft">
              No reminder batch sent yet — this fires automatically 24 hours
              before the event countdown closes.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {reminderHistory.map((row) => (
                <li key={row.day} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="font-semibold">{row.day}</span>
                  <span className="text-ink-soft">
                    {row.count} customer{row.count === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
