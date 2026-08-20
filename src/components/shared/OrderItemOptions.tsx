import type { OrderItemOption } from "@/lib/order-item-options";

/** Renders the array getOrderItemOptions() returns as one line per
 * option — "{label}: {value}" — used by every app-UI surface that shows
 * an order line's chosen variant (admin order detail, the order
 * confirmation page, the Self-Service Portal). Email templates render
 * the same array inline within their own table markup instead, since
 * email HTML can't import this component. */
export function OrderItemOptions({
  options,
  className = "text-sm font-semibold text-ink-soft",
}: {
  options: OrderItemOption[];
  className?: string;
}) {
  if (options.length === 0) return null;

  return (
    <>
      {options.map((option) => (
        <p key={option.label} className={className}>
          {option.label}: {option.value}
        </p>
      ))}
    </>
  );
}
