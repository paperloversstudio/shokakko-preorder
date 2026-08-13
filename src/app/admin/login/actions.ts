"use server";

import { redirect } from "next/navigation";
import { setAdminSession, verifyAdminPassword } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!password) {
    return { error: "Enter the admin password." };
  }

  let valid: boolean;
  try {
    valid = verifyAdminPassword(password);
  } catch {
    return {
      error:
        "Admin login isn't configured yet — set ADMIN_PASSWORD and SESSION_SECRET in .env.local.",
    };
  }

  if (!valid) {
    return { error: "Incorrect password." };
  }

  await setAdminSession();
  redirect(next.startsWith("/admin") ? next : "/admin");
}
