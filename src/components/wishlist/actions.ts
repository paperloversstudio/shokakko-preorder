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
 */
export async function toggleWishlistItem(
  token: string,
  productId: string,
): Promise<void> {
  const preOrder = await db.preOrder.findUnique({
    where: { editToken: token },
    select: { id: true },
  });
  if (!preOrder) return;

  const existing = await db.wishlistItem.findUnique({
    where: { preOrderId_productId: { preOrderId: preOrder.id, productId } },
  });

  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
  } else {
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) return;
    await db.wishlistItem.create({ data: { preOrderId: preOrder.id, productId } });
  }
}
