/** Sprint 5 — the `OrderHistoryEntry.type` open set. Feeds the admin
 * Order History section (full label per row) and, collapsed, the
 * customer-facing Order Timeline (every row after the first just reads
 * "Updated") — see src/app/edit/[token]/OrderTimeline.tsx. */
export const ORDER_HISTORY_TYPES = [
  "order_created",
  "product_added",
  "product_removed",
  "variant_changed",
  "quantity_changed",
  "shipping_address_updated",
  "billing_address_updated",
  "customer_info_updated",
  "notification_preferences_updated",
] as const;
export type OrderHistoryType = (typeof ORDER_HISTORY_TYPES)[number];

export const ORDER_HISTORY_TYPE_LABELS: Record<OrderHistoryType, string> = {
  order_created: "Order Created",
  product_added: "Product Added",
  product_removed: "Product Removed",
  variant_changed: "Variant Changed",
  quantity_changed: "Quantity Changed",
  shipping_address_updated: "Shipping Address Updated",
  billing_address_updated: "Billing Address Updated",
  customer_info_updated: "Customer Info Updated",
  notification_preferences_updated: "Notification Preferences Updated",
};
