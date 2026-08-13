"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage, InvalidImageError } from "@/lib/storage";

export type CollectionImageState = { error?: string };

/** Uploads (or removes) a Tag's square Collection Card image (Sprint 3) —
 * same storage.save/remove pattern as every other image field in this app
 * (SiteSettings.logoUrl, Product.images, HeroBanner's three images). */
export async function updateTagImage(
  tagId: string,
  _prevState: CollectionImageState,
  formData: FormData,
): Promise<CollectionImageState> {
  await requireAdmin();

  const tag = await db.tag.findUnique({ where: { id: tagId } });
  if (!tag) return { error: "Collection not found." };

  const removeImage = formData.get("removeImage") === "on";
  const file = formData.get("image");

  let imageUrl = tag.imageUrl;
  if (file instanceof File && file.size > 0) {
    let newUrl: string;
    try {
      newUrl = await storage.save(file);
    } catch (err) {
      if (err instanceof InvalidImageError) return { error: err.message };
      throw err;
    }
    if (tag.imageUrl) await storage.remove(tag.imageUrl);
    imageUrl = newUrl;
  } else if (removeImage && tag.imageUrl) {
    await storage.remove(tag.imageUrl);
    imageUrl = null;
  }

  await db.tag.update({ where: { id: tagId }, data: { imageUrl } });

  revalidatePath("/admin/collections");
  revalidatePath("/admin/emails");
  return {};
}
