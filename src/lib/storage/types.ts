export interface StorageAdapter {
  /** Save an uploaded image file and return its public URL. */
  save(file: File): Promise<string>;
  /** Best-effort delete of a previously saved file. Never throws on a missing file. */
  remove(url: string): Promise<void>;
}

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

export class InvalidImageError extends Error {}

export function assertValidImage(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new InvalidImageError(
      "Please upload a JPG, PNG, WEBP, or GIF photo.",
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new InvalidImageError("Photo is too large — please keep it under 8MB.");
  }
}
