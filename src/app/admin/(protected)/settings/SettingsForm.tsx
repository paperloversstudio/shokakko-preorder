"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { updateSiteSettings, type SettingsFormState } from "./actions";
import { PreorderInfoEditor } from "./PreorderInfoEditor";

type SettingsDefaults = {
  logoUrl: string | null;
  eventName: string;
  eventLocation: string;
  eventInfo: string;
  countdownTargetAt: string;
  preorderInfoHtml: string;
  emailHeroImageUrl: string | null;
  emailHeroLinkUrl: string;
  emailContactUrl: string;
  emailShippingPolicyUrl: string;
  emailWebsiteUrl: string;
  emailInstagramUrl: string;
};

const initialState: SettingsFormState = {};

export function SettingsForm({ defaults }: { defaults: SettingsDefaults }) {
  const [state, formAction, pending] = useActionState(updateSiteSettings, initialState);
  const [preview, setPreview] = useState<string | null>(defaults.logoUrl);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [heroPreview, setHeroPreview] = useState<string | null>(defaults.emailHeroImageUrl);
  const [removeHeroImage, setRemoveHeroImage] = useState(false);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p
          role="alert"
          className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral"
        >
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-2xl bg-mint/40 px-4 py-3 text-sm font-medium text-[#3f6b57]">
          Settings saved.
        </p>
      )}

      <Field
        label="Site logo"
        htmlFor="logo"
        hint="Shown in the homepage header. Falls back to the text logo if none is uploaded."
      >
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-32 items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-mint/30">
            {preview && !removeLogo ? (
              // eslint-disable-next-line @next/next/no-img-element -- local/blob preview URLs
              <img src={preview} alt="" className="h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-ink-soft">No logo</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPreview(URL.createObjectURL(file));
                  setRemoveLogo(false);
                }
              }}
              className="text-sm"
            />
            {defaults.logoUrl && (
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  name="removeLogo"
                  checked={removeLogo}
                  onChange={(e) => setRemoveLogo(e.target.checked)}
                />
                Remove current logo
              </label>
            )}
          </div>
        </div>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Event name"
          htmlFor="eventName"
          error={errors.eventName}
          hint='e.g. "Tokyo Stationery Fair 2026"'
        >
          <input
            id="eventName"
            name="eventName"
            defaultValue={defaults.eventName}
            className={inputClass}
          />
        </Field>
        <Field label="Event location" htmlFor="eventLocation" error={errors.eventLocation}>
          <input
            id="eventLocation"
            name="eventLocation"
            defaultValue={defaults.eventLocation}
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        label="Event info"
        htmlFor="eventInfo"
        error={errors.eventInfo}
        hint="Short free text shown on the homepage hero."
      >
        <textarea
          id="eventInfo"
          name="eventInfo"
          rows={3}
          defaultValue={defaults.eventInfo}
          className={inputClass}
        />
      </Field>

      <Field
        label="Countdown target"
        htmlFor="countdownTargetAt"
        error={errors.countdownTargetAt}
        hint="Optional — shows a live countdown on the homepage. Leave blank to hide it."
      >
        <input
          id="countdownTargetAt"
          name="countdownTargetAt"
          type="datetime-local"
          defaultValue={defaults.countdownTargetAt}
          className={`${inputClass} sm:max-w-xs`}
        />
      </Field>

      <Field
        label="Pre-order information"
        htmlFor="preorderInfoHtml"
        hint="Shown above the pre-order form on the checkout page. Edit anytime without touching code."
      >
        <PreorderInfoEditor name="preorderInfoHtml" defaultValue={defaults.preorderInfoHtml} />
      </Field>

      <div className="border-t border-line pt-5">
        <h2 className="font-display text-lg font-bold">Email settings</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Used by the Update, Confirmation, and Reminder emails (Notification
          Centre) — independent of the website&apos;s own header/footer above.
        </p>
      </div>

      <Field
        label="Email hero banner"
        htmlFor="emailHeroImage"
        hint="The Update Email's one hero image — shown at the top, below the logo. Optional."
      >
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-32 items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-mint/30">
            {heroPreview && !removeHeroImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- local/blob preview URLs
              <img src={heroPreview} alt="" className="h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-ink-soft">No image</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              id="emailHeroImage"
              name="emailHeroImage"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setHeroPreview(URL.createObjectURL(file));
                  setRemoveHeroImage(false);
                }
              }}
              className="text-sm"
            />
            {defaults.emailHeroImageUrl && (
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  name="removeEmailHeroImage"
                  checked={removeHeroImage}
                  onChange={(e) => setRemoveHeroImage(e.target.checked)}
                />
                Remove current hero image
              </label>
            )}
          </div>
        </div>
      </Field>

      <Field
        label="Email hero link (optional)"
        htmlFor="emailHeroLinkUrl"
        error={errors.emailHeroLinkUrl}
        hint="Where the hero image links to, if anywhere."
      >
        <input
          id="emailHeroLinkUrl"
          name="emailHeroLinkUrl"
          defaultValue={defaults.emailHeroLinkUrl}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email footer — Contact Us" htmlFor="emailContactUrl" error={errors.emailContactUrl}>
          <input
            id="emailContactUrl"
            name="emailContactUrl"
            defaultValue={defaults.emailContactUrl}
            className={inputClass}
          />
        </Field>
        <Field
          label="Email footer — Shipping Policy"
          htmlFor="emailShippingPolicyUrl"
          error={errors.emailShippingPolicyUrl}
        >
          <input
            id="emailShippingPolicyUrl"
            name="emailShippingPolicyUrl"
            defaultValue={defaults.emailShippingPolicyUrl}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email footer — Website" htmlFor="emailWebsiteUrl" error={errors.emailWebsiteUrl}>
          <input
            id="emailWebsiteUrl"
            name="emailWebsiteUrl"
            defaultValue={defaults.emailWebsiteUrl}
            className={inputClass}
          />
        </Field>
        <Field label="Email footer — Instagram" htmlFor="emailInstagramUrl" error={errors.emailInstagramUrl}>
          <input
            id="emailInstagramUrl"
            name="emailInstagramUrl"
            defaultValue={defaults.emailInstagramUrl}
            className={inputClass}
          />
        </Field>
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
