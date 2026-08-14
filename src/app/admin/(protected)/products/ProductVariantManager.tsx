"use client";

import { useEffect, useId, useRef, useState } from "react";
import { inputClass } from "@/components/ui/Field";

type VariantRow = {
  key: string; // stable React key — existing variant id, or a generated temp id
  id: string | null; // existing variant id (null = new row)
  name: string;
  sku: string;
  price: string; // dollars string, same convention as the product price field
  existingImageUrl: string | null;
  removeImage: boolean;
  newImageFile: File | null;
  newImagePreviewUrl: string | null;
};

export type InitialVariant = {
  id: string;
  name: string;
  sku: string | null;
  priceDollars: string; // pre-converted by the caller via centsToDollars
  imageUrl: string | null;
};

let tempKeyCounter = 0;
function nextTempKey() {
  tempKeyCounter += 1;
  return `new-${tempKeyCounter}`;
}

function rowFromInitial(v: InitialVariant): VariantRow {
  return {
    key: v.id,
    id: v.id,
    name: v.name,
    sku: v.sku ?? "",
    price: v.priceDollars,
    existingImageUrl: v.imageUrl,
    removeImage: false,
    newImageFile: null,
    newImagePreviewUrl: null,
  };
}

function emptyRow(): VariantRow {
  return {
    key: nextTempKey(),
    id: null,
    name: "",
    sku: "",
    price: "",
    existingImageUrl: null,
    removeImage: false,
    newImageFile: null,
    newImagePreviewUrl: null,
  };
}

/**
 * Sprint 3.5 — one optional variant group per product (e.g. "Design" →
 * Cat/Bear/Rabbit pills). Mirrors ProductImageManager.tsx's established
 * pattern: a hidden JSON field describes each row (including which
 * uploaded file, if any, belongs to it), plus one shared hidden
 * multi-file input kept in sync via the same DataTransfer trick (a
 * FileList can't be driven by a React prop directly).
 *
 * No variant rows render at all until a group name is typed — an empty
 * group name means "this product has no variants."
 */
export function ProductVariantManager({
  initialGroupName,
  initialVariants,
}: {
  initialGroupName: string;
  initialVariants: InitialVariant[];
}) {
  const [groupName, setGroupName] = useState(initialGroupName);
  const [rows, setRows] = useState<VariantRow[]>(initialVariants.map(rowFromInitial));
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupNameId = useId();

  useEffect(() => {
    const dt = new DataTransfer();
    for (const row of rows) {
      if (row.newImageFile) dt.items.add(row.newImageFile);
    }
    if (fileInputRef.current) fileInputRef.current.files = dt.files;
  }, [rows]);

  function updateRow(index: number, patch: Partial<VariantRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function moveRow(from: number, to: number) {
    setRows((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  let newImageCounter = 0;
  const payload = rows.map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    price: row.price,
    removeImage: row.removeImage,
    newImageIndex: row.newImageFile ? newImageCounter++ : null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={groupNameId} className="text-sm font-semibold text-ink-soft">
          Variant group name (optional)
        </label>
        <input
          id={groupNameId}
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="e.g. Design, Colour, Size"
          className={`${inputClass} sm:max-w-xs`}
        />
        <p className="text-xs text-ink-soft">
          Leave blank if this product has no variants. Set a name to show variant
          options below — customers pick one as pills, not a dropdown.
        </p>
      </div>

      {groupName.trim() && (
        <div className="flex flex-col gap-3">
          {rows.map((row, index) => {
            const previewUrl =
              row.newImagePreviewUrl ?? (row.removeImage ? null : row.existingImageUrl);
            return (
              <div
                key={row.key}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null && dragIndex !== index) moveRow(dragIndex, index);
                  setDragIndex(null);
                }}
                className="flex cursor-grab flex-col gap-3 rounded-2xl border border-line bg-white p-3 active:cursor-grabbing sm:flex-row sm:items-start"
              >
                <label className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-mint/30 text-xs text-ink-soft hover:bg-mint/40">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local/blob preview + stored URLs
                    <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl">＋</span>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (!file) return;
                      updateRow(index, {
                        newImageFile: file,
                        newImagePreviewUrl: URL.createObjectURL(file),
                        removeImage: false,
                      });
                      e.target.value = "";
                    }}
                  />
                </label>

                <div className="grid flex-1 gap-2 sm:grid-cols-[1.3fr_1fr_0.8fr]">
                  <input
                    aria-label="Variant name"
                    placeholder="Variant name, e.g. Cat"
                    value={row.name}
                    onChange={(e) => updateRow(index, { name: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    aria-label="Variant SKU (optional)"
                    placeholder="SKU (optional)"
                    value={row.sku}
                    onChange={(e) => updateRow(index, { sku: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    aria-label="Price override (optional)"
                    placeholder="Price override"
                    inputMode="decimal"
                    value={row.price}
                    onChange={(e) => updateRow(index, { price: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="flex shrink-0 flex-row gap-1 sm:flex-col">
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        updateRow(index, {
                          removeImage: true,
                          newImageFile: null,
                          newImagePreviewUrl: null,
                        })
                      }
                      className="rounded-pill px-2 py-1 text-xs font-semibold text-ink-soft hover:bg-mint/30"
                    >
                      Remove photo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    aria-label="Remove variant"
                    className="rounded-pill px-2 py-1 text-xs font-bold text-coral hover:bg-coral/10"
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, emptyRow()])}
            className="self-start rounded-pill border border-dashed border-line px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-mint/20"
          >
            ＋ Add variant
          </button>
          {rows.length > 0 && (
            <p className="text-xs text-ink-soft">Drag a variant row to reorder the pills.</p>
          )}
        </div>
      )}

      <input type="hidden" name="variantGroupName" value={groupName} />
      <input type="hidden" name="variantsJson" value={JSON.stringify(payload)} />
      <input ref={fileInputRef} type="file" name="newVariantImages" multiple hidden />
    </div>
  );
}
