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

type CartLine = { productId: string; quantity: number };

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
      (line): line is { productId: unknown; quantity: unknown } =>
        typeof line === "object" && line !== null,
    )
    .filter(
      (line): line is CartLine =>
        typeof line.productId === "string" && typeof line.quantity === "number",
    )
    .map((line) => ({
      productId: line.productId,
      quantity: Math.max(0, Math.min(10, Math.floor(line.quantity))),
    }))
    .filter((line) => line.quantity > 0);
}

function parseWishlistIds(raw: string | undefined | null): string[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return Array.from(new Set(parsed.filter((id): id is string => typeof id === "string")));
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
    customerName: formData.get("customerName")?.toString() ?? "",
    customerEmail: formData.get("customerEmail")?.toString() ?? "",
    shippingAddress: formData.get("shippingAddress")?.toString() ?? "",
    billingSameAsShipping: formData.get("billingSameAsShipping")?.toString(),
    billingAddress: formData.get("billingAddress")?.toString() ?? "",
    notes: formData.get("notes")?.toString() ?? "",
  });

  if (!parsed.success) {
    return { fieldErrors: flattenZodError(parsed.error) };
  }
  const values = parsed.data;

  if (!billingSame && !values.billingAddress) {
    return {
      fieldErrors: {
        billingAddress:
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
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const lineItems = cart
    .map((line) => {
      const product = productMap.get(line.productId);
      if (!product) return null;
      return {
        productId: product.id,
        quantity: line.quantity,
        productName: product.name,
        productBrand: product.brand,
        productSku: product.sku,
        unitPriceCents: product.priceCents,
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
  const wishlistIds = parseWishlistIds(formData.get("wishlistJson")?.toString());
  let wishlistCreate: { productId: string }[] = [];
  if (wishlistIds.length > 0) {
    const wishlistProducts = await db.product.findMany({
      where: { id: { in: wishlistIds } },
      select: { id: true },
    });
    wishlistCreate = wishlistProducts.map((p) => ({ productId: p.id }));
  }

  const order = await db.preOrder.create({
    data: {
      orderNumber,
      editToken,
      customerName: values.customerName,
      customerEmail: values.customerEmail,
      shippingAddress: values.shippingAddress,
      billingAddress: billingSame ? null : values.billingAddress || null,
      notes: values.notes || null,
      items: { create: lineItems },
      wishlistItems: { create: wishlistCreate },
    },
  });

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
