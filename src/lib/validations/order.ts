import { z } from "zod";

export const PRE_ORDER_STATUSES = [
  "new",
  "confirmed",
  "fulfilled",
  "cancelled",
] as const;
export type PreOrderStatus = (typeof PRE_ORDER_STATUSES)[number];

export const SHIPPING_METHODS = ["standard", "express"] as const;
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  standard: "Standard Shipping",
  express: "Express Shipping",
};

export const orderFormSchema = z.object({
  customerFirstName: z.string().trim().min(1, "First name is required").max(100),
  customerLastName: z.string().trim().min(1, "Last name is required").max(100),
  customerEmail: z.string().trim().min(1, "Email is required").email("Enter a valid email"),

  shippingAddress1: z.string().trim().min(1, "Address is required").max(200),
  shippingAddress2: z.string().trim().max(200).optional(),
  shippingSuburb: z.string().trim().min(1, "Suburb is required").max(100),
  shippingState: z.string().trim().min(1, "State / Territory is required").max(100),
  shippingPostcode: z.string().trim().min(1, "Postcode is required").max(20),
  shippingCountry: z.string().trim().min(1, "Country is required").max(100),

  shippingMethod: z.enum(SHIPPING_METHODS).default("standard"),

  billingSameAsShipping: z.string().optional(), // checkbox: "on" or missing
  billingAddress1: z.string().trim().max(200).optional(),
  billingAddress2: z.string().trim().max(200).optional(),
  billingSuburb: z.string().trim().max(100).optional(),
  billingState: z.string().trim().max(100).optional(),
  billingPostcode: z.string().trim().max(20).optional(),
  billingCountry: z.string().trim().max(100).optional(),

  notes: z.string().trim().max(2000).optional(),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;

export function formatCustomerName(firstName: string, lastName: string): string {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

/** Renders a structured address (shipping or billing) as the multi-line
 * text shown on the order confirmation page and in the admin — mirrors how
 * a printed address label is laid out (street lines, then suburb/state/
 * postcode on one line, then country). */
export function formatAddress(parts: {
  address1: string;
  address2?: string | null;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
}): string {
  return [
    parts.address1,
    parts.address2 || null,
    [parts.suburb, parts.state, parts.postcode].filter(Boolean).join(" "),
    parts.country,
  ]
    .filter(Boolean)
    .join("\n");
}
