"use client";

import { useActionState } from "react";
import Link from "next/link";
import { generateEmail, sendDigest, type DigestFormState, type SendDigestState } from "./actions";

const initialState: DigestFormState = {};
const initialSendState: SendDigestState = {};

/**
 * Post-Sprint-6 — the Newsletter's structure (Karen's Notes, which
 * sections show, CTA text/URL, picked Collections/Products) now lives in
 * the Email Template Manager (/admin/emails/templates/digest), not a form
 * on this page. This is purely operational: Generate a fresh snapshot of
 * whatever that template currently says, then Send it.
 */
export function NotificationCentreForm({
  status,
  generatedAt,
  recipientCount,
}: {
  status: string;
  generatedAt: string | null;
  recipientCount: number;
}) {
  const [state, formAction, pending] = useActionState(generateEmail, initialState);
  const [sendState, sendAction, sendPending] = useActionState(sendDigest, initialSendState);

  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-2xl bg-lavender/20 px-4 py-3 text-sm text-ink">
        This will be prepared for <strong>{recipientCount}</strong> subscribed
        customer{recipientCount === 1 ? "" : "s"}, using the structure set up in the{" "}
        <Link href="/admin/emails/templates/digest" className="underline hover:text-ink">
          Newsletter template
        </Link>
        .
        {status === "generated" && generatedAt && (
          <>
            {" "}
            Last generated{" "}
            {new Date(generatedAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}.
          </>
        )}
      </p>

      {state.generated && (
        <p className="rounded-2xl bg-mint/40 px-4 py-3 text-sm font-medium text-[#3f6b57]">
          Email generated — see the preview alongside, or the{" "}
          <Link className="underline" href="/admin/emails/history">
            history
          </Link>{" "}
          list.
        </p>
      )}

      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="rounded-pill bg-ink/10 px-4 py-2 text-sm font-semibold text-ink hover:bg-mint/50 disabled:cursor-not-allowed"
        >
          {pending ? "Generating…" : "Generate Email"}
        </button>
      </form>

      {sendState.error && (
        <p role="alert" className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral">
          {sendState.error}
        </p>
      )}
      {sendState.sent && (
        <p className="rounded-2xl bg-mint/40 px-4 py-3 text-sm font-medium text-[#3f6b57]">
          Sent to {sendState.recipientCount} customer{sendState.recipientCount === 1 ? "" : "s"} — see{" "}
          <Link className="underline" href="/admin/emails/logs">
            Email Logs
          </Link>
          .
        </p>
      )}
      <form action={sendAction}>
        <button
          type="submit"
          disabled={sendPending || status !== "generated"}
          title={status !== "generated" ? "Generate the email first, then send it." : undefined}
          className="rounded-pill bg-blue px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue/30 disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-ink-soft disabled:shadow-none"
        >
          {sendPending ? "Sending…" : "Send Update"}
        </button>
      </form>
    </div>
  );
}
