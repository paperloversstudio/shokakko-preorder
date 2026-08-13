import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  createSessionCookieValue,
  isSessionValueValid,
  verifyAdminPassword,
} from "@/lib/session";

export { verifyAdminPassword };

export async function setAdminSession(): Promise<void> {
  const value = await createSessionCookieValue();
  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
}

export async function isAdminLoggedIn(): Promise<boolean> {
  const store = await cookies();
  return isSessionValueValid(store.get(ADMIN_COOKIE_NAME)?.value);
}

/** Call at the top of every admin page/layout and every admin Server Action —
 * defense in depth alongside the proxy.ts middleware gate. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminLoggedIn())) {
    redirect("/admin/login");
  }
}
