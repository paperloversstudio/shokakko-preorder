"use client";

import { useTransition } from "react";
import { PRE_ORDER_STATUSES } from "@/lib/validations/order";
import { updatePreOrderStatus } from "./actions";

const statusLabels: Record<string, string> = {
  new: "New",
  confirmed: "Confirmed",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

export function StatusSelect({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          void updatePreOrderStatus(orderId, next);
        });
      }}
      className="rounded-pill border border-line bg-white px-3 py-1.5 text-sm font-semibold outline-none focus:border-blue disabled:opacity-50"
    >
      {PRE_ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>
          {statusLabels[s]}
        </option>
      ))}
    </select>
  );
}
