"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage, InvalidImageError } from "@/lib/storage";
import { bannerFormSchema, MAX_HERO_BANNERS } from "@/lib/validations/banner";
import { flattenZodError } from "@/lib/validations/utils";

export type BannerFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseBannerForm(formData: FormData) {
  return bannerFormSchema.safeParse({
    headline: formData.get("headline")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    buttonText: formData.get("buttonText")?.toString() ?? "",
    buttonUrl: formData.get("buttonUrl")?.toString() ?? "",
    isActive: formData.get("isActive")?.toString(),
  });
}

async function uploadIfPresent(formData: FormData, field: string): Promise<string | null> {
  const file = formData.get(field);
  if (file instanceof File && file.size > 0) {
    return storage.save(file);
  }
  return null;
}

export async function createBanner(
  _prevState: BannerFormState,
  formData: FormData,
): Promise<BannerFormState> {
  await requireAdmin();

  const existingCount = await db.heroBanner.count();
  if (existingCount >= MAX_HERO_BANNERS) {
    return { error: `You can only have up to ${MAX_HERO_BANNERS} hero banners. Delete one first.` };
  }

  const parsed = parseBannerForm(formData);
  if (!parsed.success) return { fieldErrors: flattenZodError(parsed.error) };
  const values = parsed.data;

  let desktopUrl: string | null;
  let tabletUrl: string | null;
  let mobileUrl: string | null;
  try {
    [desktopUrl, tabletUrl, mobileUrl] = await Promise.all([
      uploadIfPresent(formData, "desktopImage"),
      uploadIfPresent(formData, "tabletImage"),
      uploadIfPresent(formData, "mobileImage"),
    ]);
  } catch (err) {
    if (err instanceof InvalidImageError) return { error: err.message };
    throw err;
  }

  if (!desktopUrl || !tabletUrl || !mobileUrl) {
    return {
      error:
        "Please upload all three images — desktop (1920×600), tablet (1600×500), and mobile (1080×1350).",
    };
  }

  const maxSortOrder = await db.heroBanner.aggregate({ _max: { sortOrder: true } });

  await db.heroBanner.create({
    data: {
      headline: values.headline,
      description: values.description || null,
      buttonText: values.buttonText || null,
      buttonUrl: values.buttonUrl || null,
      desktopImageUrl: desktopUrl,
      tabletImageUrl: tabletUrl,
      mobileImageUrl: mobileUrl,
      isActive: values.isActive === "on",
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
    },
  });

  revalidatePath("/admin/banners");
  revalidatePath("/");
  redirect("/admin/banners");
}

export async function updateBanner(
  id: string,
  _prevState: BannerFormState,
  formData: FormData,
): Promise<BannerFormState> {
  await requireAdmin();

  const parsed = parseBannerForm(formData);
  if (!parsed.success) return { fieldErrors: flattenZodError(parsed.error) };
  const values = parsed.data;

  const existing = await db.heroBanner.findUnique({ where: { id } });
  if (!existing) return { error: "Banner not found." };

  let newDesktop: string | null;
  let newTablet: string | null;
  let newMobile: string | null;
  try {
    [newDesktop, newTablet, newMobile] = await Promise.all([
      uploadIfPresent(formData, "desktopImage"),
      uploadIfPresent(formData, "tabletImage"),
      uploadIfPresent(formData, "mobileImage"),
    ]);
  } catch (err) {
    if (err instanceof InvalidImageError) return { error: err.message };
    throw err;
  }

  await db.heroBanner.update({
    where: { id },
    data: {
      headline: values.headline,
      description: values.description || null,
      buttonText: values.buttonText || null,
      buttonUrl: values.buttonUrl || null,
      desktopImageUrl: newDesktop ?? existing.desktopImageUrl,
      tabletImageUrl: newTablet ?? existing.tabletImageUrl,
      mobileImageUrl: newMobile ?? existing.mobileImageUrl,
      isActive: values.isActive === "on",
    },
  });

  // Best-effort cleanup of any images that were just replaced.
  await Promise.all([
    newDesktop ? storage.remove(existing.desktopImageUrl) : Promise.resolve(),
    newTablet ? storage.remove(existing.tabletImageUrl) : Promise.resolve(),
    newMobile ? storage.remove(existing.mobileImageUrl) : Promise.resolve(),
  ]);

  revalidatePath("/admin/banners");
  revalidatePath("/");
  return {};
}

export async function deleteBanner(id: string): Promise<void> {
  await requireAdmin();
  const existing = await db.heroBanner.findUnique({ where: { id } });
  if (!existing) return;

  await db.heroBanner.delete({ where: { id } });
  await Promise.all([
    storage.remove(existing.desktopImageUrl),
    storage.remove(existing.tabletImageUrl),
    storage.remove(existing.mobileImageUrl),
  ]);

  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function toggleBannerActive(id: string, isActive: boolean): Promise<void> {
  await requireAdmin();
  await db.heroBanner.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function reorderBanners(orderedIds: string[]): Promise<void> {
  await requireAdmin();
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.heroBanner.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
  revalidatePath("/admin/banners");
  revalidatePath("/");
}
