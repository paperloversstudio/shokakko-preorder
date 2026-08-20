import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { retryEmailLog } from "../actions";

const statusBadge: Record<string, { label: string; tone: "neutral" | "lavender" | "mint" | "coral" }> = {
  pending: { label: "Pending", tone: "neutral" },
  sending: { label: "Sending", tone: "lavender" },
  sent: { label: "Sent", tone: "mint" },
  failed: { label: "Failed", tone: "coral" },
};

const templateLabel: Record<string, string> = {
  confirmation: "Confirmation",
  edit_link: "Edit Link",
  reminder: "Reminder",
  digest: "Digest",
};

/**
 * Sprint 6, Part 9 — every attempted send (any status) shows up here
 * automatically, since every real send site goes through
 * src/lib/email/queue.ts's sendTrackedEmail. Newest first, capped at the
 * most recent 200 rows — matches this app's exhibition-scale volume, same
 * "no pagination needed yet" precedent as the other admin feeds.
 */
export default async function EmailLogsPage() {
  const logs = await db.emailLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/emails" className="text-sm font-semibold text-ink-soft hover:text-ink">
          ← Back to Notification Centre
        </Link>
        <h1 className="mt-1 font-display text-2xl font-bold">Email Logs</h1>
        <p className="text-sm text-ink-soft">
          Every email this platform has attempted to send — confirmations,
          edit-link requests, reminders, and digest sends alike. Retry a
          failed row once the underlying issue (a bad address, a provider
          outage) is fixed.
        </p>
      </div>

      {logs.length === 0 ? (
        <p className="rounded-card bg-white p-8 text-center text-ink-soft shadow-sm shadow-ink/5">
          No emails sent yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card bg-white shadow-sm shadow-ink/5">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Error</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const badge = statusBadge[log.status] ?? statusBadge.pending;
                return (
                  <tr key={log.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium">{log.to}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {templateLabel[log.template] ?? log.template}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {log.sentAt
                        ? log.sentAt.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{log.provider ?? "—"}</td>
                    <td className="max-w-[240px] truncate px-4 py-3 text-ink-soft" title={log.errorMessage ?? undefined}>
                      {log.errorMessage ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {log.status === "failed" && (
                        <form action={retryEmailLog.bind(null, log.id)}>
                          <button
                            type="submit"
                            className="rounded-pill bg-ink/10 px-3 py-1 text-xs font-semibold text-ink hover:bg-mint/50"
                          >
                            Retry
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
