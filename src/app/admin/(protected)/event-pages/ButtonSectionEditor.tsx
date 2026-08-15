"use client";

import { useActionState } from "react";
import { Field, inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { SectionFormState } from "./actions";
import type { ButtonSectionData } from "@/lib/validations/event-page";

const initialState: SectionFormState = {};

export function ButtonSectionEditor({
  action,
  data,
}: {
  action: (state: SectionFormState, formData: FormData) => Promise<SectionFormState>;
  data: ButtonSectionData;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p role="alert" className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral">
          {state.error}
        </p>
      )}
      <Field label="Button text" htmlFor="text" error={state.fieldErrors?.text}>
        <input id="text" name="text" defaultValue={data.text} required className={inputClass} />
      </Field>
      <Field
        label="Button URL"
        htmlFor="url"
        error={state.fieldErrors?.url}
        hint="e.g. /how-to-preorder or a full https:// link"
      >
        <input id="url" name="url" defaultValue={data.url} required className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <input
          type="checkbox"
          name="openInNewTab"
          defaultChecked={data.openInNewTab}
          className="h-4 w-4"
        />
        Open in new tab
      </label>
      <Button type="submit" disabled={pending} size="sm" className="self-start">
        {pending ? "Saving…" : "Save section"}
      </Button>
    </form>
  );
}
