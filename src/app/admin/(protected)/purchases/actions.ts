"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PURCHASE_STATUSES, type PurchaseStatus } from "@/lib/validations/purchase";

/** Same "optimistic <select> + Server Action, no redirect" pattern as
 * updatePreOrderStatus (src/app/admin/(protected)/preorders/actions.ts).
 * Purchase status lives on `Product.purchaseStatus` for a variant-less
 * product, or `ProductVariant.purchaseStatus` once it has variants — see
 * the schema comment on those fields. */
export async function updatePurchaseStatus(
  productId: string,
  variantId: string | null,
  status: string,
): Promise<void> {
  await requireAdmin();
  if (!PURCHASE_STATUSES.includes(status as PurchaseStatus)) return;

  if (variantId) {
    await db.productVariant.update({ where: { id: variantId }, data: { purchaseStatus: status } });
  } else {
    await db.product.update({ where: { id: productId }, data: { purchaseStatus: status } });
  }

  revalidatePath("/admin/purchases");
}
