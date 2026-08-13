"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function DeleteButton({
  action,
  confirmMessage,
  children,
  className = "",
  redirectTo,
}: {
  action: () => Promise<void>;
  confirmMessage: string;
  children: React.ReactNode;
  className?: string;
  /** Navigate here after a successful delete (e.g. from a detail page back to a list). */
  redirectTo?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirmMessage)) {
          startTransition(async () => {
            await action();
            if (redirectTo) router.push(redirectTo);
          });
        }
      }}
      className={`font-semibold text-coral hover:underline disabled:opacity-50 ${className}`}
    >
      {pending ? "Deleting…" : children}
    </button>
  );
}
