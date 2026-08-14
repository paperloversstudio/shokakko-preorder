"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { generateEditToken } from "@/lib/edit-token";
import { getNextOrderNumber } from "@/lib/order-number";
import { PREORDER_TOKEN_COOKIE, PREORDER_TOKEN_TTL_SECONDS } from "@/lib/wishlist";
import { orderFormSchema } from "@/lib/validations/order";
import { flattenZodError } from "@/lib/validations/utils";

export type OrderSubmitState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

// Sprint 3.5 — variantId is optional (null/absent for a plain product).
type CartLine = { productId: string; variantId: string | null; quantity: number };

function parseCart(raw: string | undefined | null): CartLine[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(
      (line): line is { productId: unknown; variantId: unknown; quantity: unknown } =>
        typeof line === "object" && line !== null,
    )
    .filter(
      (line): line is { productId: string; variantId: unknown; quantity: number } =>
        typeof line.productId === "string" && typeof line.quantity === "number",
    )
    .map((line) => ({
      productId: line.productId,
      variantId: typeof line.variantId === "string" ? line.variantId : null,
      quantity: Math.max(0, Math.min(10, Math.floor(line.quantity))),
    }))
    .filter((line) => line.quantity > 0);
}

// Sprint 3.5 — each raw id is either a bare productId (no variant) or
// `${productId}::${variantId}` — same composite-key convention as
// CartContext/WishlistContext.
function parseWishlistIds(
  raw: string | undefined | null,
): { productId: string; variantId: string | null }[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const ids = Array.from(new Set(parsed.filter((id): id is string => typeof id === "string")));
  return ids.map((id) => {
    const separator = id.indexOf("::");
    return separator === -1
      ? { productId: id, variantId: null }
      : { productId: id.slice(0, separator), variantId: id.slice(separator + 2) };
  });
}

export async function submitPreOrder(
  _prevState: OrderSubmitState,
  formData: FormData,
): Promise<OrderSubmitState> {
  const cart = parseCart(formData.get("cartJson")?.toString());
  if (cart.length === 0) {
    return { error: "Please select at least one item before submitting." };
  }

  const billingSame =
    formData.get("billingSameAsShipping")?.toString() === "on";

  const parsed = orderFormSchema.safeParse({
    customerFirstName: formData.get("customerFirstName")?.toString() ?? "",
    customerLastName: formData.get("customerLastName")?.toString() ?? "",
    customerEmail: formData.get("customerEmail")?.toString() ?? "",
    shippingAddress1: formData.get("shippingAddress1")?.toString() ?? "",
    shippingAddress2: formData.get("shippingAddress2")?.toString() ?? "",
    shippingSuburb: formData.get("shippingSuburb")?.toString() ?? "",
    shippingState: formData.get("shippingState")?.toString() ?? "",
    shippingPostcode: formData.get("shippingPostcode")?.toString() ?? "",
    shippingCountry: formData.get("shippingCountry")?.toString() || "Australia",
    shippingMethod: formData.get("shippingMethod")?.toString() ?? "standard",
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
    (!values.billingAddress1 ||
      !values.billingSuburb ||
      !values.billingState ||
      !values.billingPostcode ||
      !values.billingCountry)
  ) {
    return {
      fieldErrors: {
        billingAddress1:
          "Enter a billing address, or tick “same as shipping”.",
      },
    };
  }

  // Re-fetch current product data server-side — never trust client-submitted
  // names/prices, since products may have changed since the page loaded.
  // Sold-out/draft products can't be ordered even if a stale client
  // submits one (the UI already disables their quantity control).
  const productIds = cart.map((line) => line.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds }, status: "active" },
    include: { variants: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const lineItems = cart
    .map((line) => {
      const product = productMap.get(line.productId);
      if (!product) return null;
      // Never trust the client's product/variant pairing — the variant
      // must actually belong to this product, or it's treated as "no
      // variant chosen" rather than silently trusting a mismatched id.
      const variant = line.variantId
        ? product.variants.find((v) => v.id === line.variantId)
        : undefined;
      return {
        productId: product.id,
        variantId: variant?.id ?? null,
        quantity: line.quantity,
        productName: product.name,
        productBrand: product.brand,
        productSku: product.sku,
        variantName: variant?.name ?? null,
        unitPriceCents: variant?.priceCentsOverride ?? product.priceCents,
      };
    })
    .filter((line): line is NonNullable<typeof line> => line !== null);

  if (lineItems.length === 0) {
    return {
      error:
        "The items you selected are no longer available — please refresh the page and try again.",
    };
  }

  const orderNumber = await getNextOrderNumber();
  const editToken = generateEditToken();

  // Migrate the browser's local wishlist (if any) into this order — re-
  // validated against real products, same never-trust-the-client pattern
  // as the cart above. Wishlisted sold-out items are fine to keep; only a
  // genuinely nonexistent ID (stale/tampered client) gets dropped.
  const wishlistEntries = parseWishlistIds(formData.get("wishlistJson")?.toString());
  let wishlistCreate: { productId: string; variantId: string | null }[] = [];
  if (wishlistEntries.length > 0) {
    const wishlistProducts = await db.product.findMany({
      where: { id: { in: wishlistEntries.map((e) => e.productId) } },
      include: { variants: true },
    });
    const wishlistProductMap = new Map(wishlistProducts.map((p) => [p.id, p]));
    wishlistCreate = wishlistEntries
      .map((entry) => {
        const product = wishlistProductMap.get(entry.productId);
        if (!product) return null;
        const variant = entry.variantId
          ? product.variants.find((v) => v.id === entry.variantId)
          : undefined;
        return { productId: product.id, variantId: variant?.id ?? null };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }

  const order = await db.preOrder.create({
    data: {
      orderNumber,
      editToken,
      customerFirstName: values.customerFirstName,
      customerLastName: values.customerLastName,
      customerEmail: values.customerEmail,
      shippingAddress1: values.shippingAddress1,
      shippingAddress2: values.shippingAddress2 || null,
      shippingSuburb: values.shippingSuburb,
      shippingState: values.shippingState,
      shippingPostcode: values.shippingPostcode,
      shippingCountry: values.shippingCountry,
      shippingMethod: values.shippingMethod,
      billingAddress1: billingSame ? null : values.billingAddress1 || null,
      billingAddress2: billingSame ? null : values.billingAddress2 || null,
      billingSuburb: billingSame ? null : values.billingSuburb || null,
      billingState: billingSame ? null : values.billingState || null,
      billingPostcode: billingSame ? null : values.billingPostcode || null,
      billingCountry: billingSame ? null : values.billingCountry || null,
      notes: values.notes || null,
      items: { create: lineItems },
      wishlistItems: { create: wishlistCreate },
    },
  });

  // Best-effort Recent Activity entry (Sprint 3.5 Analytics Dashboard) —
  // never blocks a successful submission.
  const itemCount = lineItems.reduce((sum, item) => sum + item.quantity, 0);
  await db.activityLog
    .create({
      data: {
        type: "order_submitted",
        message: `Order ${orderNumber} submitted — ${itemCount} item${itemCount === 1 ? "" : "s"}`,
      },
    })
    .catch(() => {});

  // Links this browser to the order's wishlist going forward — the root
  // layout reads this on every request from here on (see src/app/layout.tsx
  // and WishlistContext.tsx's local/linked modes).
  const cookieStore = await cookies();
  cookieStore.set(PREORDER_TOKEN_COOKIE, editToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PREORDER_TOKEN_TTL_SECONDS,
  });

  redirect(`/order/${order.orderNumber}`);
}
