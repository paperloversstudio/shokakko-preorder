"use server";

import { db } from "@/lib/db";

/**
 * Called by WishlistContext once a browser is "linked" (post-migration —
 * see submitPreOrder). Possession of a valid token is the only auth this
 * needs, matching the trust model already established for banner/settings
 * URLs and the future /edit/[token] page this token is also for.
 *
 * Silently no-ops on an invalid token or a non-existent product — the
 * client already validated both before calling this; a mismatch here
 * would only happen from a stale/tampered request, not a real user flow.
 *
 * Sprint 3.5: `variantId` (optional) scopes the toggle to one specific
 * variant — two different variants of the same product can each have
 * their own WishlistItem row. Looked up via `findFirst` rather than the
 * old compound-unique `findUnique` since the unique index now includes
 * `variantId`, which is nullable — see `@@unique` on WishlistItem.
 */
export async function toggleWishlistItem(
  token: string,
  productId: string,
  variantId: string | null = null,
): Promise<void> {
  const preOrder = await db.preOrder.findUnique({
    where: { editToken: token },
    select: { id: true },
  });
  if (!preOrder) return;

  const existing = await db.wishlistItem.findFirst({
    where: { preOrderId: preOrder.id, productId, variantId },
  });

  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
    return;
  }

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return;
  // A variant id must actually belong to this product — never trust the
  // client's pairing of the two.
  if (variantId) {
    const variant = await db.productVariant.findFirst({
      where: { id: variantId, productId },
      select: { id: true },
    });
    if (!variant) return;
  }

  await db.wishlistItem.create({ data: { preOrderId: preOrder.id, productId, variantId } });

  // Best-effort Recent Activity entry (Sprint 3.5 Analytics Dashboard) —
  // never blocks the wishlist write itself.
  await db.activityLog
    .create({
      data: { type: "wishlist_added", message: `${product.name} was added to a wishlist`, productId },
    })
    .catch(() => {});
}
