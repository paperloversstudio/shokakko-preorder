"use client";

import type { CatalogVariant } from "./types";

/** Sprint 3.5 — selectable pills for a product's one variant group (e.g.
 * "Design: Cat / Bear / Rabbit"). Deliberately not a `<select>` per the
 * brief — plain buttons + local state, so selecting one updates the
 * page instantly with no navigation and no dropdown. */
export function VariantPills({
  groupName,
  variants,
  selectedId,
  onSelect,
}: {
  groupName: string;
  variants: CatalogVariant[];
  selectedId: string;
  onSelect: (variantId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{groupName}</p>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => {
          const selected = variant.id === selectedId;
          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => onSelect(variant.id)}
              aria-pressed={selected}
              className={`rounded-pill px-4 py-2 text-sm font-semibold transition ${
                selected
                  ? "bg-blue text-white shadow-sm shadow-blue/30"
                  : "border border-line bg-white text-ink hover:bg-mint/30"
              }`}
            >
              {variant.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
