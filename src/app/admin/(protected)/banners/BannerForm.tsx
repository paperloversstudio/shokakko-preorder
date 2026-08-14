"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { compressImageFile } from "@/lib/image-compress";
import type { BannerFormState } from "./actions";

type BannerDefaults = {
  headline: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  isActive: boolean;
  desktopImageUrl: string | null;
  tabletImageUrl: string | null;
  mobileImageUrl: string | null;
};

const emptyDefaults: BannerDefaults = {
  headline: "",
  description: "",
  buttonText: "",
  buttonUrl: "",
  isActive: true,
  desktopImageUrl: null,
  tabletImageUrl: null,
  mobileImageUrl: null,
};

const initialState: BannerFormState = {};

function ImageSlot({
  name,
  label,
  dimensions,
  currentUrl,
  required,
}: {
  name: string;
  label: string;
  dimensions: string;
  currentUrl: string | null;
  required: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-semibold text-ink-soft">
        {label} <span className="font-normal">({dimensions})</span>
      </label>
      <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-mint/30">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local/blob preview + stored URLs
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-ink-soft">No image</span>
        )}
      </div>
      <input
        ref={inputRef}
        id={name}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        required={required && !currentUrl}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setPreview(URL.createObjectURL(file));
          // Recompress before it ever sits in the form — three full hero
          // images submitted together can otherwise exceed Vercel's
          // platform-level request-body limit even though each one passes
          // this app's own 8MB/file check (see src/lib/image-compress.ts).
          const compressed = await compressImageFile(file);
          const dt = new DataTransfer();
          dt.items.add(compressed);
          if (inputRef.current) inputRef.current.files = dt.files;
        }}
        className="text-xs"
      />
    </div>
  );
}

export function BannerForm({
  action,
  defaults = emptyDefaults,
  submitLabel = "Save banner",
  requireImages = false,
}: {
  action: (state: BannerFormState, formData: FormData) => Promise<BannerFormState>;
  defaults?: BannerDefaults;
  submitLabel?: string;
  requireImages?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
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

      <div className="grid gap-4 sm:grid-cols-3">
        <ImageSlot
          name="desktopImage"
          label="Desktop"
          dimensions="1920×600"
          currentUrl={defaults.desktopImageUrl}
          required={requireImages}
        />
        <ImageSlot
          name="tabletImage"
          label="Tablet"
          dimensions="1600×500"
          currentUrl={defaults.tabletImageUrl}
          required={requireImages}
        />
        <ImageSlot
          name="mobileImage"
          label="Mobile"
          dimensions="1080×1350"
          currentUrl={defaults.mobileImageUrl}
          required={requireImages}
        />
      </div>

      <Field label="Headline" htmlFor="headline" error={errors.headline}>
        <input
          id="headline"
          name="headline"
          defaultValue={defaults.headline}
          required
          className={inputClass}
        />
      </Field>

      <Field label="Description" htmlFor="description" error={errors.description}>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={defaults.description}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Button text"
          htmlFor="buttonText"
          error={errors.buttonText}
          hint="Optional"
        >
          <input
            id="buttonText"
            name="buttonText"
            defaultValue={defaults.buttonText}
            className={inputClass}
          />
        </Field>
        <Field
          label="Button URL"
          htmlFor="buttonUrl"
          error={errors.buttonUrl}
          hint="e.g. /#order-form or a full https:// link"
        >
          <input
            id="buttonUrl"
            name="buttonUrl"
            defaultValue={defaults.buttonUrl}
            className={inputClass}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaults.isActive}
          className="h-4 w-4"
        />
        Active — included in the homepage rotation
      </label>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
