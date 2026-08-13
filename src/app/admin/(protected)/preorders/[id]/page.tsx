import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/validations/product";
import { StatusSelect } from "../StatusSelect";

export default async function AdminPreOrderDetailPage({
  params,
}: PageProps<"/admin/preorders/[id]">) {
  const { id } = await params;
  const order = await db.preOrder.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) notFound();

  const totalCents = order.items.reduce(
    (sum, i) => (i.unitPriceCents !== null ? sum + i.unitPriceCents * i.quantity : sum),
    0,
  );
  const hasUnknownPrice = order.items.some((i) => i.unitPriceCents === null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/preorders"
          className="text-sm font-semibold text-ink-soft hover:text-ink"
        >
          ← Back to pre-orders
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold">{order.orderNumber}</h1>
          <StatusSelect orderId={order.id} status={order.status} />
        </div>
        <p className="text-sm text-ink-soft">
          Submitted{" "}
          {order.createdAt.toLocaleString("en-AU", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-card bg-white p-5 shadow-sm shadow-ink/5 lg:col-span-2">
          <h2 className="mb-3 font-display font-bold">Items</h2>
          <ul className="flex flex-col divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{item.productName}</p>
                  <p className="text-sm text-ink-soft">
                    {item.productBrand} · SKU {item.productSku}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">× {item.quantity}</p>
                  <p className="text-sm text-ink-soft">
                    {formatPrice(item.unitPriceCents)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-line pt-3 font-display font-bold">
            <span>Total</span>
            <span>
              {formatPrice(totalCents)}
              {hasUnknownPrice && " + TBC"}
            </span>
          </div>
          {order.notes && (
            <div className="mt-4 rounded-2xl bg-mint/30 p-4">
              <p className="text-sm font-semibold text-ink-soft">Notes</p>
              <p className="whitespace-pre-wrap text-sm">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-card bg-white p-5 shadow-sm shadow-ink/5">
            <h2 className="mb-2 font-display font-bold">Customer</h2>
            <p className="font-semibold">{order.customerName}</p>
            <p className="text-sm text-ink-soft">{order.customerEmail}</p>
          </div>
          <div className="rounded-card bg-white p-5 shadow-sm shadow-ink/5">
            <h2 className="mb-2 font-display font-bold">Shipping address</h2>
            <p className="whitespace-pre-wrap text-sm">{order.shippingAddress}</p>
          </div>
          <div className="rounded-card bg-white p-5 shadow-sm shadow-ink/5">
            <h2 className="mb-2 font-display font-bold">Billing address</h2>
            <p className="whitespace-pre-wrap text-sm">
              {order.billingAddress ?? "Same as shipping"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
