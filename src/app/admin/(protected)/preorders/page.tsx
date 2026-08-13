import Link from "next/link";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/validations/product";
import { formatCustomerName } from "@/lib/validations/order";
import { StatusSelect } from "./StatusSelect";

export default async function AdminPreOrdersPage() {
  const orders = await db.preOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Pre-orders</h1>

      {orders.length === 0 ? (
        <p className="rounded-card bg-white p-8 text-center text-ink-soft shadow-sm shadow-ink/5">
          No pre-orders submitted yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => {
            const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
            const totalCents = order.items.reduce(
              (sum, i) =>
                i.unitPriceCents !== null
                  ? sum + i.unitPriceCents * i.quantity
                  : sum,
              0,
            );
            const hasUnknownPrice = order.items.some(
              (i) => i.unitPriceCents === null,
            );

            return (
              <li
                key={order.id}
                className="flex flex-wrap items-center gap-4 rounded-card bg-white p-4 shadow-sm shadow-ink/5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/preorders/${order.id}`}
                      className="font-display font-bold hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="text-sm text-ink-soft">
                      {formatCustomerName(order.customerFirstName, order.customerLastName)}
                    </span>
                  </div>
                  <p className="truncate text-sm text-ink-soft">
                    {order.customerEmail} · {itemCount} item
                    {itemCount === 1 ? "" : "s"} ·{" "}
                    {formatPrice(totalCents)}
                    {hasUnknownPrice && " + TBC"} ·{" "}
                    {order.createdAt.toLocaleString("en-AU", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <StatusSelect orderId={order.id} status={order.status} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
