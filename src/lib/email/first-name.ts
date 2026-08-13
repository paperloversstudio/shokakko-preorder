/**
 * `PreOrder.customerName` only ever stores a single "Full name" field (see
 * the checkout form) — there's no separate first/last name split in the
 * schema. Every email Greeting shows first name only, so this pulls it out
 * of whatever the customer typed rather than adding a new field.
 */
export function getFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
}
