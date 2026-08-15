"use client";

import { useActionState, useState } from "react";
import { Field, inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { EventPageFormState } from "./actions";

const initialState: EventPageFormState = {};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Shared title/slug form for both "Add Page" and the Page Builder's
 * header — matches ProductForm/BannerForm's "one form component, a prop
 * distinguishes create vs. edit" shape. */
export function EventPageForm({
  action,
  defaults = { title: "", slug: "" },
  submitLabel = "Save",
  slugLocked = false,
}: {
  action: (state: EventPageFormState, formData: FormData) => Promise<EventPageFormState>;
  defaults?: { title: string; slug: string };
  submitLabel?: string;
  slugLocked?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};
  const [slug, setSlug] = useState(defaults.slug);
  // Once the admin has typed into the slug field directly, stop
  // auto-deriving it from the title — same "auto-suggest until the user
  // takes over" convention as any slug-from-title UI.
  const [slugTouched, setSlugTouched] = useState(slugLocked || Boolean(defaults.slug));

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p role="alert" className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral">
          {state.error}
        </p>
      )}

      <Field label="Title" htmlFor="title" error={errors.title}>
        <input
          id="title"
          name="title"
          defaultValue={defaults.title}
          required
          className={inputClass}
          onChange={(e) => {
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
        />
      </Field>

      <Field
        label="Slug"
        htmlFor="slug"
        error={errors.slug}
        hint={
          slugLocked
            ? "This page is linked from the homepage and footer — its URL can't be changed."
            : `Page will be live at /${slug || "your-slug"}`
        }
      >
        <input
          id="slug"
          name="slug"
          value={slug}
          readOnly={slugLocked}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          required
          className={`${inputClass} ${slugLocked ? "bg-mint/20 text-ink-soft" : ""}`}
        />
      </Field>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
