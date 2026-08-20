"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { PreorderInfoEditor } from "../../settings/PreorderInfoEditor";
import type { SectionFormState } from "./actions";
import type { RichTextSectionData } from "@/lib/validations/email-template";

const initialState: SectionFormState = {};

/** Reuses the same constrained Tiptap editor as Karen's Notes/Pre-order
 * Information (PreorderInfoEditor.tsx) — same "editor's own schema is the
 * sanitizer" reasoning, no separate rich text component needed here. */
export function RichTextSectionEditor({
  action,
  data,
}: {
  action: (state: SectionFormState, formData: FormData) => Promise<SectionFormState>;
  data: RichTextSectionData;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p role="alert" className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral">
          {state.error}
        </p>
      )}
      <PreorderInfoEditor name="html" defaultValue={data.html ?? ""} />
      <Button type="submit" disabled={pending} size="sm" className="self-start">
        {pending ? "Saving…" : "Save section"}
      </Button>
    </form>
  );
}
