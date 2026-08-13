import "server-only";
import type { StorageAdapter } from "./types";
import { localStorageAdapter } from "./local";
import { vercelBlobStorageAdapter } from "./vercel-blob";

export { InvalidImageError } from "./types";

function getStorageAdapter(): StorageAdapter {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  switch (driver) {
    case "vercel-blob":
      return vercelBlobStorageAdapter;
    case "local":
    default:
      return localStorageAdapter;
  }
}

export const storage = getStorageAdapter();
