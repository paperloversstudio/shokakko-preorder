"use client";

import { useEffect, useRef, useState } from "react";

type Slot =
  | { kind: "existing"; id: string; url: string }
  | { kind: "new"; file: File; previewUrl: string };

/**
 * Multi-photo picker with drag-and-drop reordering. No drag-and-drop
 * library — plain HTML5 drag events, consistent with this project's
 * minimal-dependency approach.
 *
 * Submits two form fields:
 * - `imageOrder`: JSON array of tokens ("existing:<id>" | "new:<n>") in
 *   final display order. Any existing image id NOT present means "delete
 *   it". "new:<n>" refers to the nth file in `newImages`, in submission
 *   order.
 * - `newImages`: the actual staged files, kept in sync with the "new"
 *   slots' order via the effect below (a hidden file input's FileList
 *   can't be driven by a React prop directly — this is the standard
 *   DataTransfer-based workaround).
 */
export function ProductImageManager({
  initialImages,
}: {
  initialImages: { id: string; url: string }[];
}) {
  const [slots, setSlots] = useState<Slot[]>(
    initialImages.map((img) => ({ kind: "existing" as const, id: img.id, url: img.url })),
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const dt = new DataTransfer();
    for (const slot of slots) {
      if (slot.kind === "new") dt.items.add(slot.file);
    }
    if (fileInputRef.current) fileInputRef.current.files = dt.files;
  }, [slots]);

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const newSlots: Slot[] = Array.from(fileList).map((file) => ({
      kind: "new",
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setSlots((prev) => [...prev, ...newSlots]);
  }

  function removeSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  function moveSlot(from: number, to: number) {
    setSlots((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  let newCounter = 0;
  const orderTokens = slots.map((slot) =>
    slot.kind === "existing" ? `existing:${slot.id}` : `new:${newCounter++}`,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {slots.map((slot, index) => (
          <div
            key={slot.kind === "existing" ? slot.id : slot.previewUrl}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null && dragIndex !== index) moveSlot(dragIndex, index);
              setDragIndex(null);
            }}
            className="group relative h-24 w-24 cursor-grab overflow-hidden rounded-2xl border border-line bg-mint/30 active:cursor-grabbing"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local/blob preview + stored URLs */}
            <img
              src={slot.kind === "existing" ? slot.url : slot.previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            {index === 0 && (
              <span className="absolute bottom-1 left-1 rounded-pill bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-ink">
                Primary
              </span>
            )}
            <button
              type="button"
              onClick={() => removeSlot(index)}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-pill bg-white/90 text-xs font-bold text-coral opacity-0 transition group-hover:opacity-100 focus:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
        <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line text-xs text-ink-soft hover:bg-mint/20">
          <span className="text-xl">＋</span>
          Add photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {slots.length > 0 && (
        <p className="text-xs text-ink-soft">
          Drag to reorder — the first photo is used as the thumbnail everywhere.
        </p>
      )}
      <input type="hidden" name="imageOrder" value={JSON.stringify(orderTokens)} />
      <input ref={fileInputRef} type="file" name="newImages" multiple hidden />
    </div>
  );
}
