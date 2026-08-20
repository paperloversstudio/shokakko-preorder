import "server-only";
import { render } from "@react-email/render";
import { ConfirmationEmail } from "./templates/ConfirmationEmail";
import { UpdateEmail } from "./templates/UpdateEmail";
import { ReminderEmail } from "./templates/ReminderEmail";
import { EditLinkEmail } from "./templates/EditLinkEmail";
import type { ConfirmationEmailData } from "./data/confirmation";
import type { UpdateEmailData } from "./data/update";
import type { ReminderEmailData } from "./data/reminder";
import type { EditLinkEmailData } from "./data/edit-link";

export async function renderConfirmationEmail(data: ConfirmationEmailData): Promise<string> {
  return render(ConfirmationEmail({ data }));
}

export async function renderUpdateEmail(data: UpdateEmailData): Promise<string> {
  return render(UpdateEmail({ data }));
}

export async function renderReminderEmail(data: ReminderEmailData): Promise<string> {
  return render(ReminderEmail({ data }));
}

/** Sprint 5 — "Send Me My Edit Link" (src/app/my-preorders/actions.ts). */
export async function renderEditLinkEmail(data: EditLinkEmailData): Promise<string> {
  return render(EditLinkEmail({ data }));
}
