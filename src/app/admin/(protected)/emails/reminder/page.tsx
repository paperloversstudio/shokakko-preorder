import Link from "next/link";
import { db } from "@/lib/db";
import { buildReminderEmailData } from "@/lib/email/data/reminder";
import { renderReminderEmail } from "@/lib/email/render";

export default async function ReminderPreviewPage({
  searchParams,
}: PageProps<"/admin/emails/reminder">) {
  const { order } = await searchParams;
  const orderNumber = Array.isArray(order) ? order[0] : order;

  const orders = await db.preOrder.findMany({
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true, customerName: true },
  });
  const selected = orderNumber ?? orders[0]?.orderNumber;
  const data = selected ? await buildReminderEmailData(selected) : null;
  const html = data ? await renderReminderEmail(data) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/emails" className="text-sm font-semibold text-ink-soft hover:text-ink">
          ← Back to Notification Centre
        </Link>
        <h1 className="mt-1 font-display text-2xl font-bold">Reminder Email Preview</h1>
        <p className="text-sm text-ink-soft">
          Placeholder layout — a Canva design hasn&apos;t been shared yet.
          Countdown comes from Settings&apos; countdown target. Renders
          live, nothing is sent or saved.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-2">
        <label htmlFor="order" className="text-sm font-semibold">
          Preview using order:
        </label>
        <select
          id="order"
          name="order"
          defaultValue={selected}
          className="rounded-xl border border-line px-3 py-1.5 text-sm"
        >
          {orders.map((o) => (
            <option key={o.orderNumber} value={o.orderNumber}>
              {o.orderNumber} — {o.customerName}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-pill bg-blue px-4 py-1.5 text-sm font-bold text-white"
        >
          Preview
        </button>
      </form>

      {html ? (
        <iframe
          title="Reminder Email preview"
          srcDoc={html}
          className="h-[800px] w-full max-w-2xl rounded-card border border-line bg-white"
        />
      ) : (
        <p className="rounded-card bg-white p-8 text-center text-ink-soft shadow-sm shadow-ink/5">
          No pre-orders yet to preview against.
        </p>
      )}
    </div>
  );
}
