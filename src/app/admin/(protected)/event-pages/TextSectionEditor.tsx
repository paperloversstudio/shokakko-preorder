"use client";

import { useActionState } from "react";
import { Field, inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { EventSectionRichTextEditor } from "./EventSectionRichTextEditor";
import type { SectionFormState } from "./actions";
import type { TextSectionData } from "@/lib/validations/event-page";

const initialState: SectionFormState = {};

export function TextSectionEditor({
  action,
  data,
}: {
  action: (state: SectionFormState, formData: FormData) => Promise<SectionFormState>;
  data: TextSectionData;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p role="alert" className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral">
          {state.error}
        </p>
      )}
      <Field label="Title (optional)" htmlFor="title" error={state.fieldErrors?.title}>
        <input id="title" name="title" defaultValue={data.title ?? ""} className={inputClass} />
      </Field>
      <EventSectionRichTextEditor name="html" defaultValue={data.html} />
      <Button type="submit" disabled={pending} size="sm" className="self-start">
        {pending ? "Saving…" : "Save section"}
      </Button>
    </form>
  );
}
