import "server-only";
import { db } from "@/lib/db";

// Sequential, gap-free-on-purpose order numbers (PO1001, PO1002, ...).
// The counter only ever increments — deleting a PreOrder never frees or
// reuses its number. Replaces the old random SHK-YYMMDD-XXXX format.
export async function getNextOrderNumber(): Promise<string> {
  const seq = await db.orderSequence.upsert({
    where: { id: "singleton" },
    update: { lastNumber: { increment: 1 } },
    create: { id: "singleton", lastNumber: 1001 },
  });
  return `PO${seq.lastNumber}`;
}
