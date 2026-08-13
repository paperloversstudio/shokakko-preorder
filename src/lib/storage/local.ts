import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import type { StorageAdapter } from "./types";
import { assertValidImage } from "./types";

// Saves to /public/uploads/products so Next.js serves it as a static file.
// Works great for local dev; does NOT persist on Vercel (the production
// filesystem is ephemeral/read-only) — swap STORAGE_DRIVER to "vercel-blob"
// before deploying. See PROJECT_NOTES.md "Going live".
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");
const PUBLIC_PREFIX = "/uploads/products";

const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const localStorageAdapter: StorageAdapter = {
  async save(file: File): Promise<string> {
    assertValidImage(file);
    await mkdir(UPLOAD_DIR, { recursive: true });

    const ext = extensionByType[file.type] ?? "jpg";
    const filename = `${nanoid()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);

    return `${PUBLIC_PREFIX}/${filename}`;
  },

  async remove(url: string): Promise<void> {
    if (!url.startsWith(PUBLIC_PREFIX)) return;
    const filename = url.slice(PUBLIC_PREFIX.length + 1);
    // Guard against path traversal via a crafted URL.
    if (!filename || filename.includes("..") || filename.includes("/")) return;
    try {
      await unlink(path.join(UPLOAD_DIR, filename));
    } catch {
      // Already gone — fine.
    }
  },
};
