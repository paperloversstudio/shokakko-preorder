"use client";

import { useActionState, useState } from "react";
import { Field, inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { SectionFormState } from "./actions";
import type { ImageSectionData } from "@/lib/validations/email-template";

const initialState: SectionFormState = {};

export function ImageSectionEditor({
  action,
  data,
}: {
  action: (state: SectionFormState, formData: FormData) => Promise<SectionFormState>;
  data: ImageSectionData;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [preview, setPreview] = useState<string | null>(data.url);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p role="alert" className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral">
          {state.error}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="image" className="text-sm font-semibold text-ink-soft">
          Image
        </label>
        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-line bg-mint/30">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local/blob preview + stored URL
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-ink-soft">No image</span>
          )}
        </div>
        <input
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          required={!data.url}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPreview(URL.createObjectURL(file));
          }}
          className="text-xs"
        />
      </div>
      <Field label="Caption (optional)" htmlFor="caption">
        <input id="caption" name="caption" defaultValue={data.caption ?? ""} className={inputClass} />
      </Field>
      <Field label="Link (optional)" htmlFor="linkUrl">
        <input id="linkUrl" name="linkUrl" defaultValue={data.linkUrl ?? ""} className={inputClass} />
      </Field>
      <Button type="submit" disabled={pending} size="sm" className="self-start">
        {pending ? "Saving…" : "Save section"}
      </Button>
    </form>
  );
}
