"use client";

import { useActionState } from "react";
import { Field, inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { EDIT_URL_PLACEHOLDER } from "@/lib/validations/email-template";
import type { SectionFormState } from "./actions";
import type { CTAButtonSectionData } from "@/lib/validations/email-template";

const initialState: SectionFormState = {};

export function CTAButtonSectionEditor({
  action,
  data,
  showEditUrlHint,
}: {
  action: (state: SectionFormState, formData: FormData) => Promise<SectionFormState>;
  data: CTAButtonSectionData;
  /** Confirmation/Retrieve/Reminder have a real recipient to link to —
   * the Newsletter doesn't, so this hint only makes sense for the first
   * three kinds. */
  showEditUrlHint: boolean;
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
        hint={
          showEditUrlHint
            ? `Use ${EDIT_URL_PLACEHOLDER} to link to this customer's own edit page, or enter a real URL.`
            : "e.g. / or a full https:// link"
        }
      >
        <input id="url" name="url" defaultValue={data.url} required className={inputClass} />
      </Field>
      <Button type="submit" disabled={pending} size="sm" className="self-start">
        {pending ? "Saving…" : "Save section"}
      </Button>
    </form>
  );
}
