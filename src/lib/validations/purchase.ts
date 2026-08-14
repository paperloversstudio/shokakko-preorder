/** Purchase Dashboard checklist status (Sprint 3.5) — stored directly on
 * `Product.purchaseStatus` (no variants) or `ProductVariant.purchaseStatus`
 * (has variants), same plain-string pattern as `Product.status`. */
export const PURCHASE_STATUSES = [
  "not_purchased",
  "partially_purchased",
  "purchased",
] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  not_purchased: "Not Purchased",
  partially_purchased: "Partially Purchased",
  purchased: "Purchased",
};
