"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import type { SectionFormState } from "./actions";
import type { CollectionCardsSectionData } from "@/lib/validations/email-template";

const initialState: SectionFormState = {};

export function CollectionCardsSectionEditor({
  action,
  data,
  collectionOptions,
}: {
  action: (state: SectionFormState, formData: FormData) => Promise<SectionFormState>;
  data: CollectionCardsSectionData;
  collectionOptions: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p role="alert" className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral">
          {state.error}
        </p>
      )}
      {collectionOptions.length === 0 ? (
        <p className="text-sm text-ink-soft">No collections yet — add tags to products first.</p>
      ) : (
        <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-xl bg-mint/10 p-2">
          {collectionOptions.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="collectionIds"
                value={c.id}
                defaultChecked={data.collectionIds.includes(c.id)}
                className="h-4 w-4"
              />
              {c.name}
            </label>
          ))}
        </div>
      )}
      <Button type="submit" disabled={pending} size="sm" className="self-start">
        {pending ? "Saving…" : "Save section"}
      </Button>
    </form>
  );
}
