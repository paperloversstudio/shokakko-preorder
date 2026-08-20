"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PRODUCT_CARDS_SOURCE_LABELS, PRODUCT_CARDS_SOURCES } from "@/lib/validations/email-template";
import type { SectionFormState } from "./actions";
import type { ProductCardsSectionData } from "@/lib/validations/email-template";

const initialState: SectionFormState = {};

const SOURCE_HINTS: Record<string, string> = {
  manual: "Choose specific products below.",
  new_products: "Automatically shows every product currently marked 🆕 New.",
  price_updates: "Automatically shows products whose price changed since the last Newsletter send.",
  sold_out: "Automatically shows products newly marked Sold Out since the last Newsletter send.",
  order_items:
    "Automatically shows the recipient's own order — their products, variants, quantities, and total. Only meaningful for Confirmation/Retrieve My Pre-order/Reminder.",
};

export function ProductCardsSectionEditor({
  action,
  data,
  productOptions,
}: {
  action: (state: SectionFormState, formData: FormData) => Promise<SectionFormState>;
  data: ProductCardsSectionData;
  productOptions: { id: string; name: string; brand: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [source, setSource] = useState(data.source);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p role="alert" className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral">
          {state.error}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="source" className="text-sm font-semibold text-ink-soft">
          Source
        </label>
        <select
          id="source"
          name="source"
          value={source}
          onChange={(e) => setSource(e.target.value as ProductCardsSectionData["source"])}
          className="rounded-2xl border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/30"
        >
          {PRODUCT_CARDS_SOURCES.map((s) => (
            <option key={s} value={s}>
              {PRODUCT_CARDS_SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
        <p className="text-xs text-ink-soft">{SOURCE_HINTS[source]}</p>
      </div>

      {source === "manual" && (
        <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-xl bg-mint/10 p-2">
          {productOptions.length === 0 && (
            <p className="text-xs text-ink-soft">No active products yet.</p>
          )}
          {productOptions.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="productIds"
                value={p.id}
                defaultChecked={data.productIds.includes(p.id)}
                className="h-4 w-4"
              />
              {p.name} <span className="text-ink-soft">· {p.brand}</span>
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
