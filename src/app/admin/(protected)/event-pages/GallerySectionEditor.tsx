"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { compressImageFile } from "@/lib/image-compress";
import type { SectionFormState } from "./actions";
import type { GallerySectionData } from "@/lib/validations/event-page";

type Slot =
  | { kind: "existing"; url: string; caption: string }
  | { kind: "new"; file: File; previewUrl: string; caption: string };

const initialState: SectionFormState = {};

/**
 * Modeled closely on ../products/ProductImageManager.tsx (drag-reorder,
 * DataTransfer-synced hidden file input, `existing:<x>`/`new:<n>` order
 * tokens) — extended with a caption per slot and "existing" keyed by the
 * image's own URL rather than a database row id, since gallery images
 * aren't separate rows (they live inside PageSection.data.images[]).
 */
export function GallerySectionEditor({
  action,
  data,
}: {
  action: (state: SectionFormState, formData: FormData) => Promise<SectionFormState>;
  data: GallerySectionData;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [slots, setSlots] = useState<Slot[]>(
    data.images.map((img) => ({ kind: "existing" as const, url: img.url, caption: img.caption ?? "" })),
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

  async function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    // Recompress before staging — see src/lib/image-compress.ts.
    const compressed = await Promise.all(
      Array.from(fileList).map((file) => compressImageFile(file)),
    );
    const newSlots: Slot[] = compressed.map((file) => ({
      kind: "new",
      file,
      previewUrl: URL.createObjectURL(file),
      caption: "",
    }));
    setSlots((prev) => [...prev, ...newSlots]);
  }

  function updateCaption(index: number, caption: string) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, caption } : s)));
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
    slot.kind === "existing" ? `existing:${slot.url}` : `new:${newCounter++}`,
  );
  const captions = slots.map((slot) => slot.caption);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p role="alert" className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {slots.map((slot, index) => (
          <div
            key={slot.kind === "existing" ? slot.url : slot.previewUrl}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null && dragIndex !== index) moveSlot(dragIndex, index);
              setDragIndex(null);
            }}
            className="group flex w-28 cursor-grab flex-col gap-1 active:cursor-grabbing"
          >
            <div className="relative h-24 w-28 overflow-hidden rounded-2xl border border-line bg-mint/30">
              {/* eslint-disable-next-line @next/next/no-img-element -- local/blob preview + stored URLs */}
              <img
                src={slot.kind === "existing" ? slot.url : slot.previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeSlot(index)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-pill bg-white/90 text-xs font-bold text-coral opacity-0 transition group-hover:opacity-100 focus:opacity-100"
              >
                ✕
              </button>
            </div>
            <input
              value={slot.caption}
              onChange={(e) => updateCaption(index, e.target.value)}
              placeholder="Caption"
              className="w-full rounded-lg border border-line bg-white px-2 py-1 text-xs outline-none focus:border-blue"
            />
          </div>
        ))}
        <label className="flex h-24 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line text-xs text-ink-soft hover:bg-mint/20">
          <span className="text-xl">＋</span>
          Add photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {slots.length > 0 && <p className="text-xs text-ink-soft">Drag a photo to reorder.</p>}
      <input type="hidden" name="imageOrder" value={JSON.stringify(orderTokens)} />
      <input type="hidden" name="captions" value={JSON.stringify(captions)} />
      <input ref={fileInputRef} type="file" name="newImages" multiple hidden />
      <Button type="submit" disabled={pending} size="sm" className="self-start">
        {pending ? "Saving…" : "Save section"}
      </Button>
    </form>
  );
}
