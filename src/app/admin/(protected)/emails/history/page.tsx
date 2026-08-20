import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";

const statusBadge: Record<string, { label: string; tone: "neutral" | "mint" | "blue" }> = {
  draft: { label: "Draft", tone: "neutral" },
  generated: { label: "Generated", tone: "mint" },
  sent: { label: "Sent", tone: "blue" },
};

export default async function EmailHistoryPage() {
  const digests = await db.emailDigest.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/emails"
          className="text-sm font-semibold text-ink-soft hover:text-ink"
        >
          ← Back to Notification Centre
        </Link>
        <h1 className="mt-1 font-display text-2xl font-bold">Email History</h1>
        <p className="text-sm text-ink-soft">
          Every Update Email ever generated. One entry keeps updating each
          time you click &quot;Generate Email&quot; until you click
          &quot;Send Update&quot; — a sent digest becomes immutable history
          and the next Generate starts a fresh row. See{" "}
          <Link href="/admin/emails/logs" className="underline hover:text-ink">
            Email Logs
          </Link>{" "}
          for the individual per-recipient sends behind each one.
        </p>
      </div>

      {digests.length === 0 ? (
        <p className="rounded-card bg-white p-8 text-center text-ink-soft shadow-sm shadow-ink/5">
          Nothing generated yet — head to the Notification Centre to
          prepare your first Update Email.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {digests.map((digest) => {
            const badge = statusBadge[digest.status] ?? statusBadge.draft;
            return (
              <li
                key={digest.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-white p-4 shadow-sm shadow-ink/5"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/emails/history/${digest.id}`}
                      className="font-display font-bold hover:underline"
                    >
                      {digest.subject}
                    </Link>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </div>
                  <p className="text-sm text-ink-soft">
                    {digest.generatedAt
                      ? `Generated ${digest.generatedAt.toLocaleString("en-AU", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}`
                      : "Not generated yet"}
                    {digest.recipientCount !== null &&
                      ` · ${digest.recipientCount} recipient${digest.recipientCount === 1 ? "" : "s"}`}
                  </p>
                </div>
                <Link
                  href={`/admin/emails/history/${digest.id}`}
                  className="text-sm font-semibold text-blue hover:underline"
                >
                  View →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
