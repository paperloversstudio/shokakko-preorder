/** Part 7 — the simplified customer-facing view of OrderHistoryEntry:
 * an entry whose real type is "order_created" (submitPreOrder logs this
 * at submission time) shows as "Order Created," every other entry
 * collapses to "Updated" regardless of its real type (the admin History
 * section, on the pre-order detail page, shows the real type per row
 * instead), and a trailing "Current Version" marker closes the list —
 * matching your example exactly. Chronological, oldest first.
 *
 * Deliberately keyed off the entry's actual `type`, not just "is this
 * the first row" — an order placed before this sprint has no
 * `order_created` row at all (that insert didn't exist yet), so its
 * first-ever logged entry is some other real event and must not be
 * mislabeled "Order Created". */
export function OrderTimeline({
  entries,
}: {
  entries: { id: string; type: string; createdAt: Date }[];
}) {
  const rows = entries.map((entry) => ({
    id: entry.id,
    label: entry.type === "order_created" ? "Order Created" : "Updated",
    date: entry.createdAt,
  }));

  return (
    <div className="rounded-card bg-white p-6 shadow-sm shadow-ink/5">
      <h2 className="font-display font-bold">Order Timeline</h2>
      <ol className="mt-3 flex flex-col">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-3 border-l-2 border-line py-2 pl-4">
            <span className="-ml-[1.4rem] h-2.5 w-2.5 shrink-0 rounded-pill bg-blue" aria-hidden />
            <div>
              <p className="text-sm font-semibold">{row.label}</p>
              <p className="text-xs text-ink-soft">
                {row.date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          </li>
        ))}
        <li className="flex items-center gap-3 border-l-2 border-transparent py-2 pl-4">
          <span className="-ml-[1.4rem] h-2.5 w-2.5 shrink-0 rounded-pill bg-mint ring-2 ring-blue" aria-hidden />
          <p className="text-sm font-bold text-ink">Current Version</p>
        </li>
      </ol>
    </div>
  );
}
