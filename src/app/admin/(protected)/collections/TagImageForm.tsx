"use client";

import { useActionState, useState } from "react";
import { updateTagImage, type CollectionImageState } from "./actions";

const initialState: CollectionImageState = {};

export function TagImageForm({ tagId, imageUrl }: { tagId: string; imageUrl: string | null }) {
  const boundAction = updateTagImage.bind(null, tagId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [preview, setPreview] = useState<string | null>(imageUrl);
  const [removeImage, setRemoveImage] = useState(false);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-line bg-lavender/20">
        {preview && !removeImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- local/blob preview URLs
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg">🎀</span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <input
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setPreview(URL.createObjectURL(file));
              setRemoveImage(false);
            }
          }}
          className="text-xs"
        />
        {imageUrl && (
          <label className="flex items-center gap-1.5 text-xs text-ink-soft">
            <input
              type="checkbox"
              name="removeImage"
              checked={removeImage}
              onChange={(e) => setRemoveImage(e.target.checked)}
            />
            Remove image
          </label>
        )}
        {state.error && <p className="text-xs font-medium text-coral">{state.error}</p>}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="ml-auto rounded-pill bg-mint px-3 py-1.5 text-xs font-bold text-[#3f6b57]"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
