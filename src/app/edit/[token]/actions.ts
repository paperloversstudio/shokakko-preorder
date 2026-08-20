"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { PREORDER_TOKEN_COOKIE, PREORDER_TOKEN_TTL_SECONDS } from "@/lib/wishlist";
import { orderFormSchema } from "@/lib/validations/order";
import { flattenZodError } from "@/lib/validations/utils";

const MAX_QTY = 10;

export type PortalActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
};

async function getOrderByToken(token: string) {
  return db.preOrder.findUnique({ where: { editToken: token } });
}

async function logHistory(preOrderId: string, type: string, message: string): Promise<void> {
  await db.orderHistoryEntry.create({ data: { preOrderId, type, message } }).catch(() => {});
}

// --- Browser linking -------------------------------------------------------

/** Sprint 5 — called once on mount by LinkBrowserOnMount.tsx. Sets the
 * same cookie submitPreOrder already sets, so this browser's
 * WishlistContext switches into linked mode against THIS order — from
 * here on, tapping ♡ anywhere on the site (no new UI needed) writes to
 * this exact PreOrder's wishlist, satisfying "Add Products" to the
 * wishlist from the portal. */
export async function linkBrowserToOrder(token: string): Promise<void> {
  const order = await getOrderByToken(token);
  if (!order) return;

  const cookieStore = await cookies();
  cookieStore.set(PREORDER_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PREORDER_TOKEN_TTL_SECONDS,
  });
}

// --- Order items -------------------------------------------------------

export async function updateOrderItemQuantity(
  token: string,
  orderItemId: string,
  quantity: number,
): Promise<void> {
  const order = await getOrderByToken(token);
  if (!order) return;

  const item = await db.orderItem.findFirst({ where: { id: orderItemId, preOrderId: order.id } });
  if (!item) return;

  // "Remove Item" is the explicit action for going to zero — the stepper
  // never exposes it, but this is the server-side backstop.
  const clamped = Math.max(1, Math.min(MAX_QTY, Math.floor(quantity)));
  if (clamped === item.quantity) return;

  await db.orderItem.update({ where: { id: item.id }, data: { quantity: clamped } });
  await logHistory(
    order.id,
    "quantity_changed",
    `${item.productName}${item.variantName ? ` (${item.variantName})` : ""} quantity changed to ${clamped}`,
  );
  revalidatePath(`/edit/${token}`);
}

export async function updateOrderItemVariant(
  token: string,
  orderItemId: string,
  newVariantId: string,
): Promise<void> {
  const order = await getOrderByToken(token);
  if (!order) return;

  const item = await db.orderItem.findFirst({ where: { id: orderItemId, preOrderId: order.id } });
  if (!item || !item.productId) return;

  // Never trust the client's variant id — it must actually belong to
  // this item's product, same principle as submitPreOrder.
  const variant = await db.productVariant.findFirst({
    where: { id: newVariantId, productId: item.productId },
  });
  if (!variant) return;

  const product = await db.product.findUnique({ where: { id: item.productId } });
  if (!product) return;

  await db.orderItem.update({
    where: { id: item.id },
    data: {
      variantId: variant.id,
      variantName: variant.name,
      // Price can legitimately change on a variant swap — re-snapshot
      // from the live variant, same never-trust-stale-data principle as
      // submitPreOrder.
      unitPriceCents: variant.priceCentsOverride ?? product.priceCents,
    },
  });
  await logHistory(order.id, "variant_changed", `${item.productName} variant changed to ${variant.name}`);
  revalidatePath(`/edit/${token}`);
}

export async function removeOrderItem(token: string, orderItemId: string): Promise<void> {
  const order = await getOrderByToken(token);
  if (!order) return;

  const item = await db.orderItem.findFirst({ where: { id: orderItemId, preOrderId: order.id } });
  if (!item) return;

  await db.orderItem.delete({ where: { id: item.id } });
  await logHistory(
    order.id,
    "product_removed",
    `${item.productName}${item.variantName ? ` (${item.variantName})` : ""} removed`,
  );
  revalidatePath(`/edit/${token}`);
}

