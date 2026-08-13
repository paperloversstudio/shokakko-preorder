import "server-only";
import { del, put } from "@vercel/blob";
import { nanoid } from "nanoid";
import type { StorageAdapter } from "./types";
import { assertValidImage } from "./types";

// Production image storage. Requires BLOB_READ_WRITE_TOKEN (from the Vercel
// Blob dashboard for this project) in the environment. Enable by setting
// STORAGE_DRIVER=vercel-blob — see PROJECT_NOTES.md "Going live".
export const vercelBlobStorageAdapter: StorageAdapter = {
  async save(file: File): Promise<string> {
    assertValidImage(file);
    const ext = file.type.split("/")[1] ?? "jpg";
    const blob = await put(`products/${nanoid()}.${ext}`, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return blob.url;
  },

  async remove(url: string): Promise<void> {
    try {
      await del(url);
    } catch {
      // Already gone — fine.
    }
  },
};
