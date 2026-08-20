"use client";

import { useActionState } from "react";
import { Field, inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { requestEditLink, type RequestEditLinkState } from "./actions";

const initialState: RequestEditLinkState = {};

export function RequestEditLinkForm() {
  const [state, formAction, pending] = useActionState(requestEditLink, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 text-left">
      <Field label="Email address" htmlFor="email" error={state.fieldErrors?.email}>
        <input
          id="email"
          name="email"
          type="email"
          required
          className={inputClass}
          placeholder="you@example.com"
        />
      </Field>
      <Button type="submit" disabled={pending} className="self-center">
        {pending ? "Sending…" : "Send Me My Edit Link"}
      </Button>
      {state.message && (
        <p role="status" className="rounded-2xl bg-mint/40 px-4 py-3 text-center text-sm text-ink">
          {state.message}
        </p>
      )}
    </form>
  );
}