// --- Wishlist -> order ---------------------------------------------------

/** Removing a wishlist item from the portal reuses toggleWishlistItem
 * (components/wishlist/actions.ts) directly — no new action needed, see
 * the plan's "Decisions." Moving one INTO the order is the one genuinely
 * new action: re-validates the product/variant, then increments an
 * existing matching OrderItem or creates a new one (same snapshot shape
 * as submitPreOrder), and drops the WishlistItem. */
export async function moveWishlistItemToOrder(
  token: string,
  productId: string,
  variantId: string | null,
): Promise<void> {
  const order = await getOrderByToken(token);
  if (!order) return;

  const wishlistItem = await db.wishlistItem.findFirst({
    where: { preOrderId: order.id, productId, variantId },
  });
  if (!wishlistItem) return;

  const product = await db.product.findUnique({
    where: { id: productId, status: "active" },
    include: { variants: true },
  });
  if (!product) return;
  const variant = variantId ? product.variants.find((v) => v.id === variantId) : undefined;
  if (variantId && !variant) return; // stale pairing — bail rather than trust it

  const existingOrderItem = await db.orderItem.findFirst({
    where: { preOrderId: order.id, productId, variantId },
  });

  if (existingOrderItem) {
    await db.orderItem.update({
      where: { id: existingOrderItem.id },
      data: { quantity: Math.min(MAX_QTY, existingOrderItem.quantity + 1) },
    });
  } else {
    await db.orderItem.create({
      data: {
        preOrderId: order.id,
        productId: product.id,
        variantId: variant?.id ?? null,
        quantity: 1,
        productName: product.name,
        productBrand: product.brand,
        productSku: product.sku,
        variantName: variant?.name ?? null,
        unitPriceCents: variant?.priceCentsOverride ?? product.priceCents,
      },
    });
  }

  await db.wishlistItem.delete({ where: { id: wishlistItem.id } });
  await logHistory(
    order.id,
    "product_added",
    `${product.name}${variant ? ` (${variant.name})` : ""} moved from wishlist to order`,
  );
  revalidatePath(`/edit/${token}`);
}

// --- Customer info -------------------------------------------------------

