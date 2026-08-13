"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PRE_ORDER_STATUSES, type PreOrderStatus } from "@/lib/validations/order";

export async function updatePreOrderStatus(
  id: string,
  status: string,
): Promise<void> {
  await requireAdmin();
  if (!PRE_ORDER_STATUSES.includes(status as PreOrderStatus)) return;

  await db.preOrder.update({ where: { id }, data: { status } });
  revalidatePath("/admin/preorders");
  revalidatePath(`/admin/preorders/${id}`);
}
