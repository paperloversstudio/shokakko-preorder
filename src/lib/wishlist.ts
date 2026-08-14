import "server-only";
import { db } from "@/lib/db";

// Same cookie both submitPreOrder (sets it) and the root layout (reads it)
// use to link a browser to its post-migration, DB-backed wishlist. A full
// year, not a session cookie — the brief requires this to "survive browser
// restart" the same way the pre-migration localStorage wishlist does.
export const PREORDER_TOKEN_COOKIE = "shokakko_preorder_token";
export const PREORDER_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 365;

/**
 * Resolves a `shokakko_preorder_token` cookie value to that order's
 * currently-saved wishlist product IDs.
 *
 * Returns `null` specifically when the token doesn't match any `PreOrder`
 * (stale/invalid cookie) — the caller (the root layout) should treat that
 * as "not linked" and fall back to the browser's local wishlist, rather
 * than silently treating an invalid token as "linked with zero items,"
 * which would quietly stop persisting anything.
 *
 * Returns `[]` for a validly-linked order that just has nothing saved yet.
 *
 * Sprint 3.5: each id is the bare `productId`, or `${productId}::${variantId}`
 * for a wishlisted variant — same composite-key convention
 * `WishlistContext`/`CartContext` use everywhere else.
 */
export async function getLinkedWishlist(token: string): Promise<string[] | null> {
  const preOrder = await db.preOrder.findUnique({
    where: { editToken: token },
    select: { wishlistItems: { select: { productId: true, variantId: true } } },
  });
  if (!preOrder) return null;
  return preOrder.wishlistItems.map((item) =>
    item.variantId ? `${item.productId}::${item.variantId}` : item.productId,
  );
}