export async function updateCustomerInfo(
  token: string,
  _prevState: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const order = await getOrderByToken(token);
  if (!order) return { error: "This link is invalid or has expired." };

  const billingSame = formData.get("billingSameAsShipping")?.toString() === "on";

  const parsed = orderFormSchema
    .omit({ shippingMethod: true })
    .safeParse({
      customerFirstName: formData.get("customerFirstName")?.toString() ?? "",
      customerLastName: formData.get("customerLastName")?.toString() ?? "",
      customerEmail: formData.get("customerEmail")?.toString() ?? "",
      shippingAddress1: formData.get("shippingAddress1")?.toString() ?? "",
      shippingAddress2: formData.get("shippingAddress2")?.toString() ?? "",
      shippingSuburb: formData.get("shippingSuburb")?.toString() ?? "",
      shippingState: formData.get("shippingState")?.toString() ?? "",
      shippingPostcode: formData.get("shippingPostcode")?.toString() ?? "",
      shippingCountry: formData.get("shippingCountry")?.toString() || "Australia",
      billingSameAsShipping: formData.get("billingSameAsShipping")?.toString(),
      billingAddress1: formData.get("billingAddress1")?.toString() ?? "",
      billingAddress2: formData.get("billingAddress2")?.toString() ?? "",
      billingSuburb: formData.get("billingSuburb")?.toString() ?? "",
      billingState: formData.get("billingState")?.toString() ?? "",
      billingPostcode: formData.get("billingPostcode")?.toString() ?? "",
      billingCountry: formData.get("billingCountry")?.toString() ?? "",
      notes: formData.get("notes")?.toString() ?? "",
    });

  if (!parsed.success) {
    return { fieldErrors: flattenZodError(parsed.error) };
  }
  const values = parsed.data;

  if (
    !billingSame &&
    (!values.billingAddress1 || !values.billingSuburb || !values.billingState || !values.billingPostcode || !values.billingCountry)
  ) {
    return {
      fieldErrors: { billingAddress1: "Enter a billing address, or tick “same as shipping”." },
    };
  }

  const newBilling = billingSame
    ? { billingAddress1: null, billingAddress2: null, billingSuburb: null, billingState: null, billingPostcode: null, billingCountry: null }
    : {
        billingAddress1: values.billingAddress1 || null,
        billingAddress2: values.billingAddress2 || null,
        billingSuburb: values.billingSuburb || null,
        billingState: values.billingState || null,
        billingPostcode: values.billingPostcode || null,
        billingCountry: values.billingCountry || null,
      };

  const shippingChanged =
    order.shippingAddress1 !== values.shippingAddress1 ||
    (order.shippingAddress2 ?? "") !== (values.shippingAddress2 || "") ||
    order.shippingSuburb !== values.shippingSuburb ||
    order.shippingState !== values.shippingState ||
    order.shippingPostcode !== values.shippingPostcode ||
    order.shippingCountry !== values.shippingCountry;

  const billingChanged =
    (order.billingAddress1 ?? null) !== newBilling.billingAddress1 ||
    (order.billingAddress2 ?? null) !== newBilling.billingAddress2 ||
    (order.billingSuburb ?? null) !== newBilling.billingSuburb ||
    (order.billingState ?? null) !== newBilling.billingState ||
    (order.billingPostcode ?? null) !== newBilling.billingPostcode ||
    (order.billingCountry ?? null) !== newBilling.billingCountry;

  const infoChanged =
    order.customerFirstName !== values.customerFirstName ||
    order.customerLastName !== values.customerLastName ||
    order.customerEmail !== values.customerEmail ||
    (order.notes ?? "") !== (values.notes || "");

  await db.preOrder.update({
    where: { id: order.id },
    data: {
      customerFirstName: values.customerFirstName,
      customerLastName: values.customerLastName,
      customerEmail: values.customerEmail,
      shippingAddress1: values.shippingAddress1,
      shippingAddress2: values.shippingAddress2 || null,
      shippingSuburb: values.shippingSuburb,
      shippingState: values.shippingState,
      shippingPostcode: values.shippingPostcode,
      shippingCountry: values.shippingCountry,
      notes: values.notes || null,
      ...newBilling,
    },
  });

  // Part 8's list is explicitly "Examples," not exhaustive — logging each
  // category that actually changed, rather than one generic "info
  // updated" row for everything.
  if (shippingChanged) await logHistory(order.id, "shipping_address_updated", "Shipping address updated");
  if (billingChanged) await logHistory(order.id, "billing_address_updated", "Billing address updated");
  if (infoChanged) await logHistory(order.id, "customer_info_updated", "Customer information updated");

  revalidatePath(`/edit/${token}`);
  return { message: "Your preorder has been updated successfully." };
}

// --- Notification preferences ---------------------------------------------

const NOTIFICATION_FIELDS = [
  "notifyNewProducts",
  "notifyPriceUpdates",
  "notifyReminderBeforeClose",
] as const;
type NotificationField = (typeof NOTIFICATION_FIELDS)[number];

const NOTIFICATION_FIELD_LABELS: Record<NotificationField, string> = {
  notifyNewProducts: "Notify me when new products are added",
  notifyPriceUpdates: "Notify me when product prices are updated",
  notifyReminderBeforeClose: "Remind me 24 hours before preorder closes",
};

export async function updateNotificationPreference(
  token: string,
  field: NotificationField,
  value: boolean,
): Promise<void> {
  if (!NOTIFICATION_FIELDS.includes(field)) return;
  const order = await getOrderByToken(token);
  if (!order) return;

  await db.preOrder.update({ where: { id: order.id }, data: { [field]: value } });
  await logHistory(
    order.id,
    "notification_preferences_updated",
    `"${NOTIFICATION_FIELD_LABELS[field]}" turned ${value ? "on" : "off"}`,
  );
  revalidatePath(`/edit/${token}`);
}
