import { z } from "zod";

export const PRE_ORDER_STATUSES = [
  "new",
  "confirmed",
  "fulfilled",
  "cancelled",
] as const;
export type PreOrderStatus = (typeof PRE_ORDER_STATUSES)[number];

export const orderFormSchema = z.object({
  customerName: z.string().trim().min(1, "Name is required").max(200),
  customerEmail: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  shippingAddress: z.string().trim().min(1, "Shipping address is required").max(1000),
  billingSameAsShipping: z.string().optional(), // checkbox: "on" or missing
  billingAddress: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;
