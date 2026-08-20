/**
 * The one place every surface that shows an order line's chosen
 * variant/option reads from — replaces the hardcoded `"Variant: {name}"`
 * label that used to be duplicated inline at every display site.
 *
 * Deliberately returns an **array**, even though today's schema only
 * ever produces 0 or 1 entries (`OrderItem.variantName`/
 * `variantGroupName` is one flat pair, not a real multi-group table) —
 * a future product with more than one option group (e.g. "Size: A5" AND
 * "Colour: Blue" on the same line) only needs this one function to
 * change, not a rewrite of every call site that already renders the
 * array shape.
 */
export type OrderItemOption = { label: string; value: string };

export function getOrderItemOptions(item: {
  variantName: string | null;
  variantGroupName?: string | null;
}): OrderItemOption[] {
  if (!item.variantName) return [];
  // Falls back to the generic label only for a legacy row that somehow
  // has a variant name snapshot but no group name snapshot (shouldn't
  // happen for anything written after this change) — never a blank label.
  const label = item.variantGroupName?.trim() || "Variant";
  return [{ label, value: item.variantName }];
}
