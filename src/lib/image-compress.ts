// Vercel's serverless functions cap request bodies at ~4.5MB — a hard
// platform limit that can't be raised from application code (next.config.ts's
// experimental.serverActions.bodySizeLimit only governs what Next.js itself
// will accept below that ceiling, not Vercel's own infrastructure). This app
// validates individual photos up to 8MB (src/lib/storage/types.ts), and a
// hero banner submits three of them in one request, or a product several —
// easily exceeding the platform limit even though every individual file
// passes validation. When that happens, Vercel rejects the request before
// Next.js ever runs, so the browser shows a raw network error instead of
// anything in-app.
//
// Fix: re-encode every uploaded image through a canvas the moment it's
// selected, before it's ever added to a form — shrinks file size (not
// necessarily pixel dimensions) via JPEG recompression. A typical
// unoptimized camera photo drops from several MB to a few hundred KB at
// quality 0.85, comfortably clearing the platform limit even with several
// images in one submission.
//
// Trade-off, accepted on purpose: everything is re-encoded as JPEG, which
// flattens transparency. Fine for the photos this covers (product/variant/
// banner photography, never transparent PNGs in practice) — deliberately
// NOT applied to the site logo or collection images, which are single
// uploads well under the limit on their own and more likely to need
// transparency preserved.
export async function compressImageFile(
  file: File,
  { maxDimension = 2400, quality = 0.85 }: { maxDimension?: number; quality?: number } = {},
): Promise<File> {
  // GIFs can be animated — recompressing through canvas would flatten to a
  // single frame, so pass those through untouched.
  if (file.type === "image/gif") return file;
  if (typeof createImageBitmap === "undefined" || typeof document === "undefined") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    // Compression didn't actually help (e.g. an already-tiny file) — keep
    // the original rather than swap in a same-size-or-larger copy.
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    // Any failure (corrupt file, browser quirk) falls back to the original
    // — server-side validation (assertValidImage) is still the real gate.
    return file;
  }
}
