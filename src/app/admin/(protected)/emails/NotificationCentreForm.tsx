"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { PreorderInfoEditor } from "../settings/PreorderInfoEditor";
import { generateEmail, sendDigest, type DigestFormState, type SendDigestState } from "./actions";

type DigestDefaults = {
  subject: string;
  karenNotesHtml: string;
  showKarenNotes: boolean;
  showCollections: boolean;
  showRecommended: boolean;
  showNewProducts: boolean;
  showPriceUpdates: boolean;
  showSoldOut: boolean;
  ctaText: string;
  ctaUrl: string;
  status: string;
  generatedAt: string | null;
};

const initialState: DigestFormState = {};
const initialSendState: SendDigestState = {};

export function NotificationCentreForm({
  draft,
  collectionOptions,
  productOptions,
  newProductCount,
  priceUpdateCount,
  soldOutCount,
  recipientCount,
}: {
  draft: DigestDefaults;
  collectionOptions: { id: string; name: string; selected: boolean }[];
  productOptions: { id: string; name: string; brand: string; selected: boolean }[];
  newProductCount: number;
  priceUpdateCount: number;
  soldOutCount: number;
  recipientCount: number;
}) {
  const [state, formAction, pending] = useActionState(generateEmail, initialState);
  const [sendState, sendAction, sendPending] = useActionState(sendDigest, initialSendState);
  const [showCollections, setShowCollections] = useState(draft.showCollections);
  const [showRecommended, setShowRecommended] = useState(draft.showRecommended);
  const errors = state.fieldErrors ?? {};

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-5">
        {state.error && (
          <p role="alert" className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral">
            {state.error}
          </p>
        )}
        {state.generated && (
          <p className="rounded-2xl bg-mint/40 px-4 py-3 text-sm font-medium text-[#3f6b57]">
            Email generated — see the preview alongside, or the{" "}
            <Link className="underline" href="/admin/emails/history">
              history
            </Link>{" "}
            list.
          </p>
        )}

        <p className="rounded-2xl bg-lavender/20 px-4 py-3 text-sm text-ink">
          This will be prepared for <strong>{recipientCount}</strong> subscribed
          customer{recipientCount === 1 ? "" : "s"}.
          {draft.status === "generated" && draft.generatedAt && (
            <>
              {" "}
              Last generated{" "}
              {new Date(draft.generatedAt).toLocaleString("en-AU", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              .
            </>
          )}
        </p>

        <Field label="Subject" htmlFor="subject" error={errors.subject}>
          <input id="subject" name="subject" defaultValue={draft.subject} className={inputClass} />
        </Field>

        <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
            <input type="checkbox" name="showKarenNotes" defaultChecked={draft.showKarenNotes} className="h-4 w-4" />
            Show Karen&apos;s Notes
          </label>
          <PreorderInfoEditor name="karenNotesHtml" defaultValue={draft.karenNotesHtml} />
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
            <input
              type="checkbox"
              name="showCollections"
              defaultChecked={draft.showCollections}
              onChange={(e) => setShowCollections(e.target.checked)}
              className="h-4 w-4"
            />
            Show Collections
          </label>
          {showCollections && (
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-xl bg-mint/10 p-2">
              {collectionOptions.length === 0 && (
                <p className="text-xs text-ink-soft">
                  No collections yet — add tags to products first.
                </p>
              )}
              {collectionOptions.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="collectionIds"
                    value={c.id}
                    defaultChecked={c.selected}
                    className="h-4 w-4"
                  />
                  {c.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
            <input
              type="checkbox"
              name="showRecommended"
              defaultChecked={draft.showRecommended}
              onChange={(e) => setShowRecommended(e.target.checked)}
              className="h-4 w-4"
            />
            Show Karen&apos;s Picks (Recommended Products)
          </label>
          {showRecommended && (
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-xl bg-mint/10 p-2">
              {productOptions.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="recommendedProductIds"
                    value={p.id}
                    defaultChecked={p.selected}
                    className="h-4 w-4"
                  />
                  {p.name} <span className="text-ink-soft">· {p.brand}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
          <input type="checkbox" name="showNewProducts" defaultChecked={draft.showNewProducts} className="h-4 w-4" />
          Show New Products
          <span className="font-normal text-ink-soft">
            ({newProductCount} currently marked new — manage on each product)
          </span>
        </label>

        <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
          <input type="checkbox" name="showPriceUpdates" defaultChecked={draft.showPriceUpdates} className="h-4 w-4" />
          Show Price Updates
          <span className="font-normal text-ink-soft">
            ({priceUpdateCount} price change{priceUpdateCount === 1 ? "" : "s"} since the last digest)
          </span>
        </label>

        <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
          <input type="checkbox" name="showSoldOut" defaultChecked={draft.showSoldOut} className="h-4 w-4" />
          Show Sold Out
          <span className="font-normal text-ink-soft">
            ({soldOutCount} product{soldOutCount === 1 ? "" : "s"} newly sold out since the last digest)
          </span>
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Button text" htmlFor="ctaText" error={errors.ctaText}>
            <input id="ctaText" name="ctaText" defaultValue={draft.ctaText} className={inputClass} />
          </Field>
          <Field label="Button URL" htmlFor="ctaUrl" error={errors.ctaUrl}>
            <input id="ctaUrl" name="ctaUrl" defaultValue={draft.ctaUrl} className={inputClass} />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Generating…" : "Generate Email"}
          </Button>
        </div>
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
          disabled={sendPending || draft.status !== "generated"}
          title={draft.status !== "generated" ? "Generate the email first, then send it." : undefined}
          className="rounded-pill bg-blue px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue/30 disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-ink-soft disabled:shadow-none"
        >
          {sendPending ? "Sending…" : "Send Update"}
        </button>
      </form>
    </div>
  );
}
