"use client";

import { useActionState } from "react";
import { Field, inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { updateTemplateSubject, type SubjectFormState } from "./actions";
import type { EmailKind } from "@/lib/validations/email-template";

const initialState: SubjectFormState = {};

export function TemplateSubjectForm({
  kind,
  subject,
  placeholderHint,
}: {
  kind: EmailKind;
  subject: string;
  placeholderHint?: string;
}) {
  const boundAction = updateTemplateSubject.bind(null, kind);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[240px] flex-1">
        <Field label="Subject line" htmlFor="subject" error={state.fieldErrors?.subject} hint={placeholderHint}>
          <input id="subject" name="subject" defaultValue={subject} className={inputClass} />
        </Field>
      </div>
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Saving…" : "Save subject"}
      </Button>
    </form>
  );
}
