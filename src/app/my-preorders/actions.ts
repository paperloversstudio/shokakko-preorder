"use server";

import { db } from "@/lib/db";
import { sendTrackedEmail } from "@/lib/email/queue";
import { buildEditLinkEmailData } from "@/lib/email/data/edit-link";
import { renderEditLinkEmail } from "@/lib/email/render";
import { requestEditLinkSchema } from "@/lib/validations/edit-link";
import { flattenZodError } from "@/lib/validations/utils";

export type RequestEditLinkState = {
  fieldErrors?: Record<string, string>;
  message?: string;
};

const SAME_MESSAGE_REGARDLESS =
  "If a preorder exists for this email address, a secure edit link has been sent to your email.";

/**
 * Sprint 5, Part 1 — "Send Me My Edit Link." Never reveals whether an
 * email address has an order: a malformed email still shows a normal
 * field error (that's input validation, not an existence leak), but once
 * the address is validly formatted, every outcome — order found, order
 * not found, or the send itself failing — returns the exact same message.
 */
export async function requestEditLink(
  _prevState: RequestEditLinkState,
  formData: FormData,
): Promise<RequestEditLinkState> {
  const parsed = requestEditLinkSchema.safeParse({
    email: formData.get("email")?.toString() ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: flattenZodError(parsed.error) };
  }

  const order = await db.preOrder.findFirst({
    where: { customerEmail: parsed.data.email },
    orderBy: { createdAt: "desc" },
    select: { id: true, customerFirstName: true, customerEmail: true, editToken: true },
  });

  if (order) {
    await sendEditLinkEmail(order).catch(() => {
      // Best-effort — a send failure must never change what the customer
      // sees, or it would leak "yes, an order exists but something broke"
      // versus "no order exists at all."
    });
  }

  return { message: SAME_MESSAGE_REGARDLESS };
}

async function sendEditLinkEmail(order: {
  id: string;
  customerFirstName: string;
  customerEmail: string;
  editToken: string | null;
}): Promise<void> {
  const data = await buildEditLinkEmailData(order);
  if (!data) return; // no editToken — pre-Sprint-2 order, nothing to link to
  const html = await renderEditLinkEmail(data);
  await sendTrackedEmail({
    to: order.customerEmail,
    subject: data.subject,
    html,
    template: "edit_link",
    preOrderId: order.id,
  });
}
