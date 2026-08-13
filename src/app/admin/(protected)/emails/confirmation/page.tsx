import Link from "next/link";
import { db } from "@/lib/db";
import { buildConfirmationEmailData } from "@/lib/email/data/confirmation";
import { renderConfirmationEmail } from "@/lib/email/render";
import { formatCustomerName } from "@/lib/validations/order";

export default async function ConfirmationPreviewPage({
  searchParams,
}: PageProps<"/admin/emails/confirmation">) {
  const { order } = await searchParams;
  const orderNumber = Array.isArray(order) ? order[0] : order;

  const orders = await db.preOrder.findMany({
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true, customerFirstName: true, customerLastName: true },
  });
  const selected = orderNumber ?? orders[0]?.orderNumber;
  const data = selected ? await buildConfirmationEmailData(selected) : null;
  const html = data ? await renderConfirmationEmail(data) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/emails" className="text-sm font-semibold text-ink-soft hover:text-ink">
          ← Back to Notification Centre
        </Link>
        <h1 className="mt-1 font-display text-2xl font-bold">Confirmation Email Preview</h1>
        <p className="text-sm text-ink-soft">
          Placeholder layout — a Canva design hasn&apos;t been shared yet.
          Renders live against a real order, nothing is sent or saved.
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
              {o.orderNumber} — {formatCustomerName(o.customerFirstName, o.customerLastName)}
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
          title="Confirmation Email preview"
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
